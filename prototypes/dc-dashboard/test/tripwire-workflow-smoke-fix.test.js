/**
 * Tests for Workflow smoke fixes + target-scoped Fix→Verify (slice 77).
 *
 * Author: swami
 * Created: 2026-09-21
 * Scope: Run CTA/process terminal statuses; dedupe/stable id; single-select;
 *   target scope; Verify honesty before/after Mark fixed
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  areScannersFinished,
  buildPrimaryCta,
  buildProcessLine,
  buildRunReadiness,
  collectScannerRows,
  dedupeFindingsById,
  normalizeScannerStatus,
  scannersReadyForTriage,
  scopeFindingsToTarget,
  selectSingleFinding,
  scannerIsTerminal,
} from '../tripwire-workflow-pipeline.js';
import {
  applyPersistedTriage,
  saveTriageDecision,
  stableFindingId,
} from '../tripwire-workflow-prefs.js';
import {
  createMemoryVerifyPort,
  verifyFixOnWorktree,
} from '../tripwire-verify-rescan.js';
import { buildVerifyView } from '../tripwire-verify-view.js';
import { buildReportView } from '../tripwire-report.js';
import { isFixCandidate } from '../tripwire-fix-propose.js';
import { buildTriageView } from '../tripwire-triage.js';
import mockData from '../tripwire-data.js';

test('GWT-77.1 given not_applicable and blocked when scannersReadyForTriage then finished', () => {
  /**
   * Scenario: Terminal non-running statuses do not block Run CTA.
   * Slice: GWT-77.1
   */
  // -- Given --
  const scanners = [
    { status: 'completed' },
    { status: 'not_applicable' },
    { status: 'blocked' },
    { status: 'failed' },
  ];

  // -- When --
  const ready = scannersReadyForTriage(scanners);
  const processLine = buildProcessLine({
    scanners,
    judgesState: { mode: 'absent' },
    hasFindings: true,
  });
  const cta = buildPrimaryCta({
    scannersComplete: ready,
    hasFindings: true,
    panelMode: 'absent',
  });

  // -- Then --
  assert.equal(ready, true);
  assert.equal(areScannersFinished(scanners), true);
  assert.match(processLine, /Scanners complete/);
  assert.equal(cta.visible, true, 'Review findings CTA must show when terminal + findings');
});

test('GWT-77.1 given running scanner when scannersReadyForTriage then not ready', () => {
  /**
   * Scenario: Active scanners still block triage CTA.
   * Slice: GWT-77.1
   */
  // -- Given / When --
  const scanners = [
    { status: 'completed' },
    { status: 'running' },
  ];

  // -- Then --
  assert.equal(scannersReadyForTriage(scanners), false);
  assert.equal(scannerIsTerminal('running'), false);
  assert.match(
    buildProcessLine({ scanners, judgesState: { mode: 'absent' }, hasFindings: true }),
    /Scanners running \(1 active\)/,
  );
});

test('GWT-77.2 given colliding titles across targets when stableFindingId then distinct ids', () => {
  /**
   * Scenario: Same title on two skills must not share a generated id.
   * Slice: GWT-77.2
   */
  // -- Given --
  const a = {
    title: 'Same finding',
    severity: 'High',
    evidenceHighlight: 'x',
    itemId: 'skill-a',
    source: 'a.md:1',
    scanner: 'Cisco',
  };
  const b = { ...a, itemId: 'skill-b', source: 'b.md:1' };

  // -- When / Then --
  assert.notEqual(stableFindingId(a), stableFindingId(b));
});

test('GWT-77.2 given same raw id on two items when stableFindingId then item-scoped', () => {
  /**
   * Scenario: DB finding ids collide across targets — scope by itemId.
   * Slice: GWT-77.2
   */
  // -- Given / When / Then --
  assert.equal(
    stableFindingId({ id: 'dup', itemId: 'i1' }),
    'i1:dup',
  );
  assert.equal(
    stableFindingId({ id: 'dup', itemId: 'i2' }),
    'i2:dup',
  );
});

test('GWT-77.2 given already-stable id when stableFindingId again then idempotent', () => {
  /**
   * Scenario: mapItemFindingToWorkflow sets id, then applyPersistedTriage
   * re-resolves — must not re-prefix (triage buttons appeared dead).
   * Slice: GWT-77.2
   */
  // -- Given --
  const hashed = {
    id: 'gen:abcd1234',
    itemId: 'skill-a',
    title: 'X',
    severity: 'High',
  };
  const scoped = {
    id: 'i1:dup',
    itemId: 'i1',
    title: 'Y',
    severity: 'High',
  };

  // -- When / Then --
  assert.equal(stableFindingId(hashed), 'gen:abcd1234');
  assert.equal(stableFindingId(scoped), 'i1:dup');
});

