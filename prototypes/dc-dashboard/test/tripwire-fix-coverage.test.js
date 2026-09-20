/**
 * Branch-coverage probes for slice-69 fix propose / apply-clean / controls.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-69.* remaining branches — null storage, clamp nav,
 *   fingerprint mismatch, empty findings, generateFn fallback, heuristic gaps
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFixCandidate,
  buildProposedFix,
  buildFixProposeView,
} from '../tripwire-fix-propose.js';
import {
  evaluateApplyClean,
  createMemoryApplyPort,
} from '../tripwire-apply-clean.js';
import {
  markFixed,
  markWontFix,
  loadFixDecision,
  applyPersistedFixDecisions,
  navigateFix,
  buildFixProgress,
} from '../tripwire-fix-controls.js';

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

/** Port that mutates the approved fingerprint after apply — contract-violation path. */
function createFingerprintMismatchPort() {
  const calls = { applyPatch: [] };
  let fingerprintN = 0;
  return {
    calls,
    snapshotApprovedRepo() {
      return 'snap-mismatch';
    },
    createTempCopy() {
      return '/tmp/mismatch-temp';
    },
    applyPatch(tempPath, patch) {
      calls.applyPatch.push({ tempPath, patch });
      return { ok: true };
    },
    cleanup() {},
    approvedRepoFingerprint() {
      fingerprintN += 1;
      return fingerprintN === 1 ? 'fp-before' : 'fp-after';
    },
  };
}

const APPROVED_REPO_PATH = '/approved/repo';
const MINIMAL_UNIFIED_DIFF = '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n';

function truePositiveFinding(overrides = {}) {
  return {
    id: 'f-cov-1',
    title: 'Path traversal',
    source: 'read.js:9',
    evidenceHighlight: 'fs.readFile(userPath)',
    evidenceVerification: 'verified',
    howWeDecided: { final: 'true_positive' },
    ...overrides,
  };
}

// ── GWT-69.1 remaining propose branches ──────────────────────────────────────

test('GWT-69.1 given empty proposedPatch unifiedDiff when buildProposedFix then heuristic source', () => {
  // -- Given --
  const finding = truePositiveFinding({
    proposedPatch: { unifiedDiff: '   ', patchClass: 'root_cause' },
  });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(actual.source, 'heuristic', 'whitespace-only provided unifiedDiff must fall through to heuristic');
});

test('GWT-69.1 given generateFn that is not a function when buildProposedFix then heuristic source', () => {
  // -- Given --
  const finding = truePositiveFinding();

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: 'not-a-fn' });

  // -- Then --
  assert.equal(actual.source, 'heuristic', 'non-function generateFn must be ignored');
});

test('GWT-69.1 given generateFn returning null when buildProposedFix then heuristic source', () => {
  // -- Given --
  const finding = truePositiveFinding();

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: () => null });

  // -- Then --
  assert.equal(actual.source, 'heuristic', 'null generateFn result must fall through to heuristic');
});

test('GWT-69.1 given generateFn returning a string when buildProposedFix then heuristic source', () => {
  // -- Given --
  const finding = truePositiveFinding();

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: () => '+++ not an object' });

  // -- Then --
  assert.equal(actual.source, 'heuristic', 'non-object generateFn result must fall through to heuristic');
});

test('GWT-69.1 given finding without source when buildProposedFix then heuristic targets finding-target', () => {
  // -- Given --
  const finding = truePositiveFinding({ source: '', evidenceHighlight: 'eval(input)' });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.unifiedDiff,
    /--- a\/finding-target/,
    'missing source path must use the finding-target placeholder file'
  );
});

test('GWT-69.1 given finding without evidence when buildProposedFix then heuristic uses placeholder line', () => {
  // -- Given --
  const finding = truePositiveFinding({ evidenceHighlight: '', source: 'app.js' });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.unifiedDiff,
    /\/\* vulnerable pattern \*\//,
    'missing evidenceHighlight must still emit a minimal placeholder hunk'
  );
});

