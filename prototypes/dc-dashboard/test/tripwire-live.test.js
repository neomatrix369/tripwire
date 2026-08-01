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
  assert.equal(
    item.errorMessage,
    '1 out of 2 scanners unreachable — risk from completed engines',
  );
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
  assert.equal(item.scanners.length, 0,
    'no scan_run_scanners rows yet — dashboard must show placeholder');
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

test('given completed scanner with detail when loadData live then output.raw_summary from detail', async () => {
  // -- Given --
  const itemId = '55555555-5555-5555-5555-555555555555';
  const runId = '66666666-6666-6666-6666-666666666666';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'skill', name: 'has-detail',
        identifier: 'has-detail', heatmap_status: 'green',
        risk_score: 0.1, quality_score: null,
        install_locus: 'local', source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'complete',
        started_at: '2026-08-01T10:00:00Z', completed_at: '2026-08-01T10:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId, scanner_source: 'Snyk',
        status: 'completed', checks_run: 18,
        detail: '18 checks passed — no findings',
      },
    ],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const scanner = result.data.items[0].scanners[0];

  // -- Then --
  assert.equal(scanner.output.raw_summary, '18 checks passed — no findings',
    'completed scanner with detail must surface it as raw_summary');
  restoreFetch();
});

test('given completed scanner without detail when loadData live then synthesizes raw_summary from findings', async () => {
  // -- Given --
  const itemId = '77777777-7777-7777-7777-777777777777';
  const runId = '88888888-8888-8888-8888-888888888888';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'mcp_server', name: 'no-detail-server',
        identifier: 'no-detail-server', heatmap_status: 'red',
        risk_score: 2.0, quality_score: null,
        install_locus: 'local', source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'complete',
        started_at: '2026-08-01T11:00:00Z', completed_at: '2026-08-01T11:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId, scanner_source: 'Cisco MCP Scanner: YARA',
        status: 'completed', checks_run: 24,
      },
    ],
    findings: [
      {
        scan_run_id: runId, severity: 'red', category: 'hardcoded_secrets',
        file_path: 'config.py', location: '8',
        entity_kind: null, entity_name: null,
        scanner_source: 'Cisco MCP Scanner: YARA',
        message: 'Hardcoded API key literal found in source.',
        snippet: null, cwe_ids: null,
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const scanner = result.data.items[0].scanners[0];

  // -- Then --
  assert.match(scanner.output.raw_summary, /24 checks/,
    'synthesized summary must include checks_run');
  assert.match(scanner.output.raw_summary, /1 finding/,
    'synthesized summary must include finding count');
  assert.match(scanner.output.raw_summary, /red/,
    'synthesized summary must include severity');
  assert.match(scanner.output.raw_summary, /Hardcoded API key/,
    'synthesized summary must include finding brief');
  restoreFetch();
});

test('given completed scanner without detail and no findings when loadData live then synthesizes clean pass summary', async () => {
  // -- Given --
  const itemId = '99999999-9999-9999-9999-999999999999';
  const runId = 'aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'skill', name: 'clean-skill',
        identifier: 'clean-skill', heatmap_status: 'green',
        risk_score: 0.0, quality_score: 95,
        install_locus: 'local', source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'complete',
        started_at: '2026-08-01T12:00:00Z', completed_at: '2026-08-01T12:01:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId, scanner_source: 'Cisco Skill Scanner: static/bytecode/pipeline',
        status: 'completed', checks_run: 34,
      },
      {
        scan_run_id: runId, scanner_source: 'Tessl',
        status: 'completed', checks_run: 1,
      },
    ],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const scanners = result.data.items[0].scanners;

  // -- Then --
  assert.equal(scanners[0].output.raw_summary, '34 checks passed — no findings',
    'completed scanner with no findings must show clean pass summary');
  assert.equal(scanners[1].output.quality_score, 95,
    'Tessl scanner must include quality_score');
  assert.equal(scanners[1].output.raw_summary, '1 checks passed — no findings',
    'Tessl scanner without detail must still get synthesized summary');
  restoreFetch();
});

