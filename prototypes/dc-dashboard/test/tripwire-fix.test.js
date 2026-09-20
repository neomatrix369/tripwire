/**
 * Tests for slice-69 fix propose / apply-clean / operator controls.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-69.1 proposed fix sources; GWT-69.2 temp apply-clean;
 *   GWT-69.3 won't-fix / J/K / progress; GWT-69.4 never claim fixed;
 *   invalid/null public-function tables
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PATCH_CLASSES,
  isFixCandidate,
  buildProposedFix,
  buildFixProposeView,
} from '../tripwire-fix-propose.js';
import {
  evaluateApplyClean,
  createMemoryApplyPort,
} from '../tripwire-apply-clean.js';
import {
  requireWontFixReason,
  markFixed,
  markWontFix,
  loadFixDecision,
  applyPersistedFixDecisions,
  copyPatchText,
  gitApplyCommand,
  navigateFix,
  buildFixProgress,
} from '../tripwire-fix-controls.js';

const HTML_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'Tripwire.dc.html');
const DASHBOARD_HTML = readFileSync(HTML_PATH, 'utf8');

/** In-memory Storage mock for fix decisions (localStorage-like). */
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

const APPROVED_REPO_PATH = '/approved/repo';
const MEMORY_TEMP_PATH = '/tmp/tripwire-temp-1';

const PROVIDED_UNIFIED_DIFF = [
  '--- a/login.js',
  '+++ b/login.js',
  '@@ -42,1 +42,1 @@',
  '-query = "SELECT * FROM users WHERE id=" + id',
  '+query = "SELECT * FROM users WHERE id = $1"',
].join('\n');

const GENERATED_UNIFIED_DIFF = [
  '--- a/login.js',
  '+++ b/login.js',
  '@@ -42,1 +42,1 @@',
  '-query = "SELECT * FROM users WHERE id=" + id',
  '+query = db.prepare("SELECT * FROM users WHERE id = ?").get(id)',
].join('\n');

const PROVIDED_PATCH = {
  unifiedDiff: PROVIDED_UNIFIED_DIFF,
  patchClass: 'root_cause',
  rootCause: 'String-concatenated SQL at the login sink',
  regressionTest: 'Reject a crafted id in the login fixture',
};

const GENERATED_PATCH = {
  unifiedDiff: GENERATED_UNIFIED_DIFF,
  patchClass: 'root_cause',
  rootCause: 'SIE suggested a parameterized query',
  regressionTest: 'Add a login SQLi regression test',
};

function truePositiveVerifiedFinding(overrides = {}) {
  return {
    id: 'f-sqli-1',
    title: 'SQL injection in login',
    severity: 'High',
    triageStatus: 'to_fix',
    evidenceHighlight: 'query = "SELECT * FROM users WHERE id=" + id',
    source: 'login.js:42',
    sink: 'db.query',
    explanation: 'User input reaches a raw SQL string.',
    evidenceVerification: 'verified',
    howWeDecided: {
      final: 'true_positive',
      judges: [{ slot: 'j1', verdict: 'true_positive' }],
      rawIds: ['judge-raw-aaa'],
    },
    ...overrides,
  };
}

const FINDING_TP_VERIFIED = truePositiveVerifiedFinding();
const FINDING_WITH_PROVIDED = truePositiveVerifiedFinding({
  proposedPatch: PROVIDED_PATCH,
});

function sieGenerateFn() {
  return GENERATED_PATCH;
}

const EMPTY_PROPOSED_FIX = {
  unifiedDiff: '',
  patchClass: 'quick_patch',
  rootCause: '',
  regressionTest: '',
  source: 'heuristic',
  verificationStatus: 'not_verified',
  claimedFixed: false,
};

const EMPTY_APPLY_RESULT = {
  applyClean: false,
  approvedRepoUnchanged: true,
  appliedTo: 'none',
  error: null,
};

