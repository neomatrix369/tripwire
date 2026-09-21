/**
 * Tests for slice-75 operator-visible workflow pipeline helpers.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-75.1 process line; GWT-75.2 final judge narration; GWT-75.3
 *   present/absent/panel-off honesty; GWT-75.4 evidence + coverage; GWT-75.5
 *   live binding characterisation; GWT-75.6 primary CTA; GWT-75.7 first
 *   to-fix pick; GWT-75.8 no gen-27b Fix injection from pipeline/run;
 *   GWT-75.9 parent meta; GWT-75.10 multi-select; GWT-75.11 models per target
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunProgressView } from '../tripwire-run-progress.js';
import { defaultModelHintForStep } from '../tripwire-workflow-models.js';
import {
  buildFinalJudgeNarration,
  buildPrimaryCta,
  buildProcessLine,
  formatEvidenceVerification,
  formatParentTargetMeta,
  honestAbsentCopy,
  normalizeSelectionIds,
  pickFirstToFixFinding,
  resolveCoverageHonesty,
  resolveJudgePanelState,
  selectionProgressLabel,
  toggleFindingSelection,
} from '../tripwire-workflow-pipeline.js';

const LIVE_PANEL_RUN = {
  answered_count: 2,
  total_judges: 3,
  disagreement: true,
  final_verdict: 'needs_review',
  final_reason: 'Confidence below floor under disagreement',
  final_model: 'gen-27b',
  judgements: [
    { slot: 'j1', verdict: 'true_positive', status: 'answered' },
    { slot: 'j2', verdict: 'false_positive', status: 'answered' },
    { slot: 'j3', verdict: null, status: 'pending' },
  ],
};

// ── GWT-75.1 Run narrates scanner + judge progress ───────────────────────────

test('GWT-75.1 given scanners and live panel when resolveJudgePanelState then N of M statusLine', () => {
  /**
   * Scenario: Live panel_run yields answered/total and real slots (no fabrication).
   * Slice: GWT-75.1
   *
   * Given a Workflow run with panel_run judgements,
   * When resolveJudgePanelState runs,
   * Then mode is live and statusLine reports N of M judges answered.
   */
  // -- Given --
  const data = { panel_run: LIVE_PANEL_RUN };

  // -- When --
  const actual = resolveJudgePanelState(data);

  // -- Then --
  assert.equal(actual.mode, 'live');
  assert.equal(actual.panelOff, false);
  assert.equal(actual.answered, 2);
  assert.equal(actual.total, 3);
  assert.equal(actual.slots.length, 3);
  assert.equal(actual.statusLine, '2 of 3 judges answered');
  assert.equal(actual.finalVerdict, 'needs_review');
});

test('GWT-75.1 given scanners running when buildProcessLine then plain-language summary', () => {
  /**
   * Scenario: Process line states what is running / waiting.
   * Slice: GWT-75.1 / GWT-75.6
   */
  // -- Given --
  const scanners = [
    { scanner: 'semgrep', status: 'running' },
    { scanner: 'codeql', status: 'done' },
  ];
  const judgesState = resolveJudgePanelState({
    judgePanel: {
      answered: 1,
      total: 3,
      slots: [{ slot: 'j1', verdict: 'true_positive', status: 'answered' }],
    },
  });

  // -- When --
  const actual = buildProcessLine({
    scanners,
    judgesState,
    hasFindings: false,
  });

  // -- Then --
  assert.match(actual, /Scanners running/);
  assert.match(actual, /1 of 3 judges answered/);
  assert.match(actual, /waiting for findings/);
});

test('GWT-75.1 given includeNarration when buildRunProgressView then processLine attached', () => {
  /**
   * Scenario: Run progress optionally computes narration via pipeline helpers.
   * Slice: GWT-75.1 / GWT-75.6
   */
  // -- Given --
  const scanners = [{ target: 'r', scanner: 'semgrep', status: 'done', candidates: 1, errors: 0 }];
  const judges = {
    answered: 3,
    total: 3,
    slots: [
      { slot: 'j1', verdict: 'true_positive', status: 'answered' },
      { slot: 'j2', verdict: 'true_positive', status: 'answered' },
      { slot: 'j3', verdict: 'true_positive', status: 'answered' },
    ],
  };

  // -- When --
  const view = buildRunProgressView({
    scanners,
    judges,
    includeNarration: true,
    hasFindings: true,
  });

  // -- Then --
  assert.equal(view.judgesSummary, '3 of 3 judges answered');
  assert.ok(typeof view.processLine === 'string' && view.processLine.length > 0);
  assert.match(view.processLine, /Scanners complete/);
  assert.equal(view.primaryCta.label, 'Review findings');
  assert.equal(view.primaryCta.visible, true);
});

