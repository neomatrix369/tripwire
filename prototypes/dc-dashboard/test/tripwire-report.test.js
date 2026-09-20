/**
 * Tests for slice-71 report view (headline + primary export).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-71.3 report headline fixed/left/won't fix; primaryExportLabel
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportView,
  resolveReportDisposition,
} from '../tripwire-report.js';

test('GWT-71.3 given reviewed findings when buildReportView then headline summarises fixed left wont fix', () => {
  // -- Given --
  const findings = [
    { id: 'a', severity: 'High', reportDisposition: 'fixed' },
    { id: 'b', severity: 'Medium', reportDisposition: 'fixed' },
    { id: 'c', severity: 'Low', triageStatus: 'to_fix' },
    { id: 'd', severity: 'Medium', triageStatus: 'needs_review' },
    { id: 'e', severity: 'Low', triageStatus: 'dismissed' },
    { id: 'f', severity: 'High', triageStatus: 'to_fix' },
  ];

  // -- When --
  const view = buildReportView({ findings });

  // -- Then --
  assert.deepEqual(
    view.counts,
    { fixed: 2, left: 3, wontFix: 1 },
    'counts must bucket fixed / left / wontFix'
  );
  assert.equal(
    view.headline,
    "2 fixed · 3 left · 1 won't fix",
    'headline must summarise fixed · left · won’t fix'
  );
});

test('GWT-71.3 given report view when opened then primaryExportLabel is Export report', () => {
  // -- Given --
  const findings = [{ id: 'x', triageStatus: 'to_fix' }];

  // -- When --
  const view = buildReportView({ findings });

  // -- Then --
  assert.equal(
    view.primaryExportLabel,
    'Export report',
    'Report step must expose one primary export action label'
  );
});

test('GWT-71.3 given reportDisposition set when resolved then prefers disposition over triageStatus', () => {
  // -- Given --
  const finding = {
    reportDisposition: 'left',
    triageStatus: 'dismissed',
  };

  // -- When --
  const disposition = resolveReportDisposition(finding);

  // -- Then --
  assert.equal(
    disposition,
    'left',
    'reportDisposition must win over triageStatus mapping'
  );
});

test('GWT-71.3 given triageStatus only when resolved then maps dismissed fixed else left', () => {
  // -- Given / When / Then --
  assert.equal(resolveReportDisposition({ triageStatus: 'dismissed' }), 'wont_fix');
  assert.equal(resolveReportDisposition({ triageStatus: 'fixed' }), 'fixed');
  assert.equal(resolveReportDisposition({ triageStatus: 'to_fix' }), 'left');
  assert.equal(resolveReportDisposition({ triageStatus: 'needs_review' }), 'left');
  assert.equal(resolveReportDisposition({}), 'left');
  assert.equal(resolveReportDisposition(null), 'left');
});

test('GWT-71.3 given mixed severities when buildReportView then findings sorted high to low', () => {
  // -- Given --
  const findings = [
    { id: 'low', severity: 'Low', triageStatus: 'to_fix' },
    { id: 'high', severity: 'High', triageStatus: 'fixed' },
    { id: 'med', severity: 'Medium', triageStatus: 'dismissed' },
  ];

  // -- When --
  const view = buildReportView({ findings });

  // -- Then --
  assert.deepEqual(
    view.findings.map((f) => f.id),
    ['high', 'med', 'low'],
    'report findings should be severity-sorted High → Medium → Low'
  );
});