const GWT_69_4_SOURCE_CASES = [
  {
    name: 'provided',
    finding: FINDING_WITH_PROVIDED,
    options: { generateFn: sieGenerateFn },
  },
  {
    name: 'generateFn',
    finding: FINDING_TP_VERIFIED,
    options: { generateFn: sieGenerateFn },
  },
  {
    name: 'heuristic',
    finding: FINDING_TP_VERIFIED,
    options: {},
  },
];

// ── GWT-69.1 Proposed minimal fix ────────────────────────────────────────────

test('GWT-69.1 given true_positive with verified evidence when isFixCandidate then true', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = isFixCandidate(finding);

  // -- Then --
  assert.equal(actual, true, 'true_positive verified findings must enter the fix queue');
});

test('GWT-69.1 given triageStatus to_fix when isFixCandidate then true', () => {
  // -- Given --
  const finding = { id: 'f-to-fix', triageStatus: 'to_fix' };

  // -- When --
  const actual = isFixCandidate(finding);

  // -- Then --
  assert.equal(actual, true, 'to_fix triage must enter the fix queue without a true_positive verdict');
});

test('GWT-69.1 given provided proposedPatch when buildProposedFix then source is provided', () => {
  // -- Given --
  const finding = FINDING_WITH_PROVIDED;

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: sieGenerateFn });

  // -- Then --
  assert.equal(actual.source, 'provided', 'non-empty proposedPatch.unifiedDiff must win over generateFn');
});

test('GWT-69.1 given provided proposedPatch when buildProposedFix then unifiedDiff is the inbound patch', () => {
  // -- Given --
  const finding = FINDING_WITH_PROVIDED;

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(
    actual.unifiedDiff,
    PROVIDED_UNIFIED_DIFF,
    'provided source must return the inbound unified diff unchanged'
  );
});

test('GWT-69.1 given generateFn and no proposedPatch when buildProposedFix then source is generateFn', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: sieGenerateFn });

  // -- Then --
  assert.equal(actual.source, 'generateFn', 'SIE generateFn must be used when no provided unifiedDiff exists');
});

test('GWT-69.1 given generateFn when buildProposedFix then unifiedDiff comes from generateFn', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding, { generateFn: sieGenerateFn });

  // -- Then --
  assert.equal(
    actual.unifiedDiff,
    GENERATED_UNIFIED_DIFF,
    'generateFn source must return the SIE-produced unified diff'
  );
});

test('GWT-69.1 given true_positive verified finding when buildProposedFix heuristic then source is heuristic', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(actual.source, 'heuristic', 'absent provided patch and generateFn must fall back to heuristic');
});

test('GWT-69.1 given heuristic when buildProposedFix then unifiedDiff is a minimal ---/+++ @@ patch', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.unifiedDiff,
    /^--- a\/login\.js\n\+\+\+ b\/login\.js\n@@ /m,
    'heuristic must emit a minimal unified diff for the finding source file'
  );
});

test('GWT-69.1 given heuristic when buildProposedFix then patchClass is quick_patch', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.equal(actual.patchClass, 'quick_patch', 'heuristic patches are labelled quick_patch, not root_cause');
});

test('GWT-69.1 given heuristic when buildProposedFix then regressionTest names the finding', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;

  // -- When --
  const actual = buildProposedFix(finding);

  // -- Then --
  assert.match(
    actual.regressionTest,
    /SQL injection in login/,
    'heuristic must suggest a regression test that names the finding'
  );
});

test('GWT-69.1 given provided root_cause patch when buildFixProposeView then patchClassLabel is Root-cause fix', () => {
  // -- Given --
  const finding = FINDING_WITH_PROVIDED;
  const proposedFix = buildProposedFix(finding);

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix });

  // -- Then --
  assert.equal(
    actual.patchClassLabel,
    'Root-cause fix',
    'root_cause must surface as the text label Root-cause fix, not colour-only'
  );
});