test('GWT-77.2 given save under finding.id when applyPersistedTriage then status overlays', () => {
  /**
   * Scenario: Triage To fix / Needs review / Dismiss must change headline counts.
   * Slice: GWT-77.2
   */
  // -- Given --
  const storage = new Map();
  const store = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
  };
  const finding = {
    id: 'gen:deadbeef',
    itemId: 'skill-a',
    title: 'Inject',
    severity: 'High',
    triageStatus: 'to_fix',
  };
  saveTriageDecision(finding.id, 'needs_review', store);

  // -- When --
  const [overlaid] = applyPersistedTriage([finding], store);

  // -- Then --
  assert.equal(overlaid.triageStatus, 'needs_review');
});

test('GWT-77.2 given duplicate ids when dedupeFindingsById then first wins and report matches', () => {
  /**
   * Scenario: Shared universe for Triage/Report after dedupe.
   * Slice: GWT-77.2
   */
  // -- Given --
  const findings = [
    { id: 'f1', triageStatus: 'to_fix', severity: 'High' },
    { id: 'f1', triageStatus: 'to_fix', severity: 'High' },
    { id: 'f2', triageStatus: 'needs_review', severity: 'Low' },
  ];

  // -- When --
  const deduped = dedupeFindingsById(findings);
  const report = buildReportView({ findings: deduped });

  // -- Then --
  assert.equal(deduped.length, 2);
  assert.equal(report.counts.left, 2);
  assert.match(report.headline, /2 left/);
});

test('GWT-77.3 given target when scopeFindingsToTarget then only that item', () => {
  /**
   * Scenario: Target focus scopes findings to one skill/mcp/package.
   * Slice: GWT-77.3
   */
  // -- Given --
  const findings = [
    { id: '1', itemId: 'mcp-a' },
    { id: '2', itemId: 'skill-b' },
    { id: '3', itemId: 'mcp-a' },
  ];

  // -- When / Then --
  assert.deepEqual(
    scopeFindingsToTarget(findings, 'mcp-a').map((f) => f.id),
    ['1', '3'],
  );
  assert.equal(scopeFindingsToTarget(findings, 'all').length, 3);
});

test('GWT-77.3 given selectSingleFinding when choosing another id then replaces', () => {
  /**
   * Scenario: One finding selected at a time.
   * Slice: GWT-77.3
   */
  // -- Given / When / Then --
  assert.deepEqual(selectSingleFinding(['a'], 'b', { toggleOff: false }), ['b']);
  assert.deepEqual(selectSingleFinding(['a'], 'a', { toggleOff: true }), []);
});

test('GWT-77.5 given heuristic patch before mark fixed when verify then not finding_gone', () => {
  /**
   * Scenario: Memory verify must not claim Finding gone before Mark fixed.
   * Slice: GWT-77.5
   */
  // -- Given --
  const finding = {
    id: 'f-verify',
    title: 'Shell injection',
    source: 'server.py:1',
  };
  const patch = '--- a/x\n+++ b/x\n@@\n-old\n+old // tripwire\n';
  const port = createMemoryVerifyPort({
    scanResult: {
      status: 'ok',
      findings: [finding],
      actions: [{ name: 'memory-scanner', status: 'ok', detail: 'still present' }],
    },
  });

  // -- When --
  const verification = verifyFixOnWorktree({
    finding,
    patch,
    approvedRepoPath: 'approved',
    verifyPort: port,
  });
  const view = buildVerifyView({ finding, verification });

  // -- Then --
  assert.equal(verification.outcome, 'still_present');
  assert.equal(view.outcomeLabel, 'Still present');
});

test('GWT-77.6 given mark-fixed scan when verify then finding_gone', () => {
  /**
   * Scenario: After Mark fixed, memory verify may report finding gone.
   * Slice: GWT-77.6
   */
  // -- Given --
  const finding = { id: 'f-gone', title: 'Shell', source: 'a.py:1' };
  const port = createMemoryVerifyPort({
    scanResult: {
      status: 'ok',
      findings: [],
      actions: [{ name: 'memory-scanner', status: 'ok', detail: 'no match' }],
    },
  });

  // -- When --
  const verification = verifyFixOnWorktree({
    finding,
    patch: '--- a\n+++ b\n',
    approvedRepoPath: 'approved',
    verifyPort: port,
  });
  const view = buildVerifyView({ finding, verification });

  // -- Then --
  assert.equal(verification.outcome, 'finding_gone');
  assert.equal(view.outcomeLabel, 'Finding gone');
});