// ── GWT-75.2 Final judge and disagreement ────────────────────────────────────

test('GWT-75.2 given panel with disagreement when buildFinalJudgeNarration then verdict and weigh-reasons line', () => {
  /**
   * Scenario: Final verdict + disagreement narration (not vote count alone).
   * Slice: GWT-75.2
   */
  // -- Given --
  const judgesState = resolveJudgePanelState({ panel_run: LIVE_PANEL_RUN });

  // -- When --
  const { finalLine, disagreementLine } = buildFinalJudgeNarration(judgesState);

  // -- Then --
  assert.match(finalLine, /Final verdict: needs_review/);
  assert.match(finalLine, /Confidence below floor/);
  assert.match(finalLine, /gen-27b/);
  assert.match(disagreementLine, /disagreed/i);
  assert.match(disagreementLine, /weighed reasons \(not vote count alone\)/i);
});

test('GWT-75.2 given agreeing judges when buildFinalJudgeNarration then agreement line', () => {
  /**
   * Scenario: Agreement path keeps jargon light.
   * Slice: GWT-75.2
   */
  // -- Given --
  const judgesState = resolveJudgePanelState({
    judgePanel: {
      answered: 3,
      total: 3,
      slots: [
        { slot: 'a', verdict: 'true_positive', status: 'answered' },
        { slot: 'b', verdict: 'true_positive', status: 'answered' },
        { slot: 'c', verdict: 'true_positive', status: 'answered' },
      ],
      disagreement: false,
      finalVerdict: 'true_positive',
      finalReason: 'Consistent true_positive',
      finalModel: 'gen-4b',
    },
  });

  // -- When --
  const { finalLine, disagreementLine } = buildFinalJudgeNarration(judgesState);

  // -- Then --
  assert.match(finalLine, /true_positive/);
  assert.match(disagreementLine, /agreed/i);
});

// ── GWT-75.3 Honest absent / panel-off ───────────────────────────────────────

test('GWT-75.3 given missing panel when resolveJudgePanelState then absent with empty slots', () => {
  /**
   * Scenario: Absent panel does not fabricate three pending slots.
   * Slice: GWT-75.3
   */
  // -- Given / When --
  const actual = resolveJudgePanelState({});

  // -- Then --
  assert.equal(actual.mode, 'absent');
  assert.equal(actual.panelOff, false);
  assert.deepEqual(actual.slots, []);
  assert.equal(actual.answered, 0);
  assert.equal(actual.total, 0);
  assert.equal(actual.statusLine, 'Judge panel pending / not available yet');
});

test('GWT-75.3 given panel opt-in off when resolveJudgePanelState then panelOff with empty slots', () => {
  /**
   * Scenario: Explicit opt-in off is honest and slot-empty.
   * Slice: GWT-75.3
   */
  // -- Given --
  const cases = [
    { judgePanelEnabled: false },
    { panel_status: 'off' },
    { judgePanel: null, judgePanelOptIn: false },
  ];

  for (const data of cases) {
    // -- When --
    const actual = resolveJudgePanelState(data);

    // -- Then --
    assert.equal(actual.mode, 'off', `mode off for ${JSON.stringify(data)}`);
    assert.equal(actual.panelOff, true);
    assert.deepEqual(actual.slots, []);
    assert.equal(actual.total, 0);
    assert.equal(actual.statusLine, 'Judge panel not run (opt-in off)');
  }
});