test('GWT-69.1 given heuristic quick_patch when buildFixProposeView then patchClassLabel is Quick patch', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;
  const proposedFix = buildProposedFix(finding);

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix });

  // -- Then --
  assert.equal(
    actual.patchClassLabel,
    'Quick patch',
    'quick_patch must surface as the text label Quick patch'
  );
});

test('GWT-69.1 given verified true_positive when buildFixProposeView then problemText shows evidence', () => {
  // -- Given --
  const finding = FINDING_TP_VERIFIED;
  const proposedFix = buildProposedFix(finding);

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix });

  // -- Then --
  assert.match(
    actual.problemText,
    /SELECT \* FROM users WHERE id=/,
    'left pane must show the verified evidence next to the diff'
  );
});

test('GWT-69.1 given provided patch when buildFixProposeView then diffText is the unified diff', () => {
  // -- Given --
  const finding = FINDING_WITH_PROVIDED;
  const proposedFix = buildProposedFix(finding);

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix });

  // -- Then --
  assert.equal(
    actual.diffText,
    PROVIDED_UNIFIED_DIFF,
    'right pane must show the proposed unified diff'
  );
});

test('GWT-69.1 given provided patch when buildFixProposeView then regressionTest is present', () => {
  // -- Given --
  const finding = FINDING_WITH_PROVIDED;
  const proposedFix = buildProposedFix(finding);

  // -- When --
  const actual = buildFixProposeView({ finding, proposedFix });

  // -- Then --
  assert.equal(
    actual.regressionTest,
    PROVIDED_PATCH.regressionTest,
    'view must carry the inbound regression-test suggestion'
  );
});

test('GWT-69.1 given PATCH_CLASSES when read then root_cause and quick_patch', () => {
  // -- Given --
  const expected = ['root_cause', 'quick_patch'];

  // -- When --
  const actual = [...PATCH_CLASSES];

  // -- Then --
  assert.deepEqual(actual, expected, 'PATCH_CLASSES must list root_cause and quick_patch');
});

test('GWT-69.1 given PATCH_CLASSES when Object.isFrozen then true', () => {
  // -- Given --
  const exported = PATCH_CLASSES;

  // -- When --
  const actual = Object.isFrozen(exported);

  // -- Then --
  assert.equal(actual, true, 'PATCH_CLASSES must be frozen');
});

const IS_FIX_CANDIDATE_INVALID_INPUT = [
  { name: 'null finding', input: null },
  { name: 'undefined finding', input: undefined },
  { name: 'empty object', input: {} },
  { name: 'non-object string', input: 'true_positive' },
  { name: 'false_positive verdict', input: { howWeDecided: { final: 'false_positive' } } },
];

IS_FIX_CANDIDATE_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.1 given ${tc.name} when isFixCandidate then false`, () => {
    // -- Given --
    const finding = tc.input;

    // -- When --
    const actual = isFixCandidate(finding);

    // -- Then --
    assert.equal(actual, false, `isFixCandidate must reject ${tc.name}`);
  });
});

const BUILD_PROPOSED_FIX_INVALID_INPUT = [
  { name: 'null finding', input: null },
  { name: 'undefined finding', input: undefined },
  { name: 'empty object', input: {} },
];

BUILD_PROPOSED_FIX_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.1 given ${tc.name} when buildProposedFix then empty not_verified quick_patch`, () => {
    // -- Given --
    const finding = tc.input;

    // -- When --
    const actual = buildProposedFix(finding);

    // -- Then --
    assert.deepEqual(
      actual,
      EMPTY_PROPOSED_FIX,
      `null/empty finding must not invent a claimed fix (${tc.name})`
    );
  });
});

test('GWT-69.1 given null finding when buildFixProposeView then patchClassLabel is Quick patch', () => {
  // -- Given --
  const input = { finding: null, proposedFix: null };

  // -- When --
  const actual = buildFixProposeView(input);

  // -- Then --
  assert.equal(actual.patchClassLabel, 'Quick patch', 'null finding view must default to Quick patch');
});

