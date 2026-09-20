import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getSupabase } from './supabaseClient.js';

const { Client } = pg;

export function schemaPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '../../db/schema.sql');
}

/** True when PostgREST/Postgres says tables or columns are missing. */
export function isMissingSchemaError(error) {
  if (!error) return false;
  const blob = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return /PGRST20[45]|could not find the (table|.*column)|relation ["'].*["'] does not exist|schema cache/i.test(blob);
}

/**
 * Probe via HTTP API whether core tables and migration columns are queryable.
 * Checks both `items` (table existence) and `scan_run_scanners.completed_at`
 * (column-level migration), so `ensureSchema --force` is triggered when the
 * DB has stale columns.
 * @returns {'ready'|'missing'}
 */
export async function probeSchema(supabase = getSupabase()) {
  const { error: itemsErr } = await supabase.from('items').select('id').limit(1);
  if (itemsErr) {
    if (isMissingSchemaError(itemsErr)) return 'missing';
    throw new Error(`Supabase probe failed: ${itemsErr.message || itemsErr.code || 'unknown error'}`);
  }

  const { error: colErr } = await supabase
    .from('scan_run_scanners')
    .select('completed_at')
    .limit(1);
  if (colErr) {
    if (isMissingSchemaError(colErr)) return 'missing';
    throw new Error(`Supabase probe failed: ${colErr.message || colErr.code || 'unknown error'}`);
  }

  return 'ready';
}

function pgSslConfig(url) {
  return url.includes('localhost') || url.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false };
}

/** True when a Postgres CHECK definition already allows items.type = package. */
export function itemsTypeCheckAllowsPackage(def) {
  return /'package'/.test(String(def || ''));
}

/**
 * Apply schema when tables are missing or the live items.type CHECK is pre-package.
 * @param {boolean} force
 * @param {'ready'|'missing'} tableState
 * @param {'ready'|'stale'|'skipped'} typeState
 */
export function schemaNeedsApply(force, tableState, typeState) {
  if (force) return true;
  if (tableState !== 'ready') return true;
  return typeState === 'stale';
}

/**
 * Read live items_type_check. Skipped in the Node test runner and when DB URL is unset.
 * @returns {Promise<'ready'|'stale'|'skipped'>}
 */
export async function probeItemsTypeCheck({
  dbUrl = process.env.SUPABASE_DB_URL,
  ClientImpl = Client,
} = {}) {
  if (process.env.NODE_TEST_CONTEXT) return 'skipped';
  const url = (dbUrl || '').trim();
  if (!url || !/^postgres(ql)?:\/\//i.test(url)) return 'skipped';
  const client = new ClientImpl({
    connectionString: url, ssl: pgSslConfig(url), connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'public.items'::regclass AND conname = 'items_type_check'`
    );
    const def = rows[0]?.def || '';
    return itemsTypeCheckAllowsPackage(def) ? 'ready' : 'stale';
  } catch {
    return 'skipped';
  } finally {
    await client.end().catch(() => {});
  }
}

function pgConnectHint(code) {
  return code === 'ENOTFOUND' || code === 'ECONNREFUSED'
    ? ' Check SUPABASE_DB_URL host (Project Settings → Database). Prefer the Session pooler URI if db.<ref>.supabase.co does not resolve, and confirm the project is not paused.'
    : '';
}

export async function applySchema({
  dbUrl = process.env.SUPABASE_DB_URL,
  ClientImpl = Client,
} = {}) {
  const url = (dbUrl || '').trim();
  if (!url) {
    throw new Error(
      'Tripwire tables are missing. Set SUPABASE_DB_URL (postgresql://…) in .env, then run `tripwire setup` ' +
        '(or re-run scan — it auto-bootstraps). HTTP SUPABASE_URL alone cannot apply DDL.'
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error('SUPABASE_DB_URL must be a postgresql:// connection string.');
  }

  const sql = readFileSync(schemaPath(), 'utf8');
  const client = new ClientImpl({ connectionString: url, ssl: pgSslConfig(url) });
  try {
    await client.connect();
    await client.query(sql);
  } catch (err) {
    const hint = pgConnectHint(err && err.code);
    throw new Error(`Failed to apply schema via SUPABASE_DB_URL: ${err.message}.${hint}`, { cause: err });
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Ensure schema exists. Applies db/schema.sql when tables are missing or
 * items.type CHECK has not been widened to include `package`.
 * @returns {{ status: 'ready'|'applied' }}
 */
export async function ensureSchema({
  force = false,
  supabase = getSupabase(),
  applySchemaFn = applySchema,
  probeItemsTypeCheckFn = probeItemsTypeCheck,
} = {}) {
  const tableState = force ? 'missing' : await probeSchema(supabase);
  const typeState = force ? 'stale' : await probeItemsTypeCheckFn();
  if (!schemaNeedsApply(force, tableState, typeState)) return { status: 'ready' };

  console.error('[tripwire] Applying db/schema.sql to Supabase…');
  await applySchemaFn();

  const after = await probeSchema(supabase);
  if (after !== 'ready') {
    throw new Error(
      'Schema apply finished but `items` is still not queryable. Check SUPABASE_DB_URL points at the same project as SUPABASE_URL, and PostgREST schema cache has refreshed.'
    );
  }
  console.error('[tripwire] Schema ready.');
  return { status: 'applied' };
}
