/**
 * Tests for slice-68 workflow modules (stepper / run / triage / investigate / prefs).
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-68.1 stepper stateLabels; GWT-68.2 judgesSummary; GWT-68.3 triage
 *   headline / filter / severity (split); GWT-68.4 investigate section order +
 *   source_sink + how_we_decided null cases; GWT-68.5 simple vs expert raw IDs +
 *   storage isolation; GWT-68.6 triage persistence; Gate-4 edge paths
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKFLOW_STEPS,
  buildStepperView,
} from '../tripwire-workflow-stepper.js';
import { buildRunProgressView } from '../tripwire-run-progress.js';
import { buildTriageView } from '../tripwire-triage.js';
import { buildInvestigateView } from '../tripwire-investigate.js';
import {
  loadExpertMode,
  saveExpertMode,
  stableFindingId,
  loadTriageDecision,
  saveTriageDecision,
  applyPersistedTriage,
} from '../tripwire-workflow-prefs.js';

/** In-memory Storage mock for prefs (session/local). */
function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

const SAMPLE_FINDING = {
  id: 'f-sqli-1',
  title: 'SQL injection in login',
  severity: 'High',
  triageStatus: 'to_fix',
  evidenceHighlight: 'query = "SELECT * FROM users WHERE id=" + id',
  source: 'login.js:42',
  sink: 'db.query',
  explanation: 'User input reaches a raw SQL string.',
  verdictLine: 'Likely exploitable with crafted id.',
  attackPath: 'HTTP param → string concat → SQL',
  prerequisites: 'Reachable login endpoint',
  evidenceVerification: 'Confirmed in unit fixture',
  howWeDecided: {
    judges: [{ slot: 'j1', verdict: 'true_positive' }],
    final: 'true_positive',
    rawIds: ['judge-raw-aaa', 'judge-raw-bbb'],
  },
  agreement: '2 of 3 agree',
};

const EXPECTED_INVESTIGATE_SECTION_IDS = [
  'title_severity',
  'evidence',
  'source_sink',
  'explanation',
  'verdict',
  'attack_path',
  'prerequisites',
  'evidence_verification',
  'how_we_decided',
];

// ── GWT-68.1 Stepper ─────────────────────────────────────────────────────────

test('GWT-68.1 given workflow run when buildStepperView then six steps with text stateLabels', () => {
  // -- Given --
  const currentStep = 'triage';

  // -- When --
  const { steps } = buildStepperView({ currentStep });

  // -- Then --
  assert.equal(WORKFLOW_STEPS.length, 6, 'WORKFLOW_STEPS must list all six workflow stages');
  assert.equal(steps.length, 6, 'stepper view must always expose six steps');
  assert.deepEqual(
    steps.map((s) => s.id),
    ['run', 'triage', 'investigate', 'fix', 'verify', 'report'],
    'step order must be Run → Triage → Investigate → Fix → Verify → Report'
  );

  const current = steps.find((s) => s.id === 'triage');
  const previous = steps.find((s) => s.id === 'run');
  const upcoming = steps.find((s) => s.id === 'investigate');

  assert.equal(current.current, true);
  assert.equal(current.stateLabel, 'current', 'current step must carry text stateLabel, not colour-only');
  assert.equal(previous.stateLabel, 'complete', 'prior steps must be labelled complete');
  assert.equal(upcoming.stateLabel, 'upcoming');
  assert.ok(
    steps.every((s) => typeof s.stateLabel === 'string' && s.stateLabel.length > 0),
    'every step must expose a non-empty stateLabel (never colour-only status)'
  );
});

test('GWT-68.1 given run as current when buildStepperView then only run is current', () => {
  // -- Given / When --
  const { steps } = buildStepperView({ currentStep: 'run' });

  // -- Then --
  assert.equal(steps.filter((s) => s.current).length, 1);
  assert.equal(steps[0].stateLabel, 'current');
  assert.ok(steps.slice(1).every((s) => s.stateLabel === 'upcoming'));
});

// ── GWT-68.2 Run progress ────────────────────────────────────────────────────

test('GWT-68.2 given scanners and partial judges when buildRunProgressView then judgesSummary N of M', () => {
  // -- Given --
  const scanners = [
    {
      target: 'repo-a',
      scanner: 'semgrep',
      status: 'running',
      candidates: 2,
      errors: 0,
    },
    {
      target: 'repo-a',
      scanner: 'codeql',
      status: 'done',
      candidates: 1,
      errors: 0,
    },
  ];
  const judges = {
    answered: 1,
    total: 3,
    slots: [
      { slot: 'j1', verdict: 'true_positive', confidence: 0.9, status: 'answered' },
      { slot: 'j2', verdict: null, confidence: null, status: 'pending' },
      { slot: 'j3', verdict: null, confidence: null, status: 'pending' },
    ],
  };

  // -- When --
  const view = buildRunProgressView({ scanners, judges });

  // -- Then --
  assert.equal(view.judgesSummary, '1 of 3 judges answered');
  assert.equal(view.scannerRows.length, 2, 'each scanner action becomes a row');
  assert.equal(view.scannerRows[0].scanner, 'semgrep');
  assert.equal(view.scannerRows[0].status, 'running');
  assert.equal(view.judgeSlots.length, 3);
});

