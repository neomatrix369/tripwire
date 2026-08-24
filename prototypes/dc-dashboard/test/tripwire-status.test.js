/**
 * Tests for tripwire-status.js (heatmap / severity / execution color SSOT).

 * Author: swami
 * Created: 2026-08-01
 * Scope: statusFromRisk density fallback, resolveItemStatus priority (worst-of),
 *   severity normalize, finding-count chip labels; slice-42 A9–A13 quality/risk
 *   tooltips and operator labels
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '../tripwire-status.js';

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