test('GWT-69.1 given explanation when buildProposedFix heuristic then rootCause is the explanation', () => {
  // -- Given --
  const finding = truePositiveFinding({ explanation: 'User path reaches fs.readFile.' });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(
    actual.rootCause,
    'User path reaches fs.readFile.',
    'heuristic rootCause must prefer finding.explanation'
  );
});

test('GWT-69.1 given evidence and no explanation when buildProposedFix then rootCause cites source', () => {
  // -- Given --
  const finding = truePositiveFinding({ explanation: '' });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.rootCause,
    /read\.js:9/,
    'heuristic rootCause must cite source when explanation is empty'
  );
});

test('GWT-69.1 given no title explanation or evidence when buildProposedFix then default rootCause', () => {
  // -- Given --
  const finding = { howWeDecided: { final: 'true_positive' } };

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(
    actual.rootCause,
    'Heuristic quick patch from finding metadata.',
    'bare true_positive must still produce a heuristic rootCause string'
  );
});

test('GWT-69.1 given id and no title when buildProposedFix then regressionTest uses id', () => {
  // -- Given --
  const finding = {
    id: 'bare-id',
    source: 'x.js',
    howWeDecided: { final: 'true_positive' },
  };

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(actual.regressionTest, /bare-id/, 'regression suggestion must fall back to finding.id');
});

test('GWT-69.1 given source without line number when buildProposedFix then file name is kept', () => {
  // -- Given --
  const finding = truePositiveFinding({ source: 'plain-file.js' });

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.unifiedDiff,
    /--- a\/plain-file\.js/,
    'source without :line must be used as the heuristic file path'
  );
});

test('GWT-69.1 given missing proposedFix when buildFixProposeView then claimedFixed is still false', () => {
  // -- Given --
  const finding = truePositiveFinding();

  // -- When --
  const actual = buildFixProposeView({ finding });

  // -- Then --
  assert.equal(actual.claimedFixed, false, 'view must not claim fixed when proposedFix is omitted');
});

test('GWT-69.1 given inbound claimedFixed true when buildFixProposeView then claimedFixed is false', () => {
  // -- Given --
  const proposedFix = {
    unifiedDiff: MINIMAL_UNIFIED_DIFF,
    patchClass: 'root_cause',
    claimedFixed: true,
    verificationStatus: 'verified',
    regressionTest: 'x',
  };

  // -- When --
  const actual = buildFixProposeView({ finding: truePositiveFinding(), proposedFix });

  // -- Then --
  assert.equal(
    actual.claimedFixed,
    false,
    'view must overwrite inbound claimedFixed — generation cannot claim fixed'
  );
});

test('GWT-69.1 given source and sink when buildFixProposeView then problemText includes Flow', () => {
  // -- Given --
  const finding = truePositiveFinding({
    source: 'read.js:9',
    sink: 'fs.readFile',
    explanation: 'path reaches disk',
  });

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix: buildProposedFix(finding) });

  // -- Then --
  assert.match(actual.problemText, /Flow: read\.js:9 → fs\.readFile/, 'problem pane must show source → sink flow');
});

test('GWT-69.1 given unknown patchClass when buildFixProposeView then Quick patch label', () => {
  // -- Given --
  const proposedFix = { unifiedDiff: MINIMAL_UNIFIED_DIFF, patchClass: 'mystery' };

  // -- When --
  const actual = buildFixProposeView({ finding: truePositiveFinding(), proposedFix });

  // -- Then --
  assert.equal(actual.patchClassLabel, 'Quick patch', 'unknown patchClass must default to Quick patch');
});

test('GWT-69.1 given dismissed finding when isFixCandidate then false', () => {
  // -- Given --
  const finding = { id: 'noise', triageStatus: 'dismissed' };

  // -- When --
  const actual = isFixCandidate(finding);

  // -- Then --
  assert.equal(actual, false, 'dismissed findings must stay out of the fix queue');
});

