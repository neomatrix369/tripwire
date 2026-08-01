/**
 * Tests for tripwire-live.js (Live Supabase path) and chip copy in Tripwire.dc.html.
 *
 * Author: swami
 * Created: 2026-08-01
 * Scope: Live config gating, Supabase table fetches, item shape mapping,
 *        clean error/empty sources (no "fallback" UI copy), optional live smoke
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = join(HERE, '..');
const LIVE_MODULE = join(DASHBOARD_ROOT, 'tripwire-live.js');
const HTML_PATH = join(DASHBOARD_ROOT, 'Tripwire.dc.html');
const CONFIG_PATH = join(DASHBOARD_ROOT, 'tripwire-dashboard.config.js');

const EXPECTED_TABLES = ['items', 'scan_runs', 'scan_run_scanners', 'findings'];
const ORIGINAL_FETCH = globalThis.fetch;

function installWindow(config) {
  globalThis.window = globalThis;
  if (config === undefined) {
    delete globalThis.__TRIPWIRE_CONFIG;
    return;
  }
  globalThis.__TRIPWIRE_CONFIG = config;
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function mockFetchByTable(tableBodies) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const match = String(url).match(/\/rest\/v1\/([^?]+)/);
    const table = match ? match[1] : '';
    if (!(table in tableBodies)) {
      return jsonResponse({ message: `unexpected table ${table}` }, 500);
    }
    const body = tableBodies[table];
    if (body && typeof body === 'object' && 'errorStatus' in body) {
      return jsonResponse({ message: 'denied' }, body.errorStatus);
    }
    return jsonResponse(body);
  };
  return calls;
}

async function importLoadDataFresh() {
  // Bust module cache so each test gets a clean import against current globals.
  const url = `${pathToFileURL(LIVE_MODULE).href}?t=${Date.now()}-${Math.random()}`;
  const mod = await import(url);
  return mod.default;
}

test('given no live config when loadData live then source is not-configured mock without fetch', async () => {
  // -- Given --
  installWindow(undefined);
  const calls = mockFetchByTable({});
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.source, 'mock', 'missing config must not pretend to be live');
  assert.ok(Array.isArray(result.data.items), 'demo items expected when not configured');
  assert.equal(calls.length, 0, 'must not call Supabase without anon config');
  assert.doesNotMatch(result.source, /fallback/i, 'source must not use fallback wording');
  restoreFetch();
});

test('given empty anon key when loadData live then source is mock and fetch is skipped', async () => {
  // -- Given --
  installWindow({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: '' });
  const calls = mockFetchByTable({});
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.source, 'mock');
  assert.equal(calls.length, 0);
  restoreFetch();
});

test('given live config when loadData live then fetches expected Supabase tables with anon headers', async () => {
  // -- Given --
  const base = 'https://proj.supabase.co';
  const anon = 'test-anon-key';
  installWindow({ SUPABASE_URL: base, SUPABASE_ANON_KEY: anon });
  const itemId = '11111111-1111-1111-1111-111111111111';
  const runId = '22222222-2222-2222-2222-222222222222';
  const calls = mockFetchByTable({
    items: [
      {
        id: itemId,
        type: 'skill',
        name: 'safe-csv-cleaner',
        identifier: 'fixtures/skills/safe-csv-cleaner',
        heatmap_status: 'green',
        risk_score: 0.1,
        quality_score: 0.9,
        install_locus: 'local',
        source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId,
        item_id: itemId,
        status: 'complete',
        started_at: '2026-08-01T10:00:00Z',
        completed_at: '2026-08-01T10:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId,
        scanner_source: 'snyk',
        status: 'completed',
        checks_run: 12,
      },
    ],
    findings: [
      {
        scan_run_id: runId,
        severity: 'amber',
        category: 'prompt_injection',
        file_path: 'SKILL.md',
        location: '12',
        entity_kind: null,
        entity_name: null,
        scanner_source: 'snyk',
        message: 'Suspicious instruction pattern',
        snippet: 'ignore previous',
        cwe_ids: ['CWE-74'],
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.source, 'live');
  assert.equal(result.data.items.length, 1);

  const tablesHit = calls.map((c) => {
    const m = c.url.match(/\/rest\/v1\/([^?]+)/);
    return m[1];
  }).sort();
  assert.deepEqual(tablesHit, [...EXPECTED_TABLES].sort(), 'must query the four dashboard tables');

  for (const call of calls) {
    assert.match(call.url, new RegExp(`^${base}/rest/v1/`));
    assert.equal(call.init.headers.apikey, anon);
    assert.equal(call.init.headers.Authorization, `Bearer ${anon}`);
  }

  const itemsCall = calls.find((c) => c.url.includes('/items?'));
  assert.match(itemsCall.url, /select=\*/);
  assert.match(itemsCall.url, /order=name\.asc/);

  const runsCall = calls.find((c) => c.url.includes('/scan_runs?'));
  assert.match(runsCall.url, /order=started_at\.desc/);
  assert.match(runsCall.url, /limit=200/);
  restoreFetch();
});

