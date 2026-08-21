/**
 * tripwire status (slice 37 — CLI monitoring, read-only). All seams stubbed:
 * fake supabase records every builder method (read-only enforcement), fake fs
 * records any write attempt, log captured. Covers: happy-path four-section
 * report (literal stdout), stranded-running detection, --json single object,
 * enforcement preservation (select-family only, zero fs writes), invalid
 * --limit variants (throw with actionable text), missing config.json, missing
 * Supabase env (degraded local-only, resolves), and the two-switch
 * local-enable vs Supabase-monitoring disagreement warning.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runStatus } from '../src/statusCommand.js';

const HOME = '/home/op';
const CONFIG_PATH = `${HOME}/.tripwire/config.json`;
const SETTINGS_PATH = `${HOME}/.claude/settings.json`;
const NOW = () => new Date('2026-08-21T12:00:00.000Z');

const LOCAL_CONFIG = JSON.stringify({
  schema_version: 1, enable: true, scan_validity_days: 14, repo_root: '/repo',
});
const SETTINGS_WITH_HOOK = JSON.stringify({
  hooks: {
    PreToolUse: [{
      matcher: '^(Skill|Bash|mcp__.*)$',
      hooks: [{ type: 'command', command: `${HOME}/.tripwire/hooks/pre-tool-use.sh`, timeout: 10 }],
    }],
  },
});

const FIXTURES = {
  config: { monitoring_enabled: true, threshold: 'red' },
  items: [
    { heatmap_status: 'green' }, { heatmap_status: 'green' }, { heatmap_status: 'red' },
    { heatmap_status: 'amber' }, { heatmap_status: 'grey' },
  ],
  runs: [
    { id: 'r1', item_id: 'i1', status: 'complete', started_at: '2026-08-21T11:50:00.000Z', completed_at: '2026-08-21T11:51:00.000Z' },
    { id: 'r2', item_id: 'i2', status: 'complete', started_at: '2026-08-21T11:40:00.000Z', completed_at: '2026-08-21T11:41:00.000Z' },
    { id: 'r3', item_id: 'i1', status: 'failed', started_at: '2026-08-21T11:30:00.000Z', completed_at: null },
  ],
  itemNames: [{ id: 'i1', name: 'safe-skill' }, { id: 'i2', name: 'vuln-skill' }],
  scanners: [
    { scan_run_id: 'r1', scanner_source: 'snyk', status: 'completed' },
    { scan_run_id: 'r1', scanner_source: 'ossprey', status: 'skipped_missing_credential' },
    { scan_run_id: 'r2', scanner_source: 'snyk', status: 'failed' },
    { scan_run_id: 'r3', scanner_source: 'cisco', status: 'unreachable' },
  ],
};

/** Chainable thenable fake supabase; records {table, method} for every call. */
function makeFakeSupabase(fixtures) {
  const calls = [];
  // Head-count queries: items per-status counts + fleet-wide stranded runs.
  const resolveHeadCount = (state) => {
    if (state.table === 'items') {
      const eq = state.eqArgs.find(args => args[0] === 'heatmap_status');
      const status = eq ? eq[1] : null;
      const count = fixtures.items.filter(r => r.heatmap_status === status).length;
      return { data: null, count, error: null };
    }
    if (state.table === 'scan_runs') {
      return { data: null, count: fixtures.strandedTotal ?? 0, error: null };
    }
    return { data: null, count: 0, error: null };
  };
  const resolveData = (state) => {
    if (state.headCount) return resolveHeadCount(state);
    if (state.table === 'config') return { data: fixtures.config, error: null };
    if (state.table === 'items') {
      return state.methods.includes('in')
        ? { data: fixtures.itemNames, error: null }
        : { data: fixtures.items, error: null };
    }
    if (state.table === 'scan_runs') return { data: fixtures.runs, error: null };
    if (state.table === 'scan_run_scanners') return { data: fixtures.scanners, error: null };
    return { data: null, error: null };
  };
  const supabase = {
    calls,
    from(table) {
      calls.push({ table, method: 'from' });
      const state = { table, methods: [], eqArgs: [], headCount: false };
      const builder = {
        then(onFulfilled, onRejected) {
          return Promise.resolve(resolveData(state)).then(onFulfilled, onRejected);
        },
      };
      for (const method of ['select', 'eq', 'order', 'limit', 'in', 'lt', 'maybeSingle',
        'insert', 'update', 'upsert', 'delete']) {
        builder[method] = (...args) => {
          calls.push({ table, method, args });
          state.methods.push(method);
          if (method === 'select' && args[1] && args[1].head) state.headCount = true;
          if (method === 'eq') state.eqArgs.push(args);
          return builder;
        };
      }
      return builder;
    },
    rpc(...args) {
      calls.push({ table: null, method: 'rpc', args });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return supabase;
}

/** Read-only in-memory fs; any write attempt is recorded in fs.writes. */
function makeFakeFs(files) {
  const writes = [];
  return {
    writes,
    existsSync: (p) => Object.prototype.hasOwnProperty.call(files, p),
    readFileSync: (p) => {
      if (!Object.prototype.hasOwnProperty.call(files, p)) {
        const err = new Error(`ENOENT: no such file, open '${p}'`);
        err.code = 'ENOENT';
        throw err;
      }
      return files[p];
    },
    writeFileSync: (...args) => { writes.push(['writeFileSync', ...args]); },
    mkdirSync: (...args) => { writes.push(['mkdirSync', ...args]); },
    copyFileSync: (...args) => { writes.push(['copyFileSync', ...args]); },
    renameSync: (...args) => { writes.push(['renameSync', ...args]); },
    rmSync: (...args) => { writes.push(['rmSync', ...args]); },
    chmodSync: (...args) => { writes.push(['chmodSync', ...args]); },
    cpSync: (...args) => { writes.push(['cpSync', ...args]); },
  };
}

function installedFiles() {
  return { [CONFIG_PATH]: LOCAL_CONFIG, [SETTINGS_PATH]: SETTINGS_WITH_HOOK };
}

/** Run with captured log lines; returns { payload, lines, supabase, fs }. */
async function run(overrides = {}) {
  const lines = [];
  const supabase = overrides.supabase ?? makeFakeSupabase(FIXTURES);
  const fs = overrides.fs ?? makeFakeFs(installedFiles());
  const payload = await runStatus({
    supabase,
    fs,
    homedir: HOME,
    now: NOW,
    log: (msg) => lines.push(String(msg)),
    ...overrides, // may carry supabase: null to force the getClient (env) path
  });
  return { payload, lines, supabase, fs };
}

test('happy path prints all four sections with literal stdout', async () => {
  const { lines, payload } = await run();
  assert.deepEqual(lines, [
    '[status] Tripwire monitoring (read-only)',
    '',
    'Hooks',
    `  Config:     ${CONFIG_PATH} — enable=true, scan_validity_days=14, repo_root=/repo`,
    `  PreToolUse: registered in ${SETTINGS_PATH}`,
    '  Supabase:   monitoring_enabled=true, threshold=red',
    '',
    'Items (heatmap_status)',
    '  red=1 amber=1 green=2 grey=1 error=0 (total 5)',
    '',
    'Recent scan runs (last 20 requested, 3 found)',
    '  complete=2 failed=1',
    '  2026-08-21T11:50:00.000Z  complete  safe-skill',
    '  2026-08-21T11:40:00.000Z  complete  vuln-skill',
    '  2026-08-21T11:30:00.000Z  failed  safe-skill',
    '',
    'Scanners (latest status per source across those runs)',
    '  cisco: unreachable',
    '  ossprey: skipped_missing_credential',
    '  snyk: completed',
    '  unreachable=1 skipped_missing_credential=1',
  ]);
  assert.equal(payload.hooks.two_switch_disagreement, false);
  assert.equal(payload.scanners.latest.snyk, 'completed'); // r1 (newest) wins over r2 failed
});

test('stranded running runs older than 30 minutes are called out with the remedy', async () => {
  const supabase = makeFakeSupabase({
    ...FIXTURES,
    runs: [
      { id: 'r1', item_id: 'i1', status: 'running', started_at: '2026-08-21T11:55:00.000Z' }, // 5 min — fine
      { id: 'r2', item_id: 'i2', status: 'running', started_at: '2026-08-21T11:15:00.000Z' }, // 45 min — stranded
    ],
    scanners: [],
  });
  const { lines, payload } = await run({ supabase });
  assert.equal(payload.runs.stranded.count, 1);
  assert.equal(payload.runs.stranded.remedy, 'node scripts/reconcile-stuck-scan-runs.mjs');
  assert.ok(lines.some(l => l.includes(
    'STRANDED: 1 running run(s) older than 30 minutes (likely Modal timeout) — remedy: node scripts/reconcile-stuck-scan-runs.mjs'
  )));
});

test('--json prints exactly one machine-readable object carrying the same counts', async () => {
  const { lines } = await run({ json: true });
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(parsed), ['hooks', 'items', 'runs', 'scanners', 'supabase']);
  assert.deepEqual(parsed.items.counts, { red: 1, amber: 1, green: 2, grey: 1, error: 0 });
  assert.equal(parsed.items.total, 5);
  assert.deepEqual(parsed.runs.counts, { complete: 2, failed: 1 });
  assert.equal(parsed.runs.stranded.count, 0);
  assert.deepEqual(parsed.scanners.latest, {
    snyk: 'completed', ossprey: 'skipped_missing_credential', cisco: 'unreachable',
  });
  assert.equal(parsed.scanners.skipped_missing_credential, 1);
  assert.equal(parsed.hooks.enable, true);
  assert.equal(parsed.hooks.supabase_monitoring_enabled, true);
  assert.equal(parsed.supabase.reachable, true);
});

test('enforcement preservation: select-family reads only, zero writes anywhere', async () => {
  const { supabase, fs } = await run({ json: true });
  const allowed = new Set(['from', 'select', 'eq', 'order', 'limit', 'in', 'lt', 'maybeSingle']);
  const forbidden = new Set(['insert', 'update', 'upsert', 'delete', 'rpc']);
  assert.ok(supabase.calls.length > 0);
  for (const call of supabase.calls) {
    assert.ok(allowed.has(call.method), `unexpected supabase method: ${call.method}`);
    assert.ok(!forbidden.has(call.method), `mutating supabase method called: ${call.method}`);
  }
  assert.deepEqual(fs.writes, []); // GWT 2: monitoring never touches local files
});

test('invalid --limit variants throw with actionable guidance', async () => {
  for (const bad of ['notanumber', '-5', '0', '201', '2.5', '']) {
    await assert.rejects(
      run({ limit: bad }),
      /--limit must be an integer between 1 and 200 .*tripwire status --limit 50/,
      `expected rejection for --limit ${JSON.stringify(bad)}`
    );
  }
});

test('missing config.json reports not installed with the setup remedy', async () => {
  const fs = makeFakeFs({}); // neither config.json nor settings.json
  const { lines, payload } = await run({ fs });
  assert.ok(lines.includes(
    `  Config:     not installed (${CONFIG_PATH} missing) — run tripwire setup-agent-hooks`
  ));
  assert.ok(lines.includes(
    `  PreToolUse: not registered at user level (${SETTINGS_PATH}) — a project-scope .claude/settings.json may still register it; run tripwire setup-agent-hooks`
  ));
  assert.equal(payload.hooks.installed, false);
});

test('missing Supabase env degrades to local-only output and still resolves', async () => {
  const { lines, payload } = await run({
    supabase: null,
    getClient: () => { throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. See README.md Setup.'); },
  });
  assert.ok(lines.includes(`  Config:     ${CONFIG_PATH} — enable=true, scan_validity_days=14, repo_root=/repo`));
  assert.ok(lines.some(l => l.startsWith(
    'Supabase unreachable — set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (see .env.example).'
  )));
  assert.ok(lines.includes('Showing local hooks state only.'));
  assert.equal(payload.supabase.reachable, false);
  assert.equal(payload.items, null);
  assert.equal(payload.runs, null);
  assert.equal(payload.scanners, null);
});

test('local enable vs Supabase monitoring_enabled disagreement prints the two-switch warning', async () => {
  const supabase = makeFakeSupabase({
    ...FIXTURES,
    config: { monitoring_enabled: false, threshold: 'red' },
  });
  const { lines, payload } = await run({ supabase });
  assert.ok(lines.includes(
    '  WARNING: two-switch disagreement — local enable=true, Supabase monitoring_enabled=false; effective enforcement is their AND, so the guard is currently NOT blocking.'
  ));
  assert.equal(payload.hooks.two_switch_disagreement, true);
});

test('stranded runs beyond the recent-runs page are still counted (fleet-wide head count)', async () => {
  // Regression: a stranded 'running' row older than the newest --limit runs
  // must be surfaced even though it never appears in the fetched page.
  const supabase = makeFakeSupabase({ ...FIXTURES, strandedTotal: 3 });
  const { lines } = await run({ supabase, json: true });
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.runs.stranded.count, 3);
  assert.match(parsed.runs.stranded.remedy, /reconcile-stuck-scan-runs/);
});
