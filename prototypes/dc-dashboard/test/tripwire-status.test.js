/**
 * Tests for tripwire-status.js (heatmap / severity / execution color SSOT).

 * Author: swami
 * Created: 2026-08-01
 * Scope: statusFromRisk density fallback, resolveItemStatus priority (worst-of),
 *   severity normalize, finding-count chip labels; slice-42 A9–A13 quality/risk
 *   tooltips and operator labels; slice-48 Tessl Not Available Yet sentinels
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  statusFromRisk,
  resolveItemStatus,
  normalizeSeverity,
  maxFindingStatus,
  countActionableFindings,
  formatFindingCountLabel,
  severityColor,
  scannerExecMeta,
  STATUS_META,
  qualitySurfacing,
  qualityTooltip,
  riskTooltip,
  formatRiskDensityLabel,
  formatRiskBadge,
  operatorLocusLabel,
  operatorAvailLabel,
  tesslInnerQuality,
  TESSL_CAPABILITY_SOURCES,
  mergeTesslCapabilityRows,
  securityQualityLink,
  linkedQualityFindingsForSecurity,
  QUALITY_TAB_FLOOR,
  isSkillItem,
  qualityTabBucket,
  matchesQualityTab,
  filterItemsByQualityTab,
  countSkillsByQualityTab,
} from '../tripwire-status.js';

const HTML_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'Tripwire.dc.html');

test('given risk scores when statusFromRisk then matches density buckets', () => {
  // -- Given / When / Then --
  assert.equal(statusFromRisk(null), 'grey');
  assert.equal(statusFromRisk(0), 'green');
  assert.equal(statusFromRisk(0.49), 'green');
  assert.equal(statusFromRisk(0.5), 'amber');
  assert.equal(statusFromRisk(1.49), 'amber');
  assert.equal(statusFromRisk(1.5), 'red');
});

test('given running scan when resolveItemStatus then running wins over stale heatmap', () => {
  // -- Given --
  const input = {
    runStatus: 'running',
    heatmapStatus: 'error',
    riskScore: 2.1,
    findings: [{ severity: 'red' }],
  };

  // -- When --
  const actual = resolveItemStatus(input);

  // -- Then --
  assert.equal(actual, 'running', 'in-flight scans must paint SCANNING, not stale ERROR/RED');
});

test('given failed scan when resolveItemStatus then error', () => {
  assert.equal(
    resolveItemStatus({ runStatus: 'failed', heatmapStatus: 'green', riskScore: 0 }),
    'error'
  );
});

test('given partial-failed with red heatmap when resolveItemStatus then red not error', () => {
  assert.equal(
    resolveItemStatus({
      runStatus: 'partial-failed',
      heatmapStatus: 'red',
      riskScore: 2.1,
      findings: [{ severity: 'red' }],
    }),
    'red'
  );
});

test('given stale error heatmap with red findings when resolveItemStatus then red', () => {
  // -- Given -- messy live rows: heatmap stuck error but findings present
  const actual = resolveItemStatus({
    runStatus: 'partial-failed',
    heatmapStatus: 'error',
    riskScore: null,
    findings: [{ severity: 'red' }, { severity: 'green' }],
  });

  // -- Then --
  assert.equal(actual, 'red');
});

test('given stale amber heatmap and one red finding when resolveItemStatus then red', () => {
  // -- Given -- density-era heatmap would stay amber; worst-of must paint red
  const actual = resolveItemStatus({
    runStatus: 'complete',
    heatmapStatus: 'amber',
    riskScore: 0.04,
    findings: [{ severity: 'red', scanner: 'Snyk' }, { severity: 'green', scanner: 'Cisco' }],
  });

  // -- Then --
  assert.equal(actual, 'red', 'one red finding must paint the card red regardless of density');
});

test('given amber findings only when resolveItemStatus then amber not red', () => {
  assert.equal(
    resolveItemStatus({
      runStatus: 'complete',
      heatmapStatus: 'green',
      riskScore: 0.1,
      findings: [{ severity: 'amber' }],
    }),
    'amber'
  );
});

test('given complete green risk when resolveItemStatus then green', () => {
  assert.equal(
    resolveItemStatus({
      runStatus: 'complete',
      heatmapStatus: 'green',
      riskScore: 0.1,
      findings: [],
    }),
    'green'
  );
});

test('given no run when resolveItemStatus then grey', () => {
  assert.equal(resolveItemStatus({ runStatus: null, heatmapStatus: 'grey' }), 'grey');
  assert.equal(resolveItemStatus({}), 'grey');
});

test('given upstream severities when normalizeSeverity then collapse correctly', () => {
  assert.equal(normalizeSeverity('CRITICAL'), 'red');
  assert.equal(normalizeSeverity('HIGH'), 'red');
  assert.equal(normalizeSeverity('MEDIUM'), 'amber');
  assert.equal(normalizeSeverity('LOW'), 'amber');
  assert.equal(normalizeSeverity('INFO'), 'green');
  assert.equal(normalizeSeverity('red'), 'red');
  assert.equal(normalizeSeverity('SAFE'), null);
});

test('given findings when maxFindingStatus then ignores green soft findings', () => {
  assert.equal(maxFindingStatus([{ severity: 'green' }]), null);
  assert.equal(maxFindingStatus([{ severity: 'green' }, { severity: 'amber' }]), 'amber');
  assert.equal(maxFindingStatus([{ severity: 'amber' }, { severity: 'red' }]), 'red');
});

test('given tiered_router amber when maxFindingStatus then ignores router rows', () => {
  assert.equal(
    maxFindingStatus([
      { severity: 'amber', scanner: 'tiered_router' },
      { severity: 'green', scanner: 'Snyk' },
    ]),
    null
  );
});

test('given mixed findings when formatFindingCountLabel then severity breakdown', () => {
  assert.equal(formatFindingCountLabel([]), '');
  assert.equal(formatFindingCountLabel([{ severity: 'red' }]), '1 finding');
  assert.equal(
    formatFindingCountLabel([{ severity: 'red' }, { severity: 'red' }]),
    '2 findings'
  );
  assert.equal(
    formatFindingCountLabel([
      { severity: 'red' },
      { severity: 'amber' },
      { severity: 'amber', scanner: 'tiered_router' },
    ]),
    '1● 1▲'
  );
  assert.deepEqual(countActionableFindings([{ severity: 'red' }, { severity: 'green' }]), {
    red: 1,
    amber: 0,
    total: 1,
  });
});

test('given scanner unreachable when scannerExecMeta then uses error violet not vuln red', () => {
  const meta = scannerExecMeta('unreachable');
  assert.equal(meta.color, STATUS_META.error.color);
  assert.notEqual(meta.color, STATUS_META.red.color);
  assert.equal(severityColor('red'), STATUS_META.red.color);
  assert.equal(severityColor('LOW'), STATUS_META.amber.color);
});

test('given scanner running when scannerExecMeta then uses scanning blue', () => {
  // -- Given / When --
  const meta = scannerExecMeta('running');

  // -- Then --
  assert.equal(meta.color, STATUS_META.running.color,
    'running scanner must use SCANNING ink color');
  assert.match(meta.label, /Running/i,
    'running scanner label must say Running');
});

// ── GWT-42.6 / 42.9 — Tessl quality surfacing ─────────────────────────────

test('given skill with numeric quality when qualitySurfacing then Q badge known', () => {
  /**
   * Scenario: GWT-42.6 known Tessl quality on skill card.
   * Slice: 42 A9
   *
   * Given a skill with quality 92,
   * When qualitySurfacing runs,
   * Then badge is Q 92 with known tone and Tessl tooltip.
   */
  // -- Given --
  const item = {
    type: 'skill',
    quality: 92,
    lastScan: '2026-08-19T10:00:00Z',
    status: 'green',
    identifier: 'amber-skill',
  };

  // -- When --
  const actual = qualitySurfacing(item);

  // -- Then --
  assert.equal(actual.badge, 'Q 92');
  assert.equal(actual.tone, 'known');
  assert.equal(actual.scheduleCue, null);
  assert.match(actual.tooltip, /Tessl/);
  assert.match(actual.tooltip, /0–100|0-100/);
});