test('given successful supabase rows when loadData live then maps UI item shape', async () => {
  // -- Given --
  const itemId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const runId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId,
        type: 'mcp_server',
        name: 'weather-mcp',
        identifier: 'weather',
        heatmap_status: 'red',
        risk_score: 2.0,
        quality_score: null,
        install_locus: 'cloud',
        source_availability: 'cloneable',
      },
    ],
    scan_runs: [
      {
        id: runId,
        item_id: itemId,
        status: 'complete',
        started_at: '2026-08-01T12:00:00Z',
        completed_at: '2026-08-01T12:05:00Z',
      },
    ],
    scan_run_scanners: [
      { scan_run_id: runId, scanner_source: 'cisco', status: 'completed', checks_run: 3 },
    ],
    findings: [
      {
        scan_run_id: runId,
        severity: 'red',
        category: 'command_injection',
        file_path: null,
        location: null,
        entity_kind: 'tool',
        entity_name: 'run_shell',
        scanner_source: 'cisco',
        message: 'command injection surface',
        snippet: null,
        cwe_ids: null,
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const item = result.data.items[0];

  // -- Then --
  assert.equal(result.source, 'live');
  assert.equal(item.id, itemId);
  assert.equal(item.type, 'mcp_server');
  assert.equal(item.name, 'weather-mcp');
  assert.equal(item.identifier, 'weather');
  assert.equal(item.status, 'red');
  assert.equal(item.risk, 2.0);
  assert.equal(item.locus, 'cloud');
  assert.equal(item.avail, 'cloneable');
  assert.equal(item.lastScan, '2026-08-01T12:05:00Z');
  assert.equal(item.findings.length, 1);
  assert.equal(item.findings[0].severity, 'red');
  assert.equal(item.findings[0].scanner, 'cisco');
  assert.equal(item.findings[0].entity_name, 'run_shell');
  assert.equal(item.scanners.length, 1);
  assert.equal(item.scanners[0].source, 'cisco');
  assert.equal(item.scanners[0].checks_run, 3);
  assert.equal(item.sandbox.id, runId);
  assert.deepEqual(result.data.cliScenarios, {});
  assert.deepEqual(result.data.guardScenarios, []);
  restoreFetch();
});

test('given partial-failed run with heatmap risk when loadData live then keeps risk status not hard error', async () => {
  // -- Given --
  const itemId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const runId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId,
        type: 'skill',
        name: 'vuln-prompt-injection-notes',
        identifier: 'fixtures/skills/vuln-prompt-injection-notes',
        heatmap_status: 'red',
        risk_score: 2.1,
        quality_score: null,
        install_locus: 'local',
        source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId,
        item_id: itemId,
        status: 'partial-failed',
        started_at: '2026-08-01T14:00:00Z',
        completed_at: '2026-08-01T14:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId,
        scanner_source: 'Cisco Skill Scanner: static/bytecode/pipeline',
        status: 'completed',
        checks_run: 3,
      },
      {
        scan_run_id: runId,
        scanner_source: 'Tessl',
        status: 'unreachable',
        checks_run: 0,
        detail: 'Node.js version 18 is not supported',
      },
    ],
    findings: [
      {
        scan_run_id: runId,
        severity: 'red',
        category: 'prompt_injection',
        file_path: 'SKILL.md',
        location: '1',
        entity_kind: null,
        entity_name: null,
        scanner_source: 'Cisco Skill Scanner: static/bytecode/pipeline',
        message: 'prompt injection',
        snippet: null,
        cwe_ids: null,
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const item = result.data.items[0];

  // -- Then --
  assert.equal(result.source, 'live');
  assert.equal(item.status, 'red', 'rollup heatmap_status must win over partial-failed');
  assert.equal(item.risk, 2.1);
  assert.match(item.errorMessage || '', /unreachable/i);
  assert.notEqual(item.status, 'error');
  const tessl = item.scanners.find((s) => s.source === 'Tessl');
  assert.equal(tessl.status, 'unreachable');
  assert.match(tessl.detail || '', /Node\.js/);
  restoreFetch();
});

test('given zero items when loadData live then source is live-empty not mock', async () => {
  // -- Given --
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [],
    scan_runs: [],
    scan_run_scanners: [],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.source, 'live-empty', 'empty DB must stay on live path');
  assert.equal(result.data.items.length, 0);
  assert.doesNotMatch(String(result.source), /fallback/i);
  restoreFetch();
});

test('given supabase http error when loadData live then source is mock-failed without fallback wording', async () => {
  // -- Given --
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: { errorStatus: 401 },
    scan_runs: [],
    scan_run_scanners: [],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.source, 'mock-failed');
  assert.ok(result.data.items.length > 0, 'demo data used after connection error');
  assert.doesNotMatch(result.source, /fallback/i);
  restoreFetch();
});

test('given mock mode when loadData then source is mock-selected and fetch is unused', async () => {
  // -- Given --
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  const calls = mockFetchByTable({});
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('mock');

  // -- Then --
  assert.equal(result.source, 'mock-selected');
  assert.ok(result.data.items.length > 0);
  assert.equal(calls.length, 0);
  restoreFetch();
});

