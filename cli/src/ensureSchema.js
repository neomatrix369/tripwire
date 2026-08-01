import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getSupabase } from './supabaseClient.js';

const { Client } = pg;

export function schemaPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '../../db/schema.sql');
}

/** True when PostgREST/Postgres says the tripwire tables are missing. */
export function isMissingSchemaError(error) {
  if (!error) return false;
  const blob = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return /PGRST205|could not find the table|relation ["'].*["'] does not exist|schema cache/i.test(blob);
}

/**
 * Probe via HTTP API whether `items` is queryable.
 * @returns {'ready'|'missing'}
 */
export async function probeSchema(supabase = getSupabase()) {
  const { error } = await supabase.from('items').select('id').limit(1);
  if (!error) return 'ready';
  if (isMissingSchemaError(error)) return 'missing';
  throw new Error(`Supabase probe failed: ${error.message || error.code || 'unknown error'}`);
}

export async function applySchema({ dbUrl = process.env.SUPABASE_DB_URL } = {}) {
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
  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(sql);
  } catch (err) {
    const code = err && err.code;
    const hint =
      code === 'ENOTFOUND' || code === 'ECONNREFUSED'
        ? ' Check SUPABASE_DB_URL host (Project Settings → Database). Prefer the Session pooler URI if db.<ref>.supabase.co does not resolve, and confirm the project is not paused.'
        : '';
    throw new Error(`Failed to apply schema via SUPABASE_DB_URL: ${err.message}.${hint}`);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Ensure schema exists. Applies db/schema.sql when probe says missing.
 * @returns {{ status: 'ready'|'applied' }}
 */
export async function ensureSchema({ force = false, supabase = getSupabase() } = {}) {
  if (!force) {
    const state = await probeSchema(supabase);
    if (state === 'ready') return { status: 'ready' };
  }

  console.error('[tripwire] Applying db/schema.sql to Supabase…');
  await applySchema();

  const after = await probeSchema(supabase);
  if (after !== 'ready') {
    throw new Error(
      'Schema apply finished but `items` is still not queryable. Check SUPABASE_DB_URL points at the same project as SUPABASE_URL, and PostgREST schema cache has refreshed.'
    );
  }
  console.error('[tripwire] Schema ready.');
  return { status: 'applied' };
}