test('GWT-69.1 given null finding when buildFixProposeView then diffText is empty', () => {
  // -- Given --
  const input = { finding: null, proposedFix: null };

  // -- When --
  const actual = buildFixProposeView(input);

  // -- Then --
  assert.equal(actual.diffText, '', 'null finding view must not invent a unified diff');
});

// ── GWT-69.2 Apply-clean on temp copy ────────────────────────────────────────

test('GWT-69.2 given proposed patch when evaluateApplyClean then applyPatch uses only the temp path', () => {
  // -- Given --
  const port = createMemoryApplyPort();
  const patch = PROVIDED_UNIFIED_DIFF;

  // -- When --
  evaluateApplyClean({
    patch,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.deepEqual(
    port.calls.applyPatch,
    [{ tempPath: MEMORY_TEMP_PATH, patch }],
    'applyPatch must be called once with the temp copy path, never the approved repo'
  );
});

test('GWT-69.2 given proposed patch when evaluateApplyClean then applyPatch path is not the approved repo', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  evaluateApplyClean({
    patch: PROVIDED_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.notEqual(
    port.calls.applyPatch[0].tempPath,
    APPROVED_REPO_PATH,
    'applyPatch must never receive the approved repository path'
  );
});

test('GWT-69.2 given proposed patch when evaluateApplyClean then applyClean is true', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: PROVIDED_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(actual.applyClean, true, 'a unified diff containing +++ must apply cleanly on the memory port');
});

test('GWT-69.2 given proposed patch when evaluateApplyClean then appliedTo is temp', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: PROVIDED_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(actual.appliedTo, 'temp', 'successful apply-clean must record appliedTo temp');
});

test('GWT-69.2 given memory port when evaluateApplyClean then approved fingerprint is unchanged', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: PROVIDED_UNIFIED_DIFF,
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.equal(
    actual.approvedRepoUnchanged,
    true,
    'createMemoryApplyPort must keep a stable approved-repo fingerprint'
  );
});