test('given never-scanned skill when qualitySurfacing then Q em dash', () => {
  // -- Given / When --
  const actual = qualitySurfacing({
    type: 'skill',
    quality: null,
    lastScan: null,
    status: 'grey',
    identifier: 'new-skill',
  });

  // -- Then --
  assert.equal(actual.badge, 'Q —');
  assert.equal(actual.tone, 'unknown-unscanned');
  assert.match(actual.scheduleCue, /tripwire scan new-skill --force/);
  assert.match(actual.tooltip, /never scanned/i);
});

test('given scanned skill without quality when qualitySurfacing then Q question', () => {
  // -- Given / When --
  const actual = qualitySurfacing({
    type: 'skill',
    quality: null,
    lastScan: '2026-08-19T10:00:00Z',
    status: 'amber',
    identifier: 'partial-skill',
  });

  // -- Then --
  assert.equal(actual.badge, 'Q ?');
  assert.equal(actual.tone, 'unknown-unscored');
  assert.match(actual.scheduleCue, /tripwire scan partial-skill --force/);
  assert.match(qualityTooltip('unknown-unscored'), /Q \?/);
});

test('given mcp server when qualitySurfacing then omit badge', () => {
  // -- Given / When / Then --
  assert.equal(
    qualitySurfacing({ type: 'mcp_server', quality: 50, status: 'green' }),
    null,
    'MCP cards must not invent Tessl quality'
  );
});