// ── GWT-69.2 fingerprint mismatch + apply failure ────────────────────────────

test('GWT-69.2 given fingerprint mismatch when evaluateApplyClean then approvedRepoUnchanged is false', () => {
  // -- Given --
  const applyPort = createFingerprintMismatchPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: MINIMAL_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort,
  });

  // -- Then --
  assert.equal(
    actual.approvedRepoUnchanged,
    false,
    'fingerprint change after apply is a contract violation and must be reported'
  );
});

test('GWT-69.2 given fingerprint mismatch when evaluateApplyClean then applyPatch still uses temp path', () => {
  // -- Given --
  const applyPort = createFingerprintMismatchPort();

  // -- When --
  evaluateApplyClean({
    patch: MINIMAL_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort,
  });

  // -- Then --
  assert.equal(
    applyPort.calls.applyPatch[0].tempPath,
    '/tmp/mismatch-temp',
    'even a violating port must receive applyPatch only for the temp copy'
  );
});

test('GWT-69.2 given patch without +++ when evaluateApplyClean then applyClean is false', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: 'not-a-unified-diff',
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(actual.applyClean, false, 'memory port must reject patches that do not contain +++');
});

test('GWT-69.2 given patch without +++ when evaluateApplyClean then error is invalid_patch', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: 'not-a-unified-diff',
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(actual.error, 'invalid_patch', 'failed apply must surface the port error');
});

test('GWT-69.2 given patch without +++ when evaluateApplyClean then appliedTo is still temp', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: 'not-a-unified-diff',
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(actual.appliedTo, 'temp', 'a failed apply still ran against the temp copy, not none');
});

test('GWT-69.2 given successful apply when evaluateApplyClean then cleanup receives the temp path', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  evaluateApplyClean({
    patch: MINIMAL_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.deepEqual(
    port.calls.cleanup,
    ['/tmp/tripwire-temp-1'],
    'temp copy must be cleaned up after apply-clean evaluation'
  );
});

// ── GWT-69.3 null storage, clamp nav, empty findings ─────────────────────────

test('GWT-69.3 given null storage when markFixed then loadFixDecision returns null', () => {
  // -- Given --
  const storage = null;

  // -- When --
  markFixed({ findingId: 'f-cov-1', storage });
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'null storage must fail closed without throwing');
});

test('GWT-69.3 given undefined storage when markWontFix with reason then ok', () => {
  // -- Given --
  const storage = undefined;

  // -- When --
  const actual = markWontFix({ findingId: 'f-cov-1', reason: 'accepted risk', storage });

  // -- Then --
  assert.deepEqual(actual, { ok: true }, 'valid reason is accepted even when storage is missing');
});

test('GWT-69.3 given storage without setItem when markFixed then no persist', () => {
  // -- Given --
  const storage = {};

  // -- When --
  markFixed({ findingId: 'f-cov-1', storage });
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'storage missing setItem/getItem must no-op');
});

test('GWT-69.3 given throwing getItem when loadFixDecision then null', () => {
  // -- Given --
  const storage = {
    getItem() {
      throw new Error('quota exceeded');
    },
  };

  // -- When --
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'getItem failure must fail closed to null');
});

test('GWT-69.3 given throwing setItem when markFixed then operator is not thrown', () => {
  // -- Given --
  const storage = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('quota exceeded');
    },
  };

  // -- When --
  markFixed({ findingId: 'f-cov-1', storage });
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'setItem failure must be swallowed so the operator path stays fail-closed');
});

test('GWT-69.3 given garbage JSON when loadFixDecision then null', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-fix:f-cov-1', '{not-json');

  // -- When --
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'malformed stored JSON must not surface as a decision');
});

test('GWT-69.3 given stored wont_fix without reason when loadFixDecision then null', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-fix:f-cov-1', JSON.stringify({ status: 'wont_fix' }));

  // -- When --
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'persisted wont_fix must still require a reason to load');
});