// ── GWT-68.3 Triage ──────────────────────────────────────────────────────────

const MIXED_TRIAGE_FINDINGS = [
  { id: 'a', title: 'Low noise', severity: 'Low', triageStatus: 'dismissed' },
  { id: 'b', title: 'High bug', severity: 'High', triageStatus: 'to_fix' },
  { id: 'c', title: 'Med review', severity: 'Medium', triageStatus: 'needs_review' },
  { id: 'd', title: 'High too', severity: 'High', triageStatus: 'to_fix' },
];

test('GWT-68.3 given mixed findings when buildTriageView then headline and coverageHonesty', () => {
  // -- Given --
  const coverage = { discovered: 10, scanned: 8, failed: 1, skipped: 1 };

  // -- When --
  const allView = buildTriageView({
    findings: MIXED_TRIAGE_FINDINGS,
    coverage,
    triageFilter: 'all',
  });

  // -- Then --
  assert.match(
    String(allView.headline),
    /to[_ -]?fix/i,
    'headline must summarise to_fix counts'
  );
  assert.match(String(allView.headline), /needs[_ -]?review/i);
  assert.match(String(allView.headline), /dismissed/i);
  assert.match(String(allView.headline), /2/, 'two to_fix findings');
  assert.match(String(allView.headline), /1/, 'one needs_review and one dismissed');

  assert.ok(allView.coverageHonesty, 'coverageHonesty section required');
  const honesty = JSON.stringify(allView.coverageHonesty);
  assert.match(honesty, /10|discovered/i);
  assert.match(honesty, /8|scanned/i);
  assert.match(honesty, /1|failed/i);
  assert.match(honesty, /1|skipped/i);
});

test('GWT-68.3 given mixed findings when triageFilter to_fix then only matching rows', () => {
  // -- Given --
  const findings = MIXED_TRIAGE_FINDINGS;

  // -- When --
  const fixView = buildTriageView({ findings, triageFilter: 'to_fix' });

  // -- Then --
  assert.equal(fixView.filteredFindings.length, 2, 'to_fix filter keeps only actionable rows');
  assert.ok(
    fixView.filteredFindings.every((f) => f.triageStatus === 'to_fix'),
    'filtered findings must match triageFilter'
  );
});

test('GWT-68.3 given mixed findings when buildTriageView all then severity High Medium Low', () => {
  // -- Given --
  const findings = MIXED_TRIAGE_FINDINGS;

  // -- When --
  const allView = buildTriageView({ findings, triageFilter: 'all' });

  // -- Then --
  const severities = allView.filteredFindings.map((f) => f.severity);
  assert.deepEqual(
    severities,
    ['High', 'High', 'Medium', 'Low'],
    'tabs/list must sort by severity High → Medium → Low'
  );
});

// ── GWT-68.4 Investigate ─────────────────────────────────────────────────────

test('GWT-68.4 given selected finding when buildInvestigateView then ordered sections and how_we_decided collapsed', () => {
  // -- Given --
  const finding = SAMPLE_FINDING;

  // -- When --
  const view = buildInvestigateView({ finding, expertMode: true });

  // -- Then --
  assert.deepEqual(
    view.sections.map((s) => s.id),
    EXPECTED_INVESTIGATE_SECTION_IDS,
    'investigate section order must match product spec'
  );

  const how = view.sections.find((s) => s.id === 'how_we_decided');
  assert.ok(how, 'how_we_decided section must exist');
  assert.equal(how.collapsed, true, 'How we decided must be collapsed by default');
});

const SOURCE_SINK_CASES = [
  {
    name: 'source only',
    finding: { title: 'Src', source: 'login.js:1' },
    expectPresent: true,
    bodyMatch: /Source:/,
  },
  {
    name: 'sink only',
    finding: { title: 'Snk', sink: 'db.query' },
    expectPresent: true,
    bodyMatch: /Sink:/,
  },
  {
    name: 'neither',
    finding: { title: 'None', explanation: 'no flow' },
    expectPresent: false,
    bodyMatch: null,
  },
];