// ── GWT-42.12–42.13, GWT-42.17 — quality tab buckets (A14) ───────────────

const mixedQualityFixtures = [
  { id: 's92', type: 'skill', name: 'high-92', quality: 92 },
  { id: 's88', type: 'skill', name: 'high-88', quality: 88 },
  { id: 's80', type: 'skill', name: 'boundary-80', quality: 80 },
  { id: 's79', type: 'skill', name: 'boundary-79', quality: 79 },
  { id: 's61', type: 'skill', name: 'low-61', quality: 61 },
  { id: 'snull', type: 'skill', name: 'unscored', quality: null },
  { id: 'snan', type: 'skill', name: 'nan-score', quality: Number.NaN },
  { id: 'mcp1', type: 'mcp_server', name: 'ignored-mcp', quality: 95 },
];

test('given mixed quality skills when high tab filter then only skills with quality >= 80', () => {
  const high = filterItemsByQualityTab(mixedQualityFixtures, 'high');
  assert.deepEqual(
    high.map((it) => it.id).sort(),
    ['s80', 's88', 's92'],
    'high tab must include 80 boundary and exclude 79/null'
  );
});

test('given mixed quality skills when low tab filter then only below-threshold scored skills', () => {
  const low = filterItemsByQualityTab(mixedQualityFixtures, 'low');
  assert.deepEqual(
    low.map((it) => it.id).sort(),
    ['s61', 's79'],
    'low tab must include sub-80 numeric scores only'
  );
});

test('given mixed quality skills when unscored tab filter then null and NaN skills only', () => {
  const unscored = filterItemsByQualityTab(mixedQualityFixtures, 'unscored');
  assert.deepEqual(
    unscored.map((it) => it.id).sort(),
    ['snan', 'snull'],
    'unscored tab must include null/NaN and exclude numeric scores'
  );
});