// ── Systematic smoke FAIL closures (1 CTA · 2 counts · 3 process line) ───────

/**
 * Map raw mock items → workflow findings the way Tripwire.dc.html does
 * (skip tiered_router; stable id; dedupe).
 * @param {{ items?: Array<object> }} data
 */
function collectMockWorkflowFindings(data) {
  const out = [];
  for (const item of data.items || []) {
    (item.findings || []).forEach((f, index) => {
      if (f.scanner === 'tiered_router') return;
      const severity =
        f.severity === 'red' || f.severity === 'high'
          ? 'High'
          : f.severity === 'amber' || f.severity === 'medium'
            ? 'Medium'
            : f.severity === 'green' || f.severity === 'low'
              ? 'Low'
              : 'Medium';
      const provisional = {
        id: f.id || null,
        title: f.message ? String(f.message).slice(0, 120) : f.category || 'Finding',
        severity,
        evidenceHighlight: f.snippet || '',
        source: f.file_path
          ? f.location != null
            ? `${f.file_path}:${f.location}`
            : f.file_path
          : '',
        scanner: f.scanner || '',
        triageStatus: severity === 'Low' ? 'needs_review' : 'to_fix',
        itemId: item.id,
        itemName: item.name,
        itemType: item.type || '',
      };
      provisional.id = stableFindingId(provisional);
      out.push(provisional);
    });
  }
  return dedupeFindingsById(out);
}

test('FAIL-1 given mock demo scanners when buildRunReadiness then Review findings CTA visible', () => {
  /**
   * Scenario: Terminal fixture includes not_applicable — CTA must appear.
   * (Full mockData also has intentional running rows on data-pipeline-runner.)
   * Smoke FAIL: Run CTA never appears when any scanner is not_applicable/blocked.
   */
  // -- Given --
  const allRows = collectScannerRows(mockData);
  assert.ok(
    allRows.some((r) => normalizeScannerStatus(r.status) === 'not_applicable'),
    'fixture must include not_applicable rows',
  );
  const terminalOnly = allRows.filter(
    (r) => normalizeScannerStatus(r.status) !== 'running',
  );
  // Force a blocked row into the finished set
  terminalOnly.push({ status: 'blocked', scanner: 'Tessl: Eval', target: 'x' });
  const hasFindings = collectMockWorkflowFindings(mockData).length > 0;

  // -- When --
  const ready = buildRunReadiness({
    scanners: terminalOnly,
    hasFindings,
    judgesState: { mode: 'absent' },
  });

  // -- Then --
  assert.equal(ready.scannersComplete, true);
  assert.equal(ready.ctaVisible, true);
  assert.match(ready.processLine, /Scanners complete/);
  assert.doesNotMatch(ready.processLine, /Scanners running/);
});

test('FAIL-1 given full mockData with running rows when readiness then CTA visible via absent panel', () => {
  /**
   * Scenario: Mock has 5 running scanners but findings + absent panel → CTA on.
   * Process line still narrates running honestly.
   */
  // -- Given / When --
  const scanners = collectScannerRows(mockData);
  const ready = buildRunReadiness({
    scanners,
    hasFindings: true,
    judgesState: { mode: 'absent' },
  });

  // -- Then --
  assert.equal(ready.scannersComplete, false);
  assert.equal(ready.ctaVisible, true);
  assert.match(ready.processLine, /Scanners running \(5 active\)/);
  assert.match(ready.processLine, /findings ready for triage/);
});

test('FAIL-1 given spaced not applicable status when normalize then terminal', () => {
  /**
   * Scenario: Status aliases with spaces/hyphens still unlock CTA.
   * Smoke FAIL: Run CTA / terminal status recognition.
   */
  // -- Given / When / Then --
  assert.equal(normalizeScannerStatus('not applicable'), 'not_applicable');
  assert.equal(scannerIsTerminal('not applicable'), true);
  assert.equal(scannerIsTerminal('NOT-APPLICABLE'), true);
  assert.equal(
    scannersReadyForTriage([
      { status: 'completed' },
      { status: 'not applicable' },
      { status: 'Blocked' },
    ]),
    true,
  );
});