for (const tc of SOURCE_SINK_CASES) {
  test(`GWT-68.4 given ${tc.name} when buildInvestigateView then source_sink ${tc.expectPresent ? 'present' : 'absent'}`, () => {
    // -- Given / When --
    const view = buildInvestigateView({ finding: tc.finding, expertMode: false });
    const section = view.sections.find((s) => s.id === 'source_sink');

    // -- Then --
    assert.equal(Boolean(section), tc.expectPresent, `source_sink for ${tc.name}`);
    if (tc.expectPresent) {
      assert.match(section.body, tc.bodyMatch);
    }
  });
}

const HOW_WE_DECIDED_NULL_CASES = [
  {
    name: 'expertMode false + howWeDecided null + no agreement',
    finding: { title: 'A', severity: 'High', howWeDecided: null },
    expertMode: false,
    expectPresent: false,
  },
  {
    name: 'expertMode false + howWeDecided null + agreement',
    finding: { title: 'B', severity: 'High', howWeDecided: null, agreement: '2 of 3' },
    expertMode: false,
    expectPresent: true,
  },
  {
    name: 'expertMode true + howWeDecided null',
    finding: { title: 'C', severity: 'High', howWeDecided: null, agreement: '2 of 3' },
    expertMode: true,
    expectPresent: false,
  },
  {
    name: 'expertMode true + empty howWeDecided object',
    finding: { title: 'D', severity: 'High', howWeDecided: {} },
    expertMode: true,
    expectPresent: true,
  },
];

for (const tc of HOW_WE_DECIDED_NULL_CASES) {
  test(`GWT-68.4 given ${tc.name} when buildInvestigateView then how_we_decided ${tc.expectPresent ? 'present' : 'absent'}`, () => {
    // -- Given / When --
    const view = buildInvestigateView({ finding: tc.finding, expertMode: tc.expertMode });
    const how = view.sections.find((s) => s.id === 'how_we_decided');

    // -- Then --
    assert.equal(Boolean(how), tc.expectPresent, tc.name);
  });
}

// ── GWT-68.5 Simple view ─────────────────────────────────────────────────────

test('GWT-68.5 given expertMode false when buildInvestigateView then raw IDs hidden via hiddenInSimple', () => {
  // -- Given --
  const finding = SAMPLE_FINDING;

  // -- When --
  const simple = buildInvestigateView({ finding, expertMode: false });

  // -- Then --
  assert.ok(Array.isArray(simple.hiddenInSimple), 'hiddenInSimple must be populated in simple mode');
  assert.ok(simple.hiddenInSimple.length > 0, 'simple mode must list hidden jargon/raw ID keys');

  const simpleBlob = JSON.stringify(simple.sections);
  assert.equal(
    simpleBlob.includes('judge-raw-aaa'),
    false,
    'raw judge IDs must not appear in visible simple sections'
  );
  assert.equal(
    simpleBlob.includes('judge-raw-bbb'),
    false,
    'raw judge IDs must not appear in visible simple sections'
  );

  assert.match(simpleBlob, /High|Medium|Low|SQL injection/i, 'severity and title remain in simple');
  assert.match(simpleBlob, /2 of 3 agree|agreement|Likely exploitable/i, 'agreement/verdict remain');
});

test('GWT-68.5 given expertMode true when buildInvestigateView then raw judge IDs appear in how_we_decided', () => {
  // -- Given --
  const finding = SAMPLE_FINDING;

  // -- When --
  const expert = buildInvestigateView({ finding, expertMode: true });

  // -- Then --
  assert.deepEqual(expert.hiddenInSimple, [], 'expert mode leaves hiddenInSimple empty');
  const how = expert.sections.find((s) => s.id === 'how_we_decided');
  assert.ok(how, 'how_we_decided required in expert mode');
  assert.match(how.body, /judge-raw-aaa/);
  assert.match(how.body, /judge-raw-bbb/);
  assert.match(how.body, /Raw IDs:/);
});

test('GWT-68.5 given default prefs when loadExpertMode then simple (false)', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  const actual = loadExpertMode(storage);

  // -- Then --
  assert.equal(actual, false, 'Simple view is the default (expertMode off)');
});

test('GWT-68.5 given separate stores when expert and triage prefs then keys stay isolated', () => {
  // -- Given --
  const expertStore = createMemoryStorage();
  const triageStore = createMemoryStorage();

  // -- When --
  saveExpertMode(true, expertStore);
  saveTriageDecision('f-iso-1', 'dismissed', triageStore);

  // -- Then --
  assert.equal(expertStore.getItem('tripwire-expert-mode'), 'true');
  assert.equal(triageStore.getItem('tripwire-triage:f-iso-1'), 'dismissed');
  assert.equal(
    expertStore.getItem('tripwire-triage:f-iso-1'),
    null,
    'expert session-like store must not hold triage keys'
  );
  assert.equal(
    triageStore.getItem('tripwire-expert-mode'),
    null,
    'triage store must not hold expert-mode key'
  );
  assert.equal(loadExpertMode(triageStore), false);
  assert.equal(loadTriageDecision('f-iso-1', expertStore), null);
});