test('GWT-75.3 given empty judgePanel object when resolve then absent not fabricated', () => {
  /**
   * Scenario: Empty judgePanel {} is absent — no pending slot invention.
   * Slice: GWT-75.3 / GWT-75.5 characterisation
   */
  // -- Given / When --
  const actual = resolveJudgePanelState({ judgePanel: {} });

  // -- Then --
  assert.equal(actual.mode, 'absent');
  assert.deepEqual(actual.slots, []);
});

// ── GWT-75.4 Evidence + coverage honesty ─────────────────────────────────────

test('GWT-75.4 given ledger coverage when resolveCoverageHonesty then source ledger', () => {
  /**
   * Scenario: CLI ledger fields win over item heuristics.
   * Slice: GWT-75.4 / GWT-75.3 coverage honesty
   */
  // -- Given --
  const data = {
    coverage_ledger: { discovered: 10, scanned: 7, failed: 1, skipped: 2 },
    items: [{ status: 'error' }, { status: 'grey' }],
  };

  // -- When --
  const actual = resolveCoverageHonesty(data);

  // -- Then --
  assert.equal(actual.source, 'ledger');
  assert.equal(actual.discovered, 10);
  assert.equal(actual.scanned, 7);
  assert.equal(actual.failed, 1);
  assert.equal(actual.skipped, 2);
});

test('GWT-75.4 given items only when resolveCoverageHonesty then heuristic source', () => {
  /**
   * Scenario: Fallback heuristics are tagged, not silently invented as ledger.
   * Slice: GWT-75.4
   */
  // -- Given --
  const data = {
    items: [
      { status: 'running', lastScan: '2026-09-20' },
      { status: 'error' },
      { status: 'no_coverage' },
      { status: 'ok' },
    ],
  };

  // -- When --
  const actual = resolveCoverageHonesty(data);

  // -- Then --
  assert.equal(actual.source, 'heuristic');
  assert.equal(actual.discovered, 4);
  assert.equal(actual.scanned, 1);
  assert.equal(actual.failed, 1);
  assert.equal(actual.skipped, 1);
});

test('GWT-75.4 given absent fields when honestAbsentCopy then no judge-panel-pending for non-verdict', () => {
  /**
   * Scenario: Attack path / prerequisites / evidence use field-correct copy.
   * Slice: GWT-75.4
   */
  // -- Given / When / Then --
  assert.equal(honestAbsentCopy('attack_path'), 'Not provided by scanner');
  assert.equal(honestAbsentCopy('prerequisites'), 'Not provided by scanner');
  assert.equal(honestAbsentCopy('evidence'), 'Evidence verification not run');
  assert.equal(
    honestAbsentCopy('verdict'),
    'Judgement pending — judge panel fields not present yet',
  );
  assert.equal(honestAbsentCopy('attack_path').includes('judge panel pending'), false);
  assert.equal(honestAbsentCopy('evidence').includes('judge panel pending'), false);
});

test('GWT-75.4 given evidence statuses when formatEvidenceVerification then plain wording', () => {
  /**
   * Scenario: Evidence verification maps to verified / unverified / not run.
   * Slice: GWT-75.4
   */
  // -- Given / When / Then --
  assert.equal(formatEvidenceVerification('verified'), 'verified');
  assert.equal(formatEvidenceVerification('unverified'), 'unverified');
  assert.equal(formatEvidenceVerification('not_run'), 'not run');
  assert.equal(formatEvidenceVerification(null), 'not run');
  assert.equal(formatEvidenceVerification(''), 'not run');
});

// ── GWT-75.5 Live binding characterisation ───────────────────────────────────

test('GWT-75.5 given present judgePanel when resolve then present mode with slots', () => {
  /**
   * Scenario: Characterisation — data present path binds real slots.
   * Slice: GWT-75.5
   */
  // -- Given --
  const data = {
    judgePanel: {
      answered: 1,
      total: 3,
      slots: [{ slot: 'j1', verdict: 'true_positive', status: 'answered' }],
      finalVerdict: 'true_positive',
    },
  };

  // -- When --
  const present = resolveJudgePanelState(data);
  const off = resolveJudgePanelState({ panel_status: 'off' });
  const absent = resolveJudgePanelState(null);

  // -- Then --
  assert.equal(present.mode, 'present');
  assert.equal(present.slots.length, 1);
  assert.equal(off.mode, 'off');
  assert.deepEqual(off.slots, []);
  assert.equal(absent.mode, 'absent');
  assert.deepEqual(absent.slots, []);
});