test('given running scanner with console_output when loadData live then output.console_output relayed', async () => {
  // -- Given --
  const itemId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  const runId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'skill', name: 'scanning-skill',
        identifier: 'scanning-skill', heatmap_status: 'green',
        risk_score: 0.1, quality_score: null,
        install_locus: 'local', source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'running',
        started_at: '2026-08-01T17:00:00Z', completed_at: null,
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId,
        scanner_source: 'Cisco Skill Scanner: static/bytecode/pipeline',
        status: 'completed', checks_run: 5,
        detail: '5 checks passed — no findings',
        console_output: '{"findings": [], "findings_count": 5}\nScan completed successfully.',
        started_at: '2026-08-01T17:00:01Z',
        completed_at: '2026-08-01T17:00:15Z',
      },
      {
        scan_run_id: runId,
        scanner_source: 'Snyk',
        status: 'running', checks_run: null,
        detail: null,
        console_output: null,
        started_at: '2026-08-01T17:00:15Z',
        completed_at: null,
      },
    ],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const item = result.data.items[0];

  // -- Then --
  assert.equal(item.status, 'running', 'item must show SCANNING while run is in flight');

  const cisco = item.scanners.find(
    (s) => s.source === 'Cisco Skill Scanner: static/bytecode/pipeline'
  );
  assert.equal(cisco.status, 'completed', 'completed scanner must keep completed status');
  assert.equal(cisco.output.raw_summary, '5 checks passed — no findings',
    'completed scanner detail relayed as raw_summary');
  assert.equal(cisco.output.console_output,
    '{"findings": [], "findings_count": 5}\nScan completed successfully.',
    'console_output from Modal must be relayed into output.console_output');
  assert.equal(cisco.output.duration_ms, 14000,
    'duration_ms must be computed from started_at/completed_at');
  assert.equal(cisco.started_at, '2026-08-01T17:00:01Z',
    'started_at from scan_run_scanners must be surfaced');
  assert.equal(cisco.completed_at, '2026-08-01T17:00:15Z',
    'completed_at from scan_run_scanners must be surfaced');

  const snyk = item.scanners.find((s) => s.source === 'Snyk');
  assert.equal(snyk.status, 'running', 'in-flight scanner must stay running');
  assert.equal(snyk.output.console_output, undefined,
    'null console_output must not create output.console_output');
  assert.equal(snyk.output.duration_ms, undefined,
    'running scanner without completed_at must not have duration');
  restoreFetch();
});

test('given completed scanner with console_output when loadData live then console text in output', async () => {
  // -- Given --
  const itemId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
  const runId = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';
  const consoleText = [
    '=== Snyk Agent Scan ===',
    'Scanning /tmp/scan-target...',
    'Found 2 issues in 1 file',
    'E004: Prompt injection in SKILL.md:12',
    'W008: Hardcoded secret in config.py:3',
  ].join('\n');
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'skill', name: 'scanned-skill',
        identifier: 'scanned-skill', heatmap_status: 'red',
        risk_score: 2.0, quality_score: null,
        install_locus: 'local', source_availability: 'source_on_disk',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'complete',
        started_at: '2026-08-01T16:00:00Z', completed_at: '2026-08-01T16:02:00Z',
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId, scanner_source: 'Snyk',
        status: 'completed', checks_run: 2,
        detail: '2 checks — 2 findings (red): Prompt injection in SKILL.md:12',
        console_output: consoleText,
        started_at: '2026-08-01T16:01:00Z',
        completed_at: '2026-08-01T16:01:45Z',
      },
    ],
    findings: [
      {
        scan_run_id: runId, severity: 'red', category: 'prompt_injection',
        file_path: 'SKILL.md', location: '12',
        entity_kind: null, entity_name: null,
        scanner_source: 'Snyk',
        message: 'Prompt injection in SKILL.md:12',
        snippet: null, cwe_ids: null,
      },
    ],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const scanner = result.data.items[0].scanners[0];

  // -- Then --
  assert.equal(scanner.output.console_output, consoleText,
    'Modal console output must be passed through faithfully');
  assert.match(scanner.output.raw_summary, /2 checks/,
    'detail must still surface as raw_summary');
  assert.equal(scanner.output.duration_ms, 45000,
    'duration computed from scanner started_at to completed_at');
  restoreFetch();
});

test('given running scanner with detail when loadData live then detail maps to raw_summary', async () => {
  // -- Given --
  const itemId = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';
  const runId = 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6';
  installWindow({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
  });
  mockFetchByTable({
    items: [
      {
        id: itemId, type: 'mcp_server', name: 'mid-scan-server',
        identifier: 'mid-scan-server', heatmap_status: 'grey',
        risk_score: null, quality_score: null,
        install_locus: 'cloud', source_availability: 'cloneable',
      },
    ],
    scan_runs: [
      {
        id: runId, item_id: itemId, status: 'running',
        started_at: '2026-08-01T17:30:00Z', completed_at: null,
      },
    ],
    scan_run_scanners: [
      {
        scan_run_id: runId,
        scanner_source: 'Cisco MCP Scanner: YARA',
        status: 'running', checks_run: null,
        detail: 'Starting Cisco MCP Scanner: YARA…',
        console_output: null,
        started_at: '2026-08-01T17:30:01Z',
        completed_at: null,
      },
    ],
    findings: [],
  });
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('live');
  const scanner = result.data.items[0].scanners[0];

  // -- Then --
  assert.equal(scanner.status, 'running',
    'running scanner status must be preserved');
  assert.equal(scanner.output.raw_summary, 'Starting Cisco MCP Scanner: YARA…',
    'running scanner detail must map to raw_summary (not reason)');
  assert.equal(scanner.output.reason, undefined,
    'running scanner detail must not map to reason');
  restoreFetch();
});