test('FAIL-2 given mock findings when Triage Fix Report then shared universe counts', () => {
  /**
   * Scenario: Triage list size, Fix candidate pool base, and Report left agree.
   * Smoke FAIL: Live count drift across Triage / Fix / Report.
   */
  // -- Given --
  const findings = collectMockWorkflowFindings(mockData);
  const ids = new Set(findings.map((f) => f.id));

  // -- When --
  const triage = buildTriageView({ findings, triageFilter: 'all' });
  const report = buildReportView({ findings });
  const fixCandidates = findings.filter(isFixCandidate);

  // -- Then --
  assert.equal(ids.size, findings.length, 'ids must be unique after dedupe');
  assert.equal(triage.filteredFindings.length, findings.length);
  assert.equal(report.counts.left, findings.length);
  assert.ok(fixCandidates.length <= findings.length);
  assert.equal(
    report.counts.fixed + report.counts.left + report.counts.wontFix,
    findings.length,
  );
});

test('FAIL-2 given colliding raw ids across items when universe then distinct rows', () => {
  /**
   * Scenario: Same scanner finding id on two items must not collapse Triage≠Report.
   * Smoke FAIL: count drift from unstable ids.
   */
  // -- Given --
  const data = {
    items: [
      {
        id: 'item-a',
        name: 'skill-a',
        type: 'skill',
        findings: [
          { id: 'same', severity: 'red', message: 'X', scanner: 'Cisco', snippet: 'a' },
        ],
        scanners: [{ source: 'Cisco', status: 'completed' }],
      },
      {
        id: 'item-b',
        name: 'skill-b',
        type: 'skill',
        findings: [
          { id: 'same', severity: 'red', message: 'X', scanner: 'Cisco', snippet: 'a' },
        ],
        scanners: [{ source: 'Cisco', status: 'completed' }],
      },
    ],
  };

  // -- When --
  const findings = collectMockWorkflowFindings(data);
  const report = buildReportView({ findings });
  const triage = buildTriageView({ findings, triageFilter: 'all' });

  // -- Then --
  assert.equal(findings.length, 2);
  assert.equal(triage.filteredFindings.length, 2);
  assert.equal(report.counts.left, 2);
  assert.notEqual(findings[0].id, findings[1].id);
});

test('FAIL-3 given completed and not_applicable table when process line then not running', () => {
  /**
   * Scenario: Visible completed/N/A table must not say Scanners running.
   * Smoke FAIL: process line running disagrees with completed table.
   */
  // -- Given --
  const scanners = [
    { status: 'completed', scanner: 'Cisco' },
    { status: 'not_applicable', scanner: 'DepShield' },
    { status: 'blocked', scanner: 'Tessl Eval' },
    { status: 'failed', scanner: 'Tessl Lint' },
    { status: 'completed', scanner: 'Snyk' },
  ];

  // -- When --
  const line = buildProcessLine({
    scanners,
    judgesState: { mode: 'absent' },
    hasFindings: true,
  });

  // -- Then --
  assert.match(line, /^Scanners complete/);
  assert.doesNotMatch(line, /running/);
  assert.equal(areScannersFinished(scanners), true);
});

test('FAIL-3 given one running among completed when process line then running count', () => {
  /**
   * Scenario: Real in-flight scanners still narrate running honestly.
   * Smoke FAIL: process line honesty (positive control).
   */
  // -- Given / When --
  const line = buildProcessLine({
    scanners: [
      { status: 'completed' },
      { status: 'running' },
      { status: 'not_applicable' },
    ],
    judgesState: { mode: 'absent' },
    hasFindings: true,
  });

  // -- Then --
  assert.match(line, /Scanners running \(1 active\)/);
  assert.equal(
    buildRunReadiness({
      scanners: [
        { status: 'completed' },
        { status: 'running' },
        { status: 'not_applicable' },
      ],
      hasFindings: true,
      judgesState: { mode: 'absent' },
    }).ctaVisible,
    true,
    'absent panel + findings unlocks CTA while one scanner still runs',
  );
  assert.equal(
    buildRunReadiness({
      scanners: [
        { status: 'completed' },
        { status: 'running' },
        { status: 'not_applicable' },
      ],
      hasFindings: true,
      judgesState: { mode: 'present' },
    }).ctaVisible,
    false,
    'present panel still waits for scannersComplete',
  );
});