test('given quality helpers when boundary and type checks then skills-only buckets', () => {
  assert.equal(QUALITY_TAB_FLOOR, 80);
  assert.equal(qualityTabBucket({ type: 'skill', quality: 80 }), 'high');
  assert.equal(qualityTabBucket({ type: 'skill', quality: 79 }), 'low');
  assert.equal(qualityTabBucket({ type: 'skill', quality: null }), 'unscored');
  assert.equal(qualityTabBucket({ type: 'skill', quality: Number.NaN }), 'unscored');
  assert.equal(qualityTabBucket({ type: 'mcp_server', quality: 99 }), null);
  assert.equal(matchesQualityTab({ type: 'mcp_server', quality: 99 }, 'high'), false);
  assert.equal(matchesQualityTab({ type: 'mcp_server', quality: 99 }, 'low'), false);
  assert.equal(matchesQualityTab({ type: 'mcp_server', quality: 99 }, 'unscored'), false);
  assert.equal(isSkillItem({ type: 'skill' }), true);
  assert.equal(isSkillItem({ type: 'mcp_server' }), false);
});

test('given mixed skills when countSkillsByQualityTab then tallies high low and unscored', () => {
  assert.deepEqual(countSkillsByQualityTab(mixedQualityFixtures), {
    high: 3,
    low: 2,
    unscored: 2,
  });
});

// ── GWT-42.8 — risk tooltip ───────────────────────────────────────────────

test('given numeric risk when riskTooltip then covers formula and colour independence', () => {
  // -- Given / When --
  const tip = riskTooltip('0.75');

  // -- Then --
  assert.match(tip, /3×|3\*/);
  assert.match(tip, /checks/i);
  assert.match(tip, /colour|color/i);
  assert.match(tip, /not card/i);
});

test('given unknown risk when riskTooltip then not zero risk', () => {
  assert.match(riskTooltip('—'), /unknown/i);
  assert.match(riskTooltip('—'), /not zero/i);
  assert.equal(formatRiskDensityLabel('0.75'), 'Risk density 0.75');
  assert.equal(formatRiskDensityLabel('—'), 'Risk density —');
  assert.equal(formatRiskBadge('1.19'), 'R 1.19');
  assert.equal(formatRiskBadge('—'), 'R —');
});

// ── GWT-42.10 — operator labels ───────────────────────────────────────────

test('given locus and avail enums when operator labels then glossary phrases', () => {
  assert.equal(operatorLocusLabel('unknown'), 'Location unknown');
  assert.equal(operatorAvailLabel('source_on_disk'), 'On disk');
  assert.equal(operatorAvailLabel('introspection_only'), 'No local source');
  assert.equal(operatorAvailLabel('unknown'), 'Scanability unknown');
});

// ── GWT-42.7 — Tessl inner quality ────────────────────────────────────────

test('given Tessl scanner with null score when tesslInnerQuality then not-scored cue', () => {
  // -- Given --
  const scanner = {
    source: 'Tessl: Review (Quality)',
    status: 'unreachable',
    output: { quality_score: null },
  };

  // -- When --
  const actual = tesslInnerQuality(scanner, { identifier: 'canvas' });

  // -- Then --
  assert.equal(actual.show, true);
  assert.match(actual.label, /Tessl quality not scored/i);
  assert.match(actual.scheduleCue, /tripwire scan canvas --force/);
  assert.match(actual.tooltip, /Tessl/);
});

test('given Tessl scanner with score when tesslInnerQuality then numeric label', () => {
  const actual = tesslInnerQuality(
    { source: 'Tessl: Review (Quality)', status: 'completed', output: { quality_score: 88 } },
    { identifier: 'canvas' }
  );
  assert.equal(actual.label, 'Tessl quality 88/100');
  assert.equal(actual.scheduleCue, null);
});

test('given Tessl Lint scanner when tesslInnerQuality then null', () => {
  assert.equal(
    tesslInnerQuality(
      { source: 'Tessl: Lint', status: 'completed', output: { quality_score: 88 } },
      { identifier: 'x' }
    ),
    null
  );
});

