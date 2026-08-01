#!/usr/bin/env node
/**
 * Mark orphan scan_runs stuck at status=running as failed, then roll up items.
 *
 * Cause: Modal worker crashed before scan_item could flip status (e.g. historical
 * ModuleNotFoundError: scanners). CLI catch path now marks failed + rollup; this
 * script cleans rows left behind.
 *
 * Usage (repo root):
 *   node scripts/reconcile-stuck-scan-runs.mjs
 *   node scripts/reconcile-stuck-scan-runs.mjs --dry-run
 *   node scripts/reconcile-stuck-scan-runs.mjs --all-stale --older-than-hours 2
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (never prints secrets).
 * Uses REST only (no npm deps beyond Node fetch).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(ROOT, '.env');

/** Known orphans from 2026-08-01 ModuleNotFoundError crashes (prefix match). */
const KNOWN_STUCK_RUN_PREFIXES = [
  'e247032b', // vuln-prompt-injection-notes / item 11c9741e-…
  '2178c7f6', // safe-csv-cleaner / item 8e6c8a51-…
];

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function parseArgs(argv) {
  let dryRun = false;
  let allStale = false;
  let olderThanHours = 2;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true;
    if (argv[i] === '--all-stale') allStale = true;
    if (argv[i] === '--older-than-hours' && argv[i + 1]) {
      olderThanHours = Number(argv[++i]);
    }
  }
  return { dryRun, allStale, olderThanHours };
}

function shortId(id) {
  return String(id).slice(0, 8);
}

function authHeaders(apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function main() {
  const { dryRun, allStale, olderThanHours } = parseArgs(process.argv.slice(2));
  const fileEnv = loadEnv(ENV_FILE);
  const url = (process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
    process.exit(1);
  }

  const listRes = await fetch(
    `${url}/rest/v1/scan_runs?status=eq.running&select=id,item_id,status,started_at&order=started_at.asc`,
    { headers: authHeaders(key) }
  );
  if (!listRes.ok) {
    console.error('error: list running scan_runs failed:', listRes.status, await listRes.text());
    process.exit(1);
  }
  const running = await listRes.json();

  const cutoff = Date.now() - olderThanHours * 3600 * 1000;
  const targets = running.filter((row) => {
    const prefixHit = KNOWN_STUCK_RUN_PREFIXES.some((p) => row.id.startsWith(p));
    if (prefixHit) return true;
    if (!allStale) return false;
    const started = row.started_at ? Date.parse(row.started_at) : 0;
    return started > 0 && started < cutoff;
  });

  if (targets.length === 0) {
    console.log(
      `No stuck running scan_runs matched (known prefixes` +
        (allStale ? ` or older than ${olderThanHours}h` : '') +
        ').'
    );
    console.log(`Total status=running rows: ${running.length}`);
    return;
  }

  console.log(`${dryRun ? '[dry-run] Would mark' : 'Marking'} ${targets.length} run(s) failed:`);
  for (const row of targets) {
    console.log(`  run ${shortId(row.id)}… item ${shortId(row.item_id)}… started ${row.started_at}`);
  }
  if (dryRun) return;

  const now = new Date().toISOString();
  const itemIds = new Set();
  for (const row of targets) {
    const upd = await fetch(
      `${url}/rest/v1/scan_runs?id=eq.${row.id}&status=eq.running`,
      {
        method: 'PATCH',
        headers: authHeaders(key),
        body: JSON.stringify({ status: 'failed', completed_at: now }),
      }
    );
    if (!upd.ok) {
      console.error(`  fail update ${shortId(row.id)}:`, upd.status, await upd.text());
      continue;
    }
    itemIds.add(row.item_id);
  }

  for (const itemId of itemIds) {
    const rpc = await fetch(`${url}/rest/v1/rpc/tripwire_rollup_item`, {
      method: 'POST',
      headers: authHeaders(key),
      body: JSON.stringify({ p_item_id: itemId }),
    });
    if (!rpc.ok) {
      console.error(`  fail rollup ${shortId(itemId)}:`, rpc.status, await rpc.text());
      continue;
    }
    console.log(`  rolled up item ${shortId(itemId)}…`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