test('given mock mode running item when loadData mock then scanners array has running entries', async () => {
  // -- Given --
  installWindow(undefined);
  const loadData = await importLoadDataFresh();

  // -- When --
  const result = await loadData('mock');
  const running = result.data.items.find((i) => i.status === 'running');

  // -- Then --
  assert.ok(running, 'mock data must include a running item');
  assert.ok(running.scanners.length > 0,
    'mock running item must have scanner rows so the drawer shows progress');
  const completed = running.scanners.filter((s) => s.status === 'completed');
  const stillRunning = running.scanners.filter((s) => s.status === 'running');
  assert.ok(completed.length >= 1,
    'mock running item must have at least one completed scanner');
  assert.ok(stillRunning.length >= 1,
    'mock running item must have at least one running scanner');
  restoreFetch();
});

// ── Realtime integration tests ─────────────────────────────────────────────

const REALTIME_MODULE = join(DASHBOARD_ROOT, 'tripwire-realtime.js');

test('given tripwire-realtime module exists then it exports subscribe unsubscribe connected', async () => {
  // -- Given --
  assert.ok(existsSync(REALTIME_MODULE), 'tripwire-realtime.js must exist');

  // -- When --
  const source = readFileSync(REALTIME_MODULE, 'utf8');

  // -- Then --
  assert.match(source, /export\s+(async\s+)?function\s+subscribe/,
    'must export a subscribe function');
  assert.match(source, /export\s+function\s+unsubscribe/,
    'must export an unsubscribe function');
  assert.match(source, /export\s+function\s+connected/,
    'must export a connected function');
});

test('given realtime module when no config then subscribe returns null', async () => {
  // -- Given --
  const url = `${pathToFileURL(REALTIME_MODULE).href}?t=${Date.now()}-${Math.random()}`;
  const rt = await import(url);

  // -- When --
  const result = await rt.subscribe(null, () => {});

  // -- Then --
  assert.equal(result, null, 'subscribe must return null when config is missing');
});

test('given realtime module when empty anon key then subscribe returns null', async () => {
  // -- Given --
  const url = `${pathToFileURL(REALTIME_MODULE).href}?t=${Date.now()}-${Math.random()}`;
  const rt = await import(url);

  // -- When --
  const result = await rt.subscribe(
    { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: '' },
    () => {},
  );

  // -- Then --
  assert.equal(result, null, 'subscribe must return null for empty anon key');
});

test('given dashboard html when inspecting chip labels then live-realtime chip exists', () => {
  // -- Given --
  const html = readFileSync(HTML_PATH, 'utf8');
  const chipBlock = html.match(/const dataSourceChips = \{[\s\S]*?\n\s*\};/);
  assert.ok(chipBlock, 'dataSourceChips block must exist');

  // -- When --
  const block = chipBlock[0];

  // -- Then --
  assert.match(block, /live-realtime/,
    'chip map must have a live-realtime entry');
  assert.match(block, /Live · Realtime/,
    'realtime chip label must say Live · Realtime');
});

test('given dashboard html when inspecting state then realtimeConnected initialised false', () => {
  // -- Given --
  const html = readFileSync(HTML_PATH, 'utf8');

  // -- When / Then --
  assert.match(html, /realtimeConnected:\s*false/,
    'state must initialise realtimeConnected to false');
});

test('given dashboard html when inspecting chip logic then realtimeConnected drives chip key', () => {
  // -- Given --
  const html = readFileSync(HTML_PATH, 'utf8');

  // -- When / Then --
  assert.match(html, /s\.realtimeConnected\s*&&\s*s\.dataSource\s*===\s*'live'/,
    'chip key must check realtimeConnected && live source');
  assert.match(html, /'live-realtime'/,
    'chipKey expression must reference live-realtime');
});

test('given schema sql when inspecting realtime then publication adds required tables', () => {
  // -- Given --
  const schemaPath = join(DASHBOARD_ROOT, '..', '..', 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  // -- When / Then --
  assert.match(sql, /supabase_realtime\s+add\s+table\s+scan_runs/i,
    'schema must add scan_runs to supabase_realtime publication');
  assert.match(sql, /supabase_realtime\s+add\s+table\s+scan_run_scanners/i,
    'schema must add scan_run_scanners to supabase_realtime publication');
  assert.match(sql, /supabase_realtime\s+add\s+table\s+findings/i,
    'schema must add findings to supabase_realtime publication');
});

// ── Smoke / live helpers ──────────────────────────────────────────────────

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