test('given legacy Tessl scanner when tesslInnerQuality then null', () => {
  assert.equal(
    tesslInnerQuality(
      { source: 'Tessl', status: 'completed', output: { quality_score: 88 } },
      { identifier: 'x' }
    ),
    null
  );
});

test('given non-Tessl scanner when tesslInnerQuality then null', () => {
  assert.equal(
    tesslInnerQuality(
      { source: 'Snyk', status: 'completed', output: { quality_score: 1 } },
      { identifier: 'x' }
    ),
    null
  );
});

test('given needs_setup when scannerExecMeta then Needs Setup label', () => {
  const actual = scannerExecMeta('needs_setup');
  assert.equal(actual.label, 'Needs Setup');
});

const TESSL_LINT = { source: 'Tessl: Lint', status: 'completed', checks_run: 12 };
const TESSL_QUALITY = {
  source: 'Tessl: Review (Quality)',
  status: 'completed',
  checks_run: 1,
};
const SNYK_ROW = { source: 'Snyk', status: 'completed', checks_run: 5 };
const CISCO_ROW = {
  source: 'Cisco Skill Scanner: static/bytecode/pipeline',
  status: 'completed',
  checks_run: 3,
};

test('given Lint and Quality when mergeTesslCapabilityRows then five Tessl sources in design order', () => {
  /**
   * Scenario: All 5 Tessl rows visible immediately.
   * Slice: 48 — GWT-48.1
   *
   * Given a scan_run has only Tessl: Lint and Tessl: Review (Quality),
   * When the dashboard merges capability rows,
   * Then five Tessl rows appear in Lint → Quality → Scenario → Eval → Security order.
   */
  // ### Given
  const dbRows = [TESSL_LINT, TESSL_QUALITY];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);
  const tesslSources = actual.map((row) => row.source);

  // ### Then
  assert.deepEqual(tesslSources, [...TESSL_CAPABILITY_SOURCES]);
});

test('given missing Tessl capabilities when mergeTesslCapabilityRows then sentinels are Not Available Yet', () => {
  /**
   * Scenario: Rows 3–5 render as muted placeholders with no checks or duration.
   * Slice: 48 — GWT-48.1
   *
   * Given Lint and Quality exist and rows 3–5 are absent from the DB,
   * When capability rows are merged,
   * Then the three missing sources are sentinels with status not_available_yet
   * and no checks_run or duration_ms.
   */
  // ### Given
  const dbRows = [TESSL_LINT, TESSL_QUALITY];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);
  const sentinels = actual.filter((row) => row.status === 'not_available_yet');

  // ### Then
  assert.deepEqual(
    sentinels.map((row) => row.source),
    [
      'Tessl: Scenario Generation',
      'Tessl: Eval',
      'Tessl: Review (Security)',
    ]
  );
  assert.equal(sentinels[0].checks_run, null);
  assert.equal(sentinels[0].duration_ms, null);
  assert.equal(sentinels[1].checks_run, null);
  assert.equal(sentinels[1].duration_ms, null);
  assert.equal(sentinels[2].checks_run, null);
  assert.equal(sentinels[2].duration_ms, null);
});

test('given other scanners plus two Tessl rows when mergeTesslCapabilityRows then count includes placeholders', () => {
  /**
   * Scenario: Scanner Outputs count includes placeholder rows.
   * Slice: 48 — GWT-48.2
   *
   * Given Cisco, Snyk, Lint, and Quality (4 DB rows),
   * When capability rows are merged,
   * Then the view length is 7 (4 real + 3 sentinels).
   */
  // ### Given
  const dbRows = [CISCO_ROW, SNYK_ROW, TESSL_LINT, TESSL_QUALITY];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);

  // ### Then
  assert.equal(actual.length, 7);
});