test('given dashboard html when inspecting chips then no fallback user-visible copy', () => {
  // -- Given --
  const html = readFileSync(HTML_PATH, 'utf8');
  const chipBlock = html.match(/const dataSourceChips = \{[\s\S]*?\n\s*\};/);
  assert.ok(chipBlock, 'dataSourceChips block must exist');

  // -- When --
  const block = chipBlock[0];

  // -- Then --
  assert.doesNotMatch(block, /fallback/i, 'chip labels/tooltips must not say fallback');
  assert.match(block, /label: 'Live · Supabase'/);
  assert.match(block, /label: 'Live · empty'/);
  assert.match(block, /label: 'Demo data'/);
  assert.match(block, /label: 'Missing API key'/);
  assert.match(block, /label: 'Connection error'/);
});

test(
  'optional smoke: given local live config when fetching items then supabase responds',
  { skip: !hasLiveConfigForSmoke() },
  async (t) => {
    // -- Given --
    restoreFetch();
    const cfg = readLiveConfigForSmoke();
    assert.ok(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY, 'smoke requires URL + anon key');

    // -- When --
    const url = `${cfg.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/items?select=id,type,name,heatmap_status&limit=5`;
    let res;
    try {
      res = await fetch(url, {
        headers: {
          apikey: cfg.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
        },
      });
    } catch (err) {
      t.skip(`network unavailable for Live smoke: ${err.message}`);
      return;
    }
    const body = await res.json().catch(() => null);

    // -- Then --
    assert.equal(res.ok, true, `anon SELECT items failed: HTTP ${res.status}`);
    assert.ok(Array.isArray(body), 'items response must be an array');
    console.info(`[live-smoke] items returned: ${body.length}`);
    if (body.length > 0) {
      const sample = body.slice(0, 3).map((r) => ({ type: r.type, heatmap: r.heatmap_status }));
      console.info('[live-smoke] sample types/heatmaps:', sample);
    }
  }
);

test('given running run with stale green heatmap when loadData live then status is running', async () => {
  // -- Given --
  const itemId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const runId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId,
        type: 'skill',
        name: 'in-flight',
        identifier: 'in-flight',
        heatmap_status: 'green',
        risk_score: 0.1,
        quality_score: null,
        install_locus: 'local',
        source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId,
        item_id: itemId,
        status: 'running',
        started_at: '2026-08-01T15:00:00Z',
        completed_at: null,
      },
    ],
    scan_run_scanners: [],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const item = result.data.items[0];

  // -- Then --
  assert.equal(item.status, 'running', 'collapsed card must show SCANNING over stale heatmap');
  assert.equal(item.lastScan, null);
  assert.equal(item.scanStartedAt, '2026-08-01T15:00:00Z');
  restoreFetch();
});

test('given error heatmap with red findings when loadData live then status is red', async () => {
  // -- Given --
  const itemId = '12121212-1212-1212-1212-121212121212';
  const runId = '34343434-3434-3434-3434-343434343434';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId,
        type: 'skill',
        name: 'messy-heatmap',
        identifier: 'messy-heatmap',
        heatmap_status: 'error',
        risk_score: null,
        quality_score: null,
        install_locus: 'local',
        source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId,
        item_id: itemId,
        status: 'partial-failed',
        started_at: '2026-08-01T16:00:00Z',
        completed_at: '2026-08-01T16:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId,
        scanner_source: 'Cisco',
        status: 'completed',
        checks_run: 3,
      },
    ],
    findings: [
      {
        scan_run_id: runId,
        severity: 'red',
        category: 'prompt_injection',
        file_path: 'SKILL.md',
        location: '1',
        entity_kind: null,
        entity_name: null,
        scanner_source: 'Cisco',
        message: 'prompt injection',
        snippet: null,
        cwe_ids: null,
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');

  // -- Then --
  assert.equal(result.data.items[0].status, 'red');
  restoreFetch();
});

function hasLiveConfigForSmoke() {
  if (!existsSync(CONFIG_PATH)) return false;
  const cfg = readLiveConfigForSmoke();
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY) return false;
  // Local proxy uses a placeholder token; unit suite must not depend on a running server.
  // Optional smoke is for direct browser→Supabase (real anon JWT in gitignored config).
  if (cfg.SUPABASE_ANON_KEY === 'local-dashboard-proxy') return false;
  if (/127\.0\.0\.1|localhost/.test(cfg.SUPABASE_URL)) return false;
  return true;
}

function readLiveConfigForSmoke() {
  if (!existsSync(CONFIG_PATH)) return null;
  const text = readFileSync(CONFIG_PATH, 'utf8');
  const url = text.match(/SUPABASE_URL:\s*"([^"]*)"/)?.[1] ?? '';
  const key = text.match(/SUPABASE_ANON_KEY:\s*"([^"]*)"/)?.[1] ?? '';
  return { SUPABASE_URL: url, SUPABASE_ANON_KEY: key };
}
