/**
 * Branch-coverage probes for slice-68 workflow modules.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: null/empty/default branches in run-progress, triage, investigate, prefs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

// ── run-progress: null/empty scanners, missing judges fields ─────────────────

test('coverage: buildRunProgressView with no args uses empty scanners and default judges', () => {
  // -- Given / When --
  const view = buildRunProgressView();

  // -- Then --
  assert.deepEqual(view.scannerRows, []);
  assert.equal(view.judgesSummary, '0 of 3 judges answered');
  assert.deepEqual(view.judgeSlots, []);
});

test('coverage: buildRunProgressView normalizes null scanner rows and sparse fields', () => {
  // -- Given --
  const scanners = [null, undefined, {}];

  // -- When --
  const view = buildRunProgressView({ scanners, judges: null });

  // -- Then --
  assert.equal(view.scannerRows.length, 3);
  assert.deepEqual(view.scannerRows[0], {
    target: '',
    scanner: '',
    status: '',
    candidates: 0,
    errors: 0,
  });
  assert.equal(view.judgesSummary, '0 of 3 judges answered');
  assert.deepEqual(view.judgeSlots, []);
});

test('coverage: buildRunProgressView fills missing judge slot fields', () => {
  // -- Given --
  const judges = {
    slots: [null, {}],
  };

  // -- When --
  const view = buildRunProgressView({ scanners: undefined, judges });

  // -- Then --
  assert.equal(view.judgesSummary, '0 of 3 judges answered');
  assert.equal(view.judgeSlots.length, 2);
  assert.deepEqual(view.judgeSlots[0], {
    slot: '',
    verdict: '',
    confidence: null,
    status: '',
  });
  assert.deepEqual(view.judgeSlots[1], {
    slot: '',
    verdict: '',
    confidence: null,
    status: '',
  });
});

test('coverage: buildRunProgressView uses answered/total when provided without slots', () => {
  // -- Given / When --
  const view = buildRunProgressView({
    scanners: [],
    judges: { answered: 2, total: 5 },
  });

  // -- Then --
  assert.equal(view.judgesSummary, '2 of 5 judges answered');
  assert.deepEqual(view.judgeSlots, []);
});

// ── investigate: missing source/sink, expertMode, empty fields ───────────────

test('coverage: buildInvestigateView omits source_sink when both missing', () => {
  // -- Given --
  const finding = {
    title: 'XSS',
    severity: 'High',
    explanation: 'reflected',
  };

  // -- When --
  const view = buildInvestigateView({ finding, expertMode: false });

  // -- Then --
  assert.equal(
    view.sections.some((s) => s.id === 'source_sink'),
    false,
    'source_sink must be omitted when source and sink are empty'
  );
});

test('coverage: buildInvestigateView includes source-only or sink-only', () => {
  // -- Given / When --
  const sourceOnly = buildInvestigateView({
    finding: { title: 'A', source: 'src.js:1' },
  });
  const sinkOnly = buildInvestigateView({
    finding: { title: 'B', sink: 'sink()' },
  });

  // -- Then --
  assert.ok(sourceOnly.sections.some((s) => s.id === 'source_sink'));
  assert.match(sourceOnly.sections.find((s) => s.id === 'source_sink').body, /Source:/);
  assert.ok(sinkOnly.sections.some((s) => s.id === 'source_sink'));
  assert.match(sinkOnly.sections.find((s) => s.id === 'source_sink').body, /Sink:/);
});

test('coverage: buildInvestigateView expertMode formats judges string and rawIds variants', () => {
  // -- Given --
  const finding = {
    title: 'Path traversal',
    severity: 'Medium',
    howWeDecided: {
      final: 'true_positive',
      judges: 'j1=tp',
      rawIds: 'raw-as-string',
    },
  };

  // -- When --
  const expert = buildInvestigateView({ finding, expertMode: true });
  const expertObjRaw = buildInvestigateView({
    finding: {
      title: 'X',
      howWeDecided: {
        judges: { a: 1 },
        rawIds: { id: 9 },
      },
    },
    expertMode: true,
  });

  // -- Then --
  const how = expert.sections.find((s) => s.id === 'how_we_decided');
  assert.ok(how);
  assert.match(how.body, /Final: true_positive/);
  assert.match(how.body, /Judges: j1=tp/);
  assert.match(how.body, /Raw IDs: raw-as-string/);

  const howObj = expertObjRaw.sections.find((s) => s.id === 'how_we_decided');
  assert.match(howObj.body, /Judges: \{/);
  assert.match(howObj.body, /Raw IDs: \{/);
});

test('coverage: buildInvestigateView hasText accepts non-string values', () => {
  // -- Given --
  const finding = {
    title: 42,
    severity: 'Low',
    agreement: 1,
  };

  // -- When --
  const view = buildInvestigateView({ finding, expertMode: false });

  // -- Then --
  const title = view.sections.find((s) => s.id === 'title_severity');
  assert.ok(title);
  assert.match(title.body, /42/);
  assert.match(title.body, /Agreement: 1/);
});

test('coverage: buildInvestigateView with null finding and empty strings skips empty sections', () => {
  // -- Given / When --
  const empty = buildInvestigateView({ finding: null });
  const blanks = buildInvestigateView({
    finding: {
      title: '   ',
      evidenceHighlight: '',
      explanation: null,
      howWeDecided: undefined,
    },
    expertMode: false,
  });

  // -- Then --
  assert.deepEqual(empty.sections, []);
  assert.equal(
    blanks.sections.some((s) => s.id === 'title_severity'),
    false,
    'whitespace-only title must not create a section'
  );
  assert.equal(blanks.hiddenInSimple.length, 0);
});

test('coverage: buildInvestigateView simple mode includes how_we_decided from agreement alone', () => {
  // -- Given --
  const finding = {
    title: 'Auth bypass',
    severity: 'High',
    agreement: '3 of 3',
  };

  // -- When --
  const view = buildInvestigateView({ finding, expertMode: false });

  // -- Then --
  const how = view.sections.find((s) => s.id === 'how_we_decided');
  assert.ok(how, 'agreement alone should surface how_we_decided in simple mode');
  assert.match(how.body, /Agreement: 3 of 3/);
  assert.deepEqual(view.hiddenInSimple, ['how_we_decided']);
});

// ── triage: empty findings, unknown severity, each filter tab ────────────────

test('coverage: buildTriageView with empty and null findings', () => {
  // -- Given / When --
  const empty = buildTriageView({ findings: [] });
  const missing = buildTriageView({});
  const nullFindings = buildTriageView({ findings: null });

  // -- Then --
  assert.match(empty.headline, /0 to-fix/);
  assert.equal(empty.filteredFindings.length, 0);
  assert.equal(missing.filteredFindings.length, 0);
  assert.equal(nullFindings.filteredFindings.length, 0);
});

test('coverage: buildTriageView sorts unknown severity last and ignores unknown status', () => {
  // -- Given --
  const findings = [
    { id: '1', severity: 'weird', triageStatus: 'to_fix' },
    { id: '2', severity: null, triageStatus: 'to_fix' },
    { id: '3', severity: 'High', triageStatus: 'mystery' },
    { id: '4', severity: 'Medium', triageStatus: 'needs_review' },
  ];

  // -- When --
  const view = buildTriageView({ findings, triageFilter: 'all' });

  // -- Then --
  assert.equal(view.filteredFindings[0].severity, 'High');
  assert.equal(view.filteredFindings[1].severity, 'Medium');
  assert.match(view.headline, /2 to-fix/);
  assert.match(view.headline, /1 needs-review/);
  assert.match(view.headline, /0 dismissed/);
  const allTab = view.tabs.find((t) => t.id === 'all');
  assert.equal(allTab.count, 3, 'mystery status must not inflate known-status tab counts');
});

test('coverage: buildTriageView exercises each filter tab and non-array findings', () => {
  // -- Given --
  const findings = [
    { id: 'a', severity: 'High', triageStatus: 'to_fix' },
    { id: 'b', severity: 'Low', triageStatus: 'needs_review' },
    { id: 'c', severity: 'Medium', triageStatus: 'dismissed' },
  ];

  // -- When --
  const all = buildTriageView({ findings, triageFilter: null });
  const fix = buildTriageView({ findings, triageFilter: 'to_fix' });
  const review = buildTriageView({ findings, triageFilter: 'needs_review' });
  const dismissed = buildTriageView({ findings, triageFilter: 'dismissed' });
  // Non-array but iterable: exercises filterAndSort Array.isArray fallback without
  // throwing in countByStatus (object literals are not iterable).
  const nonArray = buildTriageView({ findings: 'xy', triageFilter: 'all' });

  // -- Then --
  assert.equal(all.tabs.find((t) => t.id === 'all').selected, true);
  assert.equal(fix.filteredFindings.length, 1);
  assert.equal(fix.tabs.find((t) => t.id === 'to_fix').selected, true);
  assert.equal(review.filteredFindings[0].id, 'b');
  assert.equal(dismissed.filteredFindings[0].id, 'c');
  assert.deepEqual(nonArray.filteredFindings, []);
});

test('coverage: buildTriageView coverageHonesty defaults and coerces invalid numbers', () => {
  // -- Given / When --
  const missing = buildTriageView({ coverage: null });
  const bad = buildTriageView({
    coverage: { discovered: 'x', scanned: undefined, failed: null, skipped: '' },
  });

  // -- Then --
  assert.deepEqual(missing.coverageHonesty, {
    discovered: 0,
    scanned: 0,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(bad.coverageHonesty, {
    discovered: 0,
    scanned: 0,
    failed: 0,
    skipped: 0,
  });
});

// ── prefs: missing storage, invalid values, no id, apply with nothing ────────

test('coverage: prefs no-ops when storage is missing', () => {
  // -- Given / When --
  const loaded = loadExpertMode(undefined);
  saveExpertMode(true, undefined);
  saveExpertMode(true, {});
  const decision = loadTriageDecision('x', undefined);
  saveTriageDecision('x', 'dismissed', undefined);
  saveTriageDecision('', 'dismissed', createMemoryStorage());
  const emptyId = loadTriageDecision('', createMemoryStorage());
  const nullId = loadTriageDecision(null, createMemoryStorage());

  // -- Then --
  assert.equal(loaded, false);
  assert.equal(decision, null);
  assert.equal(emptyId, null);
  assert.equal(nullId, null);
});

test('coverage: stableFindingId falls back when id empty or missing fields', () => {
  // -- Given / When --
  const emptyId = stableFindingId({ id: '', title: 'T', severity: 'High', evidenceHighlight: 'e' });
  const noFields = stableFindingId(null);
  const partial = stableFindingId({ title: 'Only title' });

  // -- Then --
  assert.match(emptyId, /^gen:[0-9a-f]{8}$/);
  assert.match(noFields, /^gen:[0-9a-f]{8}$/);
  assert.match(partial, /^gen:[0-9a-f]{8}$/);
  assert.notEqual(emptyId, noFields);
});

test('coverage: applyPersistedTriage with null findings and no persisted decisions', () => {
  // -- Given --
  const storage = createMemoryStorage();
  const findings = [
    { id: 'keep', title: 'A', triageStatus: 'to_fix' },
    { title: 'No id', severity: 'Low', evidenceHighlight: 'x', triageStatus: 'needs_review' },
  ];

  // -- When --
  const fromNull = applyPersistedTriage(null, storage);
  const unchanged = applyPersistedTriage(findings, storage);
  const noStorage = applyPersistedTriage(findings, undefined);

  // -- Then --
  assert.deepEqual(fromNull, []);
  assert.equal(unchanged[0].triageStatus, 'to_fix');
  assert.equal(unchanged[1].triageStatus, 'needs_review');
  assert.equal(noStorage[0].triageStatus, 'to_fix');
});

test('coverage: loadExpertMode rejects non-true storage values', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-expert-mode', 'yes');

  // -- When --
  const actual = loadExpertMode(storage);

  // -- Then --
  assert.equal(actual, false);
});
