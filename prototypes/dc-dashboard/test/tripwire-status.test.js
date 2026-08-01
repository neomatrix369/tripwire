/**
 * Tests for tripwire-status.js (heatmap / severity / execution color SSOT).

 * Author: swami
 * Created: 2026-08-01
 * Scope: statusFromRisk thresholds, resolveItemStatus priority, severity normalize
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  statusFromRisk,
  resolveItemStatus,
  normalizeSeverity,
  maxFindingStatus,
  severityColor,
  scannerExecMeta,
  STATUS_META,
} from '../tripwire-status.js';

test('given risk scores when statusFromRisk then matches schema rollup buckets', () => {
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

test('given scanner unreachable when scannerExecMeta then uses error violet not vuln red', () => {
  const meta = scannerExecMeta('unreachable');
  assert.equal(meta.color, STATUS_META.error.color);
  assert.notEqual(meta.color, STATUS_META.red.color);
  assert.equal(severityColor('red'), STATUS_META.red.color);
  assert.equal(severityColor('LOW'), STATUS_META.amber.color);
});