test('GWT-69.3 given unknown stored status when loadFixDecision then null', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-fix:f-cov-1', JSON.stringify({ status: 'maybe' }));

  // -- When --
  const actual = loadFixDecision('f-cov-1', storage);

  // -- Then --
  assert.equal(actual, null, 'unknown persisted status must be ignored');
});

test('GWT-69.3 given empty findingId when markFixed then nothing is stored', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  markFixed({ findingId: '', storage });

  // -- Then --
  assert.equal(storage.getItem('tripwire-fix:'), null, 'empty findingId must not write a fix key');
});

test('GWT-69.3 given j at last index when navigateFix then index is clamped', () => {
  // -- Given --
  const input = { key: 'j', index: 2, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 2 }, 'j at the last candidate must clamp and stay put');
});

test('GWT-69.3 given J at last index when navigateFix then index is clamped', () => {
  // -- Given --
  const input = { key: 'J', index: 2, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 2 }, 'J at the last candidate must clamp and stay put');
});

test('GWT-69.3 given k at first index when navigateFix then index is clamped', () => {
  // -- Given --
  const input = { key: 'k', index: 0, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'k at the first candidate must clamp and stay put');
});

test('GWT-69.3 given K at first index when navigateFix then index is clamped', () => {
  // -- Given --
  const input = { key: 'K', index: 0, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'K at the first candidate must clamp and stay put');
});

test('GWT-69.3 given index past count when navigateFix then index clamps before moving', () => {
  // -- Given --
  const input = { key: 'x', index: 9, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 2 }, 'an out-of-range index must clamp to the last candidate');
});

test('GWT-69.3 given count 0 when navigateFix then index is 0', () => {
  // -- Given --
  const input = { key: 'j', index: 4, count: 0 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'empty fix queue must clamp navigation to index 0');
});

test('GWT-69.3 given negative index when navigateFix then index clamps to 0', () => {
  // -- Given --
  const input = { key: 'x', index: -2, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'negative index must clamp to 0');
});

test('GWT-69.3 given empty findings when buildFixProgress then 0 of 0 reviewed', () => {
  // -- Given --
  const findings = [];

  // -- When --
  const actual = buildFixProgress({ findings, decisions: {} });

  // -- Then --
  assert.deepEqual(
    actual,
    { reviewed: 0, total: 0, label: '0 of 0 reviewed' },
    'empty findings must report 0 of 0 reviewed'
  );
});

test('GWT-69.3 given null findings when buildFixProgress then 0 of 0 reviewed', () => {
  // -- Given --
  const findings = null;

  // -- When --
  const actual = buildFixProgress({ findings });

  // -- Then --
  assert.equal(actual.label, '0 of 0 reviewed', 'null findings must report 0 of 0 reviewed');
});

test('GWT-69.3 given finding.fixDecision when buildFixProgress then reviewed counts in-memory decisions', () => {
  // -- Given --
  const findings = [
    {
      id: 'a',
      howWeDecided: { final: 'true_positive' },
      fixDecision: { status: 'fixed' },
    },
    { id: 'b', howWeDecided: { final: 'true_positive' } },
  ];

  // -- When --
  const actual = buildFixProgress({ findings });

  // -- Then --
  assert.equal(actual.reviewed, 1, 'in-memory fixDecision on a candidate must count as reviewed');
});

test('GWT-69.3 given finding without id when applyPersistedFixDecisions then finding is unchanged', () => {
  // -- Given --
  const storage = createMemoryStorage();
  const findings = [{ title: 'No id' }];
  markFixed({ findingId: 'ghost', storage });

  // -- When --
  const actual = applyPersistedFixDecisions(findings, storage);

  // -- Then --
  assert.equal(actual[0].fixDecision, undefined, 'findings without id must not pick up another decision');
});

test('GWT-69.3 given undefined findings when applyPersistedFixDecisions then empty array', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  const actual = applyPersistedFixDecisions(undefined, storage);

  // -- Then --
  assert.deepEqual(actual, [], 'undefined findings must overlay to an empty list');
});
