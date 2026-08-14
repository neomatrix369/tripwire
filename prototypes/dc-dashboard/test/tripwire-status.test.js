/**
 * Tests for tripwire-status.js (heatmap / severity / execution color SSOT).

 * Author: swami
 * Created: 2026-08-01
 * Scope: statusFromRisk density fallback, resolveItemStatus priority (worst-of),
 *   severity normalize, finding-count chip labels
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
    'running scanner must use SCANNING blue color');
  assert.match(meta.label, /Running/i,
    'running scanner label must say Running');
});
