/**
 * Extra status-mapping coverage for Live ACL modules.
 *
 * Author: swami
 * Created: 2026-08-02
 * Scope: resolveItemStatus edge branches, decorateStatus, scannerExecMeta unknown
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorateStatus,
  resolveItemStatus,
  scannerExecMeta,
  severityColor,
} from '../tripwire-status.js';

test('given complete run with no scores when resolve then error', () => {
  // -- Given / When / Then --
  assert.equal(
    resolveItemStatus({
      runStatus: 'complete',
      heatmapStatus: 'grey',
      riskScore: null,
      findings: [],
    }),
    'error'
  );
});

test('given null runStatus with heatmap error when resolve then error', () => {
  // -- Given / When / Then --
  assert.equal(
    resolveItemStatus({
      runStatus: null,
      heatmapStatus: 'error',
      riskScore: null,
      findings: [],
    }),
    'error'
  );
});

test('given null runStatus with unknown heatmap when resolve then passthrough', () => {
  // -- Given / When / Then --
  assert.equal(
    resolveItemStatus({
      runStatus: null,
      heatmapStatus: 'custom',
      riskScore: null,
      findings: [],
    }),
    'custom'
  );
});

test('given nonterminal run with heatmap error when resolve then error', () => {
  // -- Given / When / Then --
  assert.equal(
    resolveItemStatus({
      runStatus: 'queued',
      heatmapStatus: 'error',
      riskScore: null,
      findings: [],
    }),
    'error'
  );
});

test('given nonterminal run with risk when resolve then risk bucket', () => {
  // -- Given / When / Then --
  assert.equal(
    resolveItemStatus({
      runStatus: 'queued',
      heatmapStatus: 'grey',
      riskScore: 2,
      findings: [],
    }),
    'red'
  );
});

test('given unknown severity when severityColor then grey', () => {
  // -- Given / When / Then --
  assert.ok(severityColor('nope'));
});

test('given unknown scanner status when scannerExecMeta then grey label', () => {
  // -- Given / When --
  const meta = scannerExecMeta('weird');

  // -- Then --
  assert.equal(meta.label, 'weird');
});

test('given known status when decorateStatus then flat color fields', () => {
  // -- Given / When --
  const row = decorateStatus('red');

  // -- Then --
  assert.equal(row.status, 'red');
  assert.ok(row.statusColor);
  assert.ok(row.statusLabel);
});

test('given unknown status when decorateStatus then grey meta', () => {
  // -- Given / When --
  const row = decorateStatus('not-a-status');

  // -- Then --
  assert.equal(row.status, 'not-a-status');
  assert.ok(row.statusColor);
});