test('GWT-69.2 given empty patch when evaluateApplyClean then applyPatch is not called', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  evaluateApplyClean({
    patch: '',
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.deepEqual(port.calls.applyPatch, [], 'empty patch must not be applied to any path');
});

test('GWT-69.2 given empty patch when evaluateApplyClean then appliedTo is none', () => {
  // -- Given --
  const port = createMemoryApplyPort();

  // -- When --
  const actual = evaluateApplyClean({
    patch: '',
    approvedRepoPath: APPROVED_REPO_PATH,
    applyPort: port,
  });

  // -- Then --
  assert.deepEqual(
    actual,
    EMPTY_APPLY_RESULT,
    'empty patch must report applyClean false, appliedTo none, approved repo unchanged'
  );
});

test('GWT-69.2 given missing args when evaluateApplyClean then none and unchanged', () => {
  // -- Given / When --
  const actual = evaluateApplyClean();

  // -- Then --
  assert.deepEqual(
    actual,
    EMPTY_APPLY_RESULT,
    'missing patch must not apply and must leave the approved repo unchanged'
  );
});

const EVALUATE_APPLY_CLEAN_INVALID_INPUT = [
  { name: 'null patch', input: { patch: null, approvedRepoPath: APPROVED_REPO_PATH } },
  { name: 'whitespace patch', input: { patch: '   ', approvedRepoPath: APPROVED_REPO_PATH } },
  { name: 'non-string patch', input: { patch: 42, approvedRepoPath: APPROVED_REPO_PATH } },
];

EVALUATE_APPLY_CLEAN_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.2 given ${tc.name} when evaluateApplyClean then none and unchanged`, () => {
    // -- Given --
    const input = tc.input;

    // -- When --
    const actual = evaluateApplyClean(input);

    // -- Then --
    assert.deepEqual(
      actual,
      EMPTY_APPLY_RESULT,
      `invalid/missing patch (${tc.name}) must not apply and must leave the approved repo unchanged`
    );
  });
});

// ── GWT-69.3 Operator controls ───────────────────────────────────────────────

test('GWT-69.3 given empty reason when markWontFix then reason_required', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  const actual = markWontFix({ findingId: 'f-sqli-1', reason: '', storage });

  // -- Then --
  assert.deepEqual(
    actual,
    { ok: false, error: 'reason_required' },
    'won\'t-fix without a reason must fail closed'
  );
});

test('GWT-69.3 given empty reason when markWontFix then nothing is persisted', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  markWontFix({ findingId: 'f-sqli-1', reason: '   ', storage });

  // -- Then --
  assert.equal(
    loadFixDecision('f-sqli-1', storage),
    null,
    'won\'t-fix without a trimmed reason must persist nothing'
  );
});

test('GWT-69.3 given whitespace reason when requireWontFixReason then false', () => {
  // -- Given --
  const reason = '   ';

  // -- When --
  const actual = requireWontFixReason(reason);

  // -- Then --
  assert.equal(actual, false, 'requireWontFixReason must treat whitespace as empty');
});

test('GWT-69.3 given a reason when markWontFix then the trimmed decision persists', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  markWontFix({ findingId: 'f-sqli-1', reason: ' accepted risk ', storage });

  // -- Then --
  assert.deepEqual(
    loadFixDecision('f-sqli-1', storage),
    { status: 'wont_fix', reason: 'accepted risk' },
    'won\'t-fix with a reason must persist status and trimmed reason under tripwire-fix:'
  );
});

test('GWT-69.3 given findingId when markFixed then persisted status is fixed', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  markFixed({ findingId: 'f-sqli-1', storage });

  // -- Then --
  assert.deepEqual(
    loadFixDecision('f-sqli-1', storage),
    { status: 'fixed' },
    'markFixed must persist { status: fixed } for the finding'
  );
});

test('GWT-69.3 given persisted decisions when applyPersistedFixDecisions then overlays fixDecision', () => {
  // -- Given --
  const storage = createMemoryStorage();
  const findings = [
    { id: 'f-sqli-1', title: 'SQL injection in login' },
    { id: 'f-xss-2', title: 'Reflected XSS' },
  ];
  markFixed({ findingId: 'f-sqli-1', storage });

  // -- When --
  const actual = applyPersistedFixDecisions(findings, storage);

  // -- Then --
  assert.deepEqual(
    actual[0].fixDecision,
    { status: 'fixed' },
    'applyPersistedFixDecisions must overlay the stored fix decision onto the matching finding'
  );
});

test('GWT-69.3 given j when navigateFix then index advances', () => {
  // -- Given --
  const input = { key: 'j', index: 0, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 1 }, 'j must move to the next fix candidate');
});

test('GWT-69.3 given J when navigateFix then index advances', () => {
  // -- Given --
  const input = { key: 'J', index: 1, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 2 }, 'J must move to the next fix candidate');
});

test('GWT-69.3 given k when navigateFix then index retreats', () => {
  // -- Given --
  const input = { key: 'k', index: 2, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 1 }, 'k must move to the previous fix candidate');
});

test('GWT-69.3 given K when navigateFix then index retreats', () => {
  // -- Given --
  const input = { key: 'K', index: 1, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'K must move to the previous fix candidate');
});

test('GWT-69.3 given other key when navigateFix then index is unchanged', () => {
  // -- Given --
  const input = { key: 'x', index: 1, count: 3 };

  // -- When --
  const actual = navigateFix(input);

  // -- Then --
  assert.deepEqual(actual, { index: 1 }, 'non j/k keys must leave the selection unchanged');
});

test('GWT-69.3 given mixed candidates when buildFixProgress then label is N of M reviewed', () => {
  // -- Given --
  const findings = [
    truePositiveVerifiedFinding({ id: 'a' }),
    truePositiveVerifiedFinding({ id: 'b' }),
    { id: 'c', title: 'noise', triageStatus: 'dismissed' },
  ];
  const decisions = { a: { status: 'fixed' } };

  // -- When --
  const actual = buildFixProgress({ findings, decisions });

  // -- Then --
  assert.equal(actual.label, '1 of 2 reviewed', 'progress label must be "N of M reviewed" over fix candidates only');
});

test('GWT-69.3 given mixed candidates when buildFixProgress then reviewed counts decided candidates', () => {
  // -- Given --
  const findings = [
    truePositiveVerifiedFinding({ id: 'a' }),
    truePositiveVerifiedFinding({ id: 'b' }),
    { id: 'c', title: 'noise', triageStatus: 'dismissed' },
  ];
  const decisions = { a: { status: 'wont_fix', reason: 'accepted risk' } };

  // -- When --
  const actual = buildFixProgress({ findings, decisions });

  // -- Then --
  assert.equal(actual.reviewed, 1, 'reviewed must count candidates with fixed or wont_fix');
});

test('GWT-69.3 given mixed candidates when buildFixProgress then total counts fix candidates only', () => {
  // -- Given --
  const findings = [
    truePositiveVerifiedFinding({ id: 'a' }),
    truePositiveVerifiedFinding({ id: 'b' }),
    { id: 'c', title: 'noise', triageStatus: 'dismissed' },
  ];
  const decisions = { a: { status: 'wont_fix', reason: 'accepted risk' } };

  // -- When --
  const actual = buildFixProgress({ findings, decisions });

  // -- Then --
  assert.equal(actual.total, 2, 'total must count isFixCandidate rows only');
});

test('GWT-69.3 given unifiedDiff when copyPatchText then the diff string is returned', () => {
  // -- Given --
  const unifiedDiff = PROVIDED_UNIFIED_DIFF;

  // -- When --
  const actual = copyPatchText(unifiedDiff);

  // -- Then --
  assert.equal(actual, PROVIDED_UNIFIED_DIFF, 'copyPatchText must return the unified diff for the wire clipboard');
});

test('GWT-69.3 given unifiedDiff when gitApplyCommand then heredoc git apply is returned', () => {
  // -- Given --
  const unifiedDiff = PROVIDED_UNIFIED_DIFF;

  // -- When --
  const actual = gitApplyCommand(unifiedDiff);

  // -- Then --
  assert.equal(
    actual,
    `git apply <<'EOF'\n${PROVIDED_UNIFIED_DIFF}\nEOF`,
    'gitApplyCommand must wrap the diff in a git apply heredoc'
  );
});

test('GWT-69.3 given fix persist when storage keys then tripwire-fix prefix is used', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  markFixed({ findingId: 'f-sqli-1', storage });

  // -- Then --
  assert.equal(
    storage.getItem('tripwire-fix:f-sqli-1'),
    JSON.stringify({ status: 'fixed' }),
    'fix decisions must persist under the tripwire-fix: key prefix'
  );
});

test('GWT-69.3 given existing triage key when markFixed then triage key is unchanged', () => {
  // -- Given --
  const storage = createMemoryStorage();
  storage.setItem('tripwire-triage:f-sqli-1', 'to_fix');

  // -- When --
  markFixed({ findingId: 'f-sqli-1', storage });

  // -- Then --
  assert.equal(
    storage.getItem('tripwire-triage:f-sqli-1'),
    'to_fix',
    'markFixed must not collide with tripwire-triage: keys'
  );
});

const REQUIRE_WONT_FIX_REASON_INVALID_INPUT = [
  { name: 'null reason', input: null },
  { name: 'undefined reason', input: undefined },
  { name: 'empty string', input: '' },
  { name: 'whitespace only', input: '\t  \n' },
];

REQUIRE_WONT_FIX_REASON_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.3 given ${tc.name} when requireWontFixReason then false`, () => {
    // -- Given --
    const reason = tc.input;

    // -- When --
    const actual = requireWontFixReason(reason);

    // -- Then --
    assert.equal(actual, false, `requireWontFixReason must reject ${tc.name}`);
  });
});