// ── GWT-68.6 Triage persistence ───────────────────────────────────────────────

test('GWT-68.6 given stable id when saveTriageDecision then loadTriageDecision returns status', () => {
  // -- Given --
  const storage = createMemoryStorage();
  const finding = { id: 'stable-42', title: 'XSS', severity: 'High' };
  const id = stableFindingId(finding);

  // -- When --
  saveTriageDecision(id, 'dismissed', storage);
  const loaded = loadTriageDecision(id, storage);

  // -- Then --
  assert.equal(id, 'stable-42', 'stableFindingId prefers finding.id when present');
  assert.equal(loaded, 'dismissed');
});

test('GWT-68.6 given findings without id when stableFindingId then deterministic hash key', () => {
  // -- Given --
  const finding = {
    title: 'Path traversal',
    severity: 'Medium',
    evidenceHighlight: '../etc/passwd',
  };

  // -- When --
  const a = stableFindingId(finding);
  const b = stableFindingId({ ...finding });

  // -- Then --
  assert.equal(typeof a, 'string');
  assert.ok(a.length > 0);
  assert.equal(a, b, 'same title+severity+evidence must yield the same stable id');
});

test('GWT-68.6 given persisted statuses when applyPersistedTriage then overlays by stable id', () => {
  // -- Given --
  const storage = createMemoryStorage();
  const findings = [
    { id: 'f1', title: 'A', severity: 'High', triageStatus: 'needs_review' },
    { id: 'f2', title: 'B', severity: 'Low', triageStatus: 'to_fix' },
  ];
  saveTriageDecision('f1', 'dismissed', storage);
  saveTriageDecision('f2', 'to_fix', storage);

  // -- When --
  const overlaid = applyPersistedTriage(findings, storage);

  // -- Then --
  assert.equal(overlaid.find((f) => f.id === 'f1').triageStatus, 'dismissed');
  assert.equal(overlaid.find((f) => f.id === 'f2').triageStatus, 'to_fix');
});

test('GWT-68.6 given expert toggle when saveExpertMode then loadExpertMode round-trips', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  saveExpertMode(true, storage);
  const on = loadExpertMode(storage);
  saveExpertMode(false, storage);
  const off = loadExpertMode(storage);

  // -- Then --
  assert.equal(on, true);
  assert.equal(off, false);
});

// ── Gate 4 edge / error paths ────────────────────────────────────────────────

test('edge: given malformed finding null or empty object when buildInvestigateView then empty or minimal sections', () => {
  // -- Given / When --
  const fromNull = buildInvestigateView({ finding: null });
  const fromEmpty = buildInvestigateView({ finding: {} });

  // -- Then --
  assert.deepEqual(fromNull.sections, []);
  assert.deepEqual(fromEmpty.sections, []);
  assert.deepEqual(fromNull.hiddenInSimple, []);
});

test('edge: given invalid triageFilter string when buildTriageView then no matching findings', () => {
  // -- Given --
  const findings = [
    { id: '1', severity: 'High', triageStatus: 'to_fix' },
    { id: '2', severity: 'Low', triageStatus: 'dismissed' },
  ];

  // -- When --
  const view = buildTriageView({ findings, triageFilter: 'not-a-real-tab' });

  // -- Then --
  assert.equal(view.filteredFindings.length, 0);
  assert.equal(view.tabs.every((t) => t.selected === false), true);
});

test('edge: given storage getItem throws when loadExpertMode and loadTriageDecision then safe defaults', () => {
  // -- Given --
  const throwing = {
    getItem() {
      throw new Error('quota exceeded');
    },
    setItem() {},
  };

  // -- When / Then --
  assert.equal(loadExpertMode(throwing), false);
  assert.equal(loadTriageDecision('any', throwing), null);
});

test('edge: given storage getItem returns garbage when loadExpertMode then false', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-expert-mode', '{not-json');

  // -- When --
  const actual = loadExpertMode(storage);

  // -- Then --
  assert.equal(actual, false);
});

test('edge: given empty scanners and missing judges when buildRunProgressView then 0 of 3', () => {
  // -- Given / When --
  const view = buildRunProgressView({ scanners: [], judges: undefined });

  // -- Then --
  assert.deepEqual(view.scannerRows, []);
  assert.equal(view.judgesSummary, '0 of 3 judges answered');
  assert.deepEqual(view.judgeSlots, []);
});