test('given Eval DB row when mergeTesslCapabilityRows then Eval sentinel is replaced', () => {
  /**
   * Scenario: Sentinel rows disappear when a capability ships.
   * Slice: 48 — GWT-48.4
   *
   * Given a future Eval row exists alongside Lint and Quality,
   * When capability rows are merged,
   * Then Eval keeps its DB status and only Security remains a sentinel.
   */
  // ### Given
  const evalRow = { source: 'Tessl: Eval', status: 'blocked', checks_run: 0 };
  const dbRows = [TESSL_LINT, TESSL_QUALITY, evalRow];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);
  const evalMerged = actual.find((row) => row.source === 'Tessl: Eval');
  const security = actual.find((row) => row.source === 'Tessl: Review (Security)');
  const scenario = actual.find(
    (row) => row.source === 'Tessl: Scenario Generation'
  );

  // ### Then
  assert.equal(evalMerged.status, 'blocked');
  assert.equal(evalMerged.checks_run, 0);
  assert.equal(security.status, 'not_available_yet');
  assert.equal(scenario.status, 'not_available_yet');
});

test('given MCP-only scanners when mergeTesslCapabilityRows then no Tessl sentinels', () => {
  /**
   * Scenario: MCP scans do not grow fake Tessl placeholder rows.
   * Slice: 48 — GWT-48.1 guard
   *
   * Given a scan_run with only Cisco MCP and Snyk rows,
   * When capability rows are merged,
   * Then the list is unchanged — Tessl sentinels are not injected.
   */
  // ### Given
  const dbRows = [
    { source: 'Cisco MCP Scanner: YARA', status: 'completed', checks_run: 22 },
    SNYK_ROW,
  ];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);

  // ### Then
  assert.equal(actual.length, 2);
  assert.equal(
    actual.some((row) => String(row.source).startsWith('Tessl:')),
    false
  );
});

test('given Tessl and later-alphabet scanner when mergeTesslCapabilityRows then Tessl block stays contiguous', () => {
  /**
   * Scenario: Tessl rows stay a contiguous block where Tessl sorts.
   * Slice: 48 — GWT-48.1
   *
   * Given Snyk, Tessl Lint/Quality, and Tripwire Sandbox rows,
   * When capability rows are merged,
   * Then the five Tessl sources sit between Snyk and Tripwire Sandbox.
   */
  // ### Given
  const dbRows = [
    SNYK_ROW,
    TESSL_LINT,
    TESSL_QUALITY,
    { source: 'Tripwire Sandbox (egress log)', status: 'completed', checks_run: 1 },
  ];

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);
  const sources = actual.map((row) => row.source);

  // ### Then
  assert.deepEqual(sources.slice(0, 1), ['Snyk']);
  assert.deepEqual(sources.slice(1, 6), [...TESSL_CAPABILITY_SOURCES]);
  assert.equal(sources[6], 'Tripwire Sandbox (egress log)');
});

test('given null scanner list when mergeTesslCapabilityRows then empty list', () => {
  /**
   * Scenario: Merge is safe on missing scanner arrays.
   * Slice: 48
   *
   * Given a null scanner list,
   * When capability rows are merged,
   * Then the result is an empty array.
   */
  // ### Given
  const dbRows = null;

  // ### When
  const actual = mergeTesslCapabilityRows(dbRows);

  // ### Then
  assert.deepEqual(actual, []);
});

test('given not_available_yet when scannerExecMeta then muted Not Available Yet label', () => {
  /**
   * Scenario: Placeholder pill uses muted copy, not an action status.
   * Slice: 48 — GWT-48.1
   *
   * Given scanner status not_available_yet,
   * When scannerExecMeta is resolved,
   * Then the label is Not Available Yet and the colour is muted grey.
   */
  // ### Given
  const status = 'not_available_yet';

  // ### When
  const actual = scannerExecMeta(status);

  // ### Then
  assert.equal(actual.label, 'Not Available Yet');
  assert.equal(actual.color, STATUS_META.grey.color);
});