// ── GWT-75.6 Process line + primary CTA ──────────────────────────────────────

test('GWT-75.6 given scanners complete and findings when buildPrimaryCta then Review findings visible', () => {
  /**
   * Scenario: Primary CTA advances to Triage when ready.
   * Slice: GWT-75.6 / soft-amend 77 (absent panel + findings also unlocks)
   */
  // -- Given / When --
  const ready = buildPrimaryCta({
    scannersComplete: true,
    hasFindings: true,
    panelMode: 'present',
  });
  const panelOffReady = buildPrimaryCta({
    scannersComplete: false,
    hasFindings: true,
    panelMode: 'off',
  });
  const absentEarly = buildPrimaryCta({
    scannersComplete: false,
    hasFindings: true,
    panelMode: 'absent',
  });
  const noFindings = buildPrimaryCta({
    scannersComplete: true,
    hasFindings: false,
    panelMode: 'present',
  });
  const presentStillRunning = buildPrimaryCta({
    scannersComplete: false,
    hasFindings: true,
    panelMode: 'present',
  });

  // -- Then --
  assert.deepEqual(ready, { label: 'Review findings', visible: true });
  assert.deepEqual(panelOffReady, { label: 'Review findings', visible: true });
  assert.equal(absentEarly.visible, true, 'absent panel + findings unlocks early triage');
  assert.equal(noFindings.visible, false);
  assert.equal(presentStillRunning.visible, false, 'present panel still waits for scanners when incomplete');
});

test('GWT-75.6 given explicit processLine when buildRunProgressView then caller value preserved', () => {
  /**
   * Scenario: Callers may pass processLine / primaryCta without includeNarration.
   * Slice: GWT-75.6
   */
  // -- Given / When --
  const view = buildRunProgressView({
    scanners: [],
    judges: { answered: 0, total: 3, slots: [] },
    processLine: 'Custom process',
    primaryCta: { label: 'Review findings', visible: true },
  });

  // -- Then --
  assert.equal(view.processLine, 'Custom process');
  assert.deepEqual(view.primaryCta, { label: 'Review findings', visible: true });
});

// ── GWT-75.7 Investigate first to-fix ───────────────────────────────────────

test('GWT-75.7 given mixed findings when pickFirstToFixFinding then first to_fix', () => {
  /**
   * Scenario: Investigate auto-selects first to-fix when none selected.
   * Slice: GWT-75.7
   */
  // -- Given --
  const findings = [
    { id: 'a', triageStatus: 'dismissed' },
    { id: 'b', triageStatus: 'to_fix' },
    { id: 'c', triageStatus: 'to_fix' },
  ];

  // -- When --
  const actual = pickFirstToFixFinding(findings);

  // -- Then --
  assert.equal(actual?.id, 'b');
});

test('GWT-75.7 given no to_fix when pickFirstToFixFinding then null', () => {
  /**
   * Scenario: Empty selection state only when no eligible findings.
   * Slice: GWT-75.7
   */
  // -- Given / When / Then --
  assert.equal(pickFirstToFixFinding([{ triageStatus: 'needs_review' }]), null);
  assert.equal(pickFirstToFixFinding([]), null);
  assert.equal(pickFirstToFixFinding(null), null);
});

// ── GWT-75.8 Model hints stay truthful ───────────────────────────────────────

test('GWT-75.8 given pipeline and run narration when Fix defaults checked then no gen-27b injection', () => {
  /**
   * Scenario: Pipeline/run helpers must not inject gen-27b into Fix defaults.
   * Slice: GWT-75.8
   */
  // -- Given --
  const view = buildRunProgressView({
    scanners: [{ status: 'done' }],
    judges: { answered: 0, total: 0, slots: [], mode: 'off', panelOff: true },
    includeNarration: true,
    hasFindings: true,
  });

  // -- When --
  const fixHint = defaultModelHintForStep('fix');
  const serialized = JSON.stringify(view);

  // -- Then --
  assert.equal(fixHint, '');
  assert.equal(fixHint.includes('gen-27b'), false);
  assert.equal(serialized.includes('gen-27b'), false);
  assert.equal(view.primaryCta.visible, true);
});