const LOAD_FIX_DECISION_INVALID_INPUT = [
  { name: 'empty findingId', findingId: '', storage: createMemoryStorage() },
  { name: 'null findingId', findingId: null, storage: createMemoryStorage() },
  { name: 'undefined storage', findingId: 'f-sqli-1', storage: undefined },
];

LOAD_FIX_DECISION_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.3 given ${tc.name} when loadFixDecision then null`, () => {
    // -- Given --
    const { findingId, storage } = tc;

    // -- When --
    const actual = loadFixDecision(findingId, storage);

    // -- Then --
    assert.equal(actual, null, `loadFixDecision must return null for ${tc.name}`);
  });
});

const COPY_PATCH_TEXT_INVALID_INPUT = [
  { name: 'null diff', input: null },
  { name: 'undefined diff', input: undefined },
];

COPY_PATCH_TEXT_INVALID_INPUT.forEach((tc) => {
  test(`GWT-69.3 given ${tc.name} when copyPatchText then empty string`, () => {
    // -- Given --
    const unifiedDiff = tc.input;

    // -- When --
    const actual = copyPatchText(unifiedDiff);

    // -- Then --
    assert.equal(actual, '', `copyPatchText must return empty string for ${tc.name}`);
  });
});

test('GWT-69.3 given null findings when applyPersistedFixDecisions then empty array', () => {
  // -- Given --
  const storage = createMemoryStorage();

  // -- When --
  const actual = applyPersistedFixDecisions(null, storage);

  // -- Then --
  assert.deepEqual(actual, [], 'null findings must overlay to an empty list');
});

test('GWT-69.3 given null unifiedDiff when gitApplyCommand then empty heredoc', () => {
  // -- Given --
  const unifiedDiff = null;

  // -- When --
  const actual = gitApplyCommand(unifiedDiff);

  // -- Then --
  assert.equal(actual, "git apply <<'EOF'\n\nEOF", 'null diff must still produce a well-formed empty git apply command');
});

test('GWT-69.3 given missing args when navigateFix then index 0', () => {
  // -- Given / When --
  const actual = navigateFix();

  // -- Then --
  assert.deepEqual(actual, { index: 0 }, 'navigateFix with no args must clamp to index 0');
});

test('GWT-69.3 given missing args when buildFixProgress then 0 of 0 reviewed', () => {
  // -- Given / When --
  const actual = buildFixProgress();

  // -- Then --
  assert.deepEqual(
    actual,
    { reviewed: 0, total: 0, label: '0 of 0 reviewed' },
    'missing findings must report 0 of 0 reviewed'
  );
});

// ── GWT-69.4 Never claim fixed from generation ───────────────────────────────

GWT_69_4_SOURCE_CASES.forEach((tc) => {
  test(`GWT-69.4 given ${tc.name} patch when buildProposedFix then claimedFixed is false`, () => {
    // -- Given --
    const { finding, options } = tc;

    // -- When --
    const actual = buildProposedFix(finding, options);

    // -- Then --
    assert.equal(
      actual.claimedFixed,
      false,
      `generation via ${tc.name} must never claim the vulnerability is fixed`
    );
  });

  test(`GWT-69.4 given ${tc.name} patch when buildProposedFix then verificationStatus is not_verified`, () => {
    // -- Given --
    const { finding, options } = tc;

    // -- When --
    const actual = buildProposedFix(finding, options);

    // -- Then --
    assert.equal(
      actual.verificationStatus,
      'not_verified',
      `generation via ${tc.name} must leave verification to slice 70`
    );
  });

  test(`GWT-69.4 given ${tc.name} patch when buildFixProposeView then fixedClaimForbidden is true`, () => {
    // -- Given --
    const proposedFix = buildProposedFix(tc.finding, tc.options);

    // -- When --
    const actual = buildFixProposeView({ finding: tc.finding, proposedFix });

    // -- Then --
    assert.equal(
      actual.fixedClaimForbidden,
      true,
      `UI must not show Fixed from ${tc.name} generation`
    );
  });
});

// ── Production-entry HTML (Fix step chrome) ──────────────────────────────────

test('GWT-69.1 given dashboard html when Fix step then side-by-side problem and proposed patch panes exist', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(html, /aria-label="Fix"/, 'Fix panel must be labelled');
  assert.match(html, />Problem</, 'left pane is the problem');
  assert.match(html, />Proposed patch</, 'right pane is the proposed diff');
  assert.match(html, /Propose a fix/, 'Fix step has a readable display title');
});

test('GWT-69.1 given dashboard html when proposed patch pane then full diff is scrollable not clipped', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(html, /class="tw-proposed-patch"/, 'proposed patch uses dedicated scroll pane');
  assert.match(html, /\.tw-proposed-patch\s*\{[^}]*overflow:\s*auto/s, 'patch pane must scroll the full unified diff');
  assert.match(html, /\.tw-proposed-patch\s*\{[^}]*max-height:/s, 'patch pane caps height so chrome stays usable');
  assert.match(html, /aria-label="Proposed patch diff"/, 'patch pane is labelled for assistive tech');
});

test('GWT-69.1 given dashboard html when primary tabs then inventory is default and workflow is secondary', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(html, /\['dashboard',\s*'workflow'\]/, 'primary tabs are Dashboard then Workflow');
  assert.match(html, /showInventory:\s*!s\.showIntro\s*&&\s*s\.activeTab\s*===\s*'dashboard'/, 'inventory is the default Dashboard tab');
  assert.match(html, /showWorkflow:\s*!s\.showIntro\s*&&\s*s\.activeTab\s*===\s*'workflow'/, 'workflow phases live on the Workflow tab');
  assert.match(html, /sc-if value="\{\{\s*showWorkflow\s*\}\}"/, 'workflow chrome is gated behind showWorkflow');
  assert.match(html, /sc-if value="\{\{\s*showInventory\s*\}\}"/, 'inventory is gated behind showInventory');
  assert.match(html, /tw-workflow-focus/, 'Workflow tab expands chrome to fill the page');
});

test('GWT-69.1 given dashboard html when Fix step then typography separates prose from mono diff', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(html, /\.tw-fix-title\s*\{[^}]*font-family:\s*var\(--font-display\)/s, 'Fix title uses display font');
  assert.match(html, /\.tw-fix-problem\s*\{[^}]*font-family:\s*var\(--font-sans\)/s, 'problem prose uses sans');
  assert.match(html, /\.tw-proposed-patch\s*\{[^}]*font-family:\s*var\(--font-mono\)/s, 'diff stays monospace');
});

test('GWT-69.2 given dashboard html when Fix step then apply-clean line is yes or no text', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(
    html,
    /Applies cleanly: yes|Applies cleanly: no|applyCleanLine/,
    'apply-clean result must be textual yes/no'
  );
});

test('GWT-69.3 given dashboard html when Fix step then operator copy mark and J/K handlers exist', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(html, />Copy patch</, 'copy patch control');
  assert.match(html, />Copy git apply</, 'copy git apply control');
  assert.match(html, /Won't-fix reason \(required\)/, "won't-fix reason is required");
  assert.match(html, /handleFixKeydown/, 'J/K navigation is wired');
  assert.match(html, /N of M reviewed|progressLabel/, 'progress label is wired');
});

test('GWT-69.4 given dashboard html when operator marks fixed then copy says not verified', () => {
  // -- Given --
  const html = DASHBOARD_HTML;

  // -- When / Then --
  assert.match(
    html,
    /Operator marked fixed — not verified/,
    'generation must not claim Fixed; operator mark stays unverified until slice 70'
  );
  assert.match(
    html,
    /workflowIsStub: stubSteps/,
    'stub helper remains (unused once all steps are live)'
  );
  assert.match(
    html,
    /const stubSteps = false/,
    'Fix, Verify, and Report are live — no workflow stub step'
  );
  assert.match(
    html,
    /workflowIsVerify/,
    'Verify step has a dedicated live panel flag'
  );
});