test('given dashboard html when inspecting scannersView then Tessl sentinels are merged', () => {
  /**
   * Scenario: Production dashboard view wires mergeTesslCapabilityRows.
   * Slice: 48 — GWT-48.1 integration
   *
   * Given Tripwire.dc.html,
   * When the scannersView construction is inspected,
   * Then it calls mergeTesslCapabilityRows and styles not_available_yet rows.
   */
  // ### Given
  const html = readFileSync(HTML_PATH, 'utf8');

  // ### When / Then
  assert.match(html, /mergeTesslCapabilityRows\(selected\.scanners\)/);
  assert.match(html, /isPlaceholder = sc\.status === 'not_available_yet'/);
  assert.match(html, /Not Available Yet/);
});

test('given security row with quality id when securityQualityLink then returns quality run id', () => {
  /**
   * Scenario: Security row with a Quality run ID exposes a UI link.
   * Slice: 51 — GWT-51.3 UI
   *
   * Given a Security scanner row whose upstream_run_ids.review_quality is set,
   * When securityQualityLink is called,
   * Then the Quality run ID is returned for the expanded Security section.
   */
  // ### Given
  const scanner = {
    source: 'Tessl: Review (Security)',
    upstream_run_ids: { review_quality: 'rev_abc123' },
  };

  // ### When
  const actual = securityQualityLink(scanner);

  // ### Then
  assert.deepEqual(actual, {
    qualityId: 'rev_abc123',
    source: 'Tessl: Review (Quality)',
  });
});

test('given security row without quality id when securityQualityLink then no panel', () => {
  /**
   * Scenario: Null Quality ID hides the linked findings panel.
   * Slice: 51 — GWT-51.4 UI
   *
   * Given a Security row with upstream_run_ids.review_quality null,
   * When securityQualityLink is called,
   * Then the result is null so the dashboard shows no linked findings.
   */
  // ### Given
  const scanner = {
    source: 'Tessl: Review (Security)',
    upstream_run_ids: { review_quality: null },
  };

  // ### When / Then
  assert.equal(securityQualityLink(scanner), null);
  assert.deepEqual(linkedQualityFindingsForSecurity(scanner, [{ scanner: 'Tessl: Review (Quality)' }]), []);
});

test('given quality findings when linkedQualityFindingsForSecurity then only quality rows', () => {
  /**
   * Scenario: Quality findings appear alongside Security when the link is populated.
   * Slice: 51 — GWT-51.3 UI findings
   *
   * Given Security links to Quality run rev_abc123 and mixed findings,
   * When linkedQualityFindingsForSecurity is called,
   * Then only Tessl: Review (Quality) findings are returned.
   */
  // ### Given
  const scanner = {
    source: 'Tessl: Review (Security)',
    upstream_run_ids: { review_quality: 'rev_abc123' },
  };
  const findings = [
    { scanner: 'Snyk', message: 'dep' },
    { scanner: 'Tessl: Review (Quality)', message: 'clarity' },
    { scanner: 'Tessl: Review (Security)', message: 'injection' },
  ];

  // ### When
  const actual = linkedQualityFindingsForSecurity(scanner, findings);

  // ### Then
  assert.equal(actual.length, 1);
  assert.equal(actual[0].message, 'clarity');
});

test('given dashboard html when inspecting security expand then quality findings are wired', () => {
  /**
   * Scenario: Expanded Security row renders linked Quality findings.
   * Slice: 51 — GWT-51.3 HTML
   *
   * Given Tripwire.dc.html,
   * When the Security expand template is inspected,
   * Then it renders the Linked Quality Review panel from securityQualityLink.
   */
  // ### Given
  const html = readFileSync(HTML_PATH, 'utf8');

  // ### When / Then
  assert.match(html, /securityQualityLink/);
  assert.match(html, /Linked Quality Review/);
  assert.match(html, /linkedQualityFindings/);
});