// ── GWT-75.9 Parent target metadata ──────────────────────────────────────────

test('GWT-75.9 given skill finding when formatParentTargetMeta then type · name', () => {
  /**
   * Scenario: Skill findings show parent type and name as text.
   * Slice: GWT-75.9
   */
  // -- Given / When --
  const actual = formatParentTargetMeta({
    itemType: 'skill',
    itemName: 'safe-csv-cleaner',
  });

  // -- Then --
  assert.equal(actual, 'skill · safe-csv-cleaner');
});

test('GWT-75.9 given mcp_server finding when formatParentTargetMeta then type · name', () => {
  /**
   * Scenario: MCP server findings show parent type and name as text.
   * Slice: GWT-75.9
   */
  // -- Given / When / Then --
  assert.equal(
    formatParentTargetMeta({
      itemType: 'mcp_server',
      itemName: 'vuln-command-injection-server',
    }),
    'mcp_server · vuln-command-injection-server',
  );
});

test('GWT-75.9 given package finding when formatParentTargetMeta then type · name', () => {
  /**
   * Scenario: Package findings show parent type and name (or id) as text.
   * Slice: GWT-75.9
   */
  // -- Given / When / Then --
  assert.equal(
    formatParentTargetMeta({ itemType: 'package', itemName: 'lodash' }),
    'package · lodash',
  );
  assert.equal(
    formatParentTargetMeta({ itemType: 'package', itemId: 'pkg-1' }),
    'package · pkg-1',
  );
});

test('GWT-75.9 given missing parent fields when formatParentTargetMeta then empty or best-effort', () => {
  /**
   * Scenario: Missing parent fields do not invent labels.
   * Slice: GWT-75.9
   */
  // -- Given / When / Then --
  assert.equal(formatParentTargetMeta(null), '');
  assert.equal(formatParentTargetMeta({}), '');
  assert.equal(formatParentTargetMeta({ itemName: 'orphan' }), 'orphan');
  assert.equal(formatParentTargetMeta({ itemType: 'skill' }), 'skill');
});

// ── GWT-75.10 Multi-select ───────────────────────────────────────────────────

test('GWT-75.10 given ids when normalizeSelectionIds then unique string ids', () => {
  /**
   * Scenario: Selection state is a normalized array of finding ids.
   * Slice: GWT-75.10
   */
  // -- Given / When / Then --
  assert.deepEqual(normalizeSelectionIds(['a', 'b', 'a', '', null]), ['a', 'b']);
  assert.deepEqual(normalizeSelectionIds(null), []);
  assert.deepEqual(normalizeSelectionIds(undefined), []);
});

test('GWT-75.10 given selection when toggleFindingSelection then single-select replaces prior', () => {
  /**
   * Scenario: Selection is one finding at a time (slice 77 soft-amend of multi-select).
   * Slice: GWT-75.10 / GWT-77.3
   */
  // -- Given --
  const empty = [];

  // -- When --
  const one = toggleFindingSelection(empty, 'f1');
  const two = toggleFindingSelection(one, 'f2');
  const back = toggleFindingSelection(two, 'f2');

  // -- Then --
  assert.deepEqual(one, ['f1']);
  assert.deepEqual(two, ['f2'], 'selecting f2 replaces f1');
  assert.deepEqual(back, [], 'toggling active id clears selection');
});

test('GWT-75.10 given multi selection when selectionProgressLabel then k of N selected', () => {
  /**
   * Scenario: Progress label shows k of N when N>1; empty when single/none.
   * Slice: GWT-75.10
   */
  // -- Given / When / Then --
  assert.equal(
    selectionProgressLabel({ selectedIds: ['a', 'b', 'c'], activeId: 'b' }),
    '2 of 3 selected',
  );
  assert.equal(
    selectionProgressLabel({ selectedIds: ['a', 'b', 'c'], activeId: 'a' }),
    '1 of 3 selected',
  );
  assert.equal(selectionProgressLabel({ selectedIds: ['a'], activeId: 'a' }), '');
  assert.equal(selectionProgressLabel({ selectedIds: [], activeId: null }), '');
});
