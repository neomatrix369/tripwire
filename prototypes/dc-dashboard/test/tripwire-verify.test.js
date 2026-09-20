/**
 * Tests for slice-70 verify fix via worktree re-scan.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-70.1 finding gone; GWT-70.2 still present;
 *   GWT-70.3 unable to verify (missing/failed/timeout/apply/empty patch);
 *   port path isolation; fingerprint; view labels + honesty
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VERIFICATION_OUTCOMES,
  verifyFixOnWorktree,
  createMemoryVerifyPort,
} from '../tripwire-verify-rescan.js';
import {
  OUTCOME_LABELS,
  buildVerifyView,
} from '../tripwire-verify-view.js';

const APPROVED_REPO_PATH = '/approved/repo';
const MEMORY_TEMP_PATH = '/tmp/tripwire-verify-temp-1';

const REMOVING_PATCH = [
  '--- a/login.js',
  '+++ b/login.js',
  '@@ -42,1 +42,1 @@',
  '-query = "SELECT * FROM users WHERE id=" + id',
  '+query = "SELECT * FROM users WHERE id = $1"',
].join('\n');

function sqliFinding(overrides = {}) {
  return {
    id: 'f-sqli-1',
    title: 'SQL injection in login',
    severity: 'High',
    source: 'login.js:42',
    evidenceHighlight: 'query = "SELECT * FROM users WHERE id=" + id',
    howWeDecided: { final: 'true_positive' },
    proposedPatch: { unifiedDiff: REMOVING_PATCH },
    ...overrides,
  };
}

const FINDING = sqliFinding();

const SCAN_GONE = {
  status: 'ok',
  findings: [],
  actions: [{ name: 'semgrep', status: 'ok', detail: 'no match' }],
};

const SCAN_STILL_PRESENT = {
  status: 'ok',
  findings: [{ id: 'f-sqli-1', title: 'SQL injection in login', source: 'login.js:42' }],
  actions: [{ name: 'semgrep', status: 'ok', detail: 'match' }],
};

// ── GWT-70.1 Finding gone ────────────────────────────────────────────────────

test('GWT-70.1 given patch that removes issue and scanners ok when verifyFixOnWorktree then finding_gone', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.outcome, 'finding_gone', 'scanners ok with no matching finding must report finding_gone');
});

test('GWT-70.1 given finding_gone when verifyFixOnWorktree then verificationStatus matches outcome', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.verificationStatus,
    'finding_gone',
    'verificationStatus must mirror outcome for finding_gone'
  );
});

test('GWT-70.1 given finding_gone when verifyFixOnWorktree then approvedRepoUnchanged is true', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.approvedRepoUnchanged,
    true,
    'memory port must keep a stable approved-repo fingerprint'
  );
});

test('GWT-70.1 given finding_gone when buildVerifyView then outcomeLabel is Finding gone', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: SCAN_GONE.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(actual.outcomeLabel, 'Finding gone', 'OUTCOME_LABELS.finding_gone must surface as Finding gone');
});

test('GWT-70.1 given finding_gone when buildVerifyView then honestyLine cites temp worktree', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: SCAN_GONE.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(
    actual.honestyLine,
    'Verified on temp worktree — approved repo unchanged',
    'finding_gone must carry the honesty line about temp worktree'
  );
});

test('GWT-70.1 given finding_gone when buildVerifyView then claimedFixedForbidden is false', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: SCAN_GONE.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(
    actual.claimedFixedForbidden,
    false,
    'only finding_gone may allow a fixed claim after verify'
  );
});

// ── GWT-70.2 Still present ───────────────────────────────────────────────────

test('GWT-70.2 given patch that does not remove issue when verifyFixOnWorktree then still_present', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_STILL_PRESENT });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.outcome,
    'still_present',
    'scanners ok with a matching finding must report still_present'
  );
});

test('GWT-70.2 given still_present when verifyFixOnWorktree then scannerActions are recorded', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_STILL_PRESENT });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.deepEqual(
    actual.scannerActions,
    SCAN_STILL_PRESENT.actions,
    'still_present must surface the scanner actions that ran'
  );
});

test('GWT-70.2 given still_present when buildVerifyView then outcomeLabel is Still present', () => {
  // -- Given --
  const verification = {
    outcome: 'still_present',
    reason: null,
    scannerActions: SCAN_STILL_PRESENT.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'still_present',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(actual.outcomeLabel, 'Still present', 'OUTCOME_LABELS.still_present must surface as Still present');
});

test('GWT-70.2 given still_present when buildVerifyView then claimedFixedForbidden is true', () => {
  // -- Given --
  const verification = {
    outcome: 'still_present',
    reason: null,
    scannerActions: SCAN_STILL_PRESENT.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'still_present',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(
    actual.claimedFixedForbidden,
    true,
    'still_present must never allow a Fixed claim'
  );
});

test('GWT-70.2 given still_present when buildVerifyView then honestyLine is present', () => {
  // -- Given --
  const verification = {
    outcome: 'still_present',
    reason: null,
    scannerActions: SCAN_STILL_PRESENT.actions,
    approvedRepoUnchanged: true,
    verificationStatus: 'still_present',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.ok(
    typeof actual.honestyLine === 'string' && actual.honestyLine.length > 0,
    'honestyLine must always be present'
  );
});

// ── GWT-70.3 Unable to verify ────────────────────────────────────────────────

const UNABLE_SCANNER_CASES = [
  {
    name: 'missing scanner',
    scanResult: {
      status: 'missing',
      findings: [],
      actions: [{ name: 'semgrep', status: 'missing' }],
      reason: 'missing',
    },
    expectedReason: 'missing',
  },
  {
    name: 'failed scanner',
    scanResult: {
      status: 'failed',
      findings: [],
      actions: [{ name: 'semgrep', status: 'failed', detail: 'exit 2' }],
      reason: 'failed',
    },
    expectedReason: 'failed',
  },
  {
    name: 'timeout scanner',
    scanResult: {
      status: 'timeout',
      findings: [],
      actions: [{ name: 'semgrep', status: 'timeout' }],
      reason: 'timeout',
    },
    expectedReason: 'timeout',
  },
];

UNABLE_SCANNER_CASES.forEach((tc) => {
  test(`GWT-70.3 given ${tc.name} when verifyFixOnWorktree then unable_to_verify`, () => {
    // -- Given --
    const verifyPort = createMemoryVerifyPort({ scanResult: tc.scanResult });

    // -- When --
    const actual = verifyFixOnWorktree({
      finding: FINDING,
      patch: REMOVING_PATCH,
      approvedRepoPath: APPROVED_REPO_PATH,
      verifyPort,
    });

    // -- Then --
    assert.equal(
      actual.outcome,
      'unable_to_verify',
      `${tc.name} must report unable_to_verify, never finding_gone`
    );
  });

  test(`GWT-70.3 given ${tc.name} when verifyFixOnWorktree then reason is ${tc.expectedReason}`, () => {
    // -- Given --
    const verifyPort = createMemoryVerifyPort({ scanResult: tc.scanResult });

    // -- When --
    const actual = verifyFixOnWorktree({
      finding: FINDING,
      patch: REMOVING_PATCH,
      approvedRepoPath: APPROVED_REPO_PATH,
      verifyPort,
    });

    // -- Then --
    assert.equal(
      actual.reason,
      tc.expectedReason,
      `${tc.name} must carry reason ${tc.expectedReason}`
    );
  });

  test(`GWT-70.3 given ${tc.name} when verifyFixOnWorktree then outcome is never finding_gone`, () => {
    // -- Given --
    const verifyPort = createMemoryVerifyPort({ scanResult: tc.scanResult });

    // -- When --
    const actual = verifyFixOnWorktree({
      finding: FINDING,
      patch: REMOVING_PATCH,
      approvedRepoPath: APPROVED_REPO_PATH,
      verifyPort,
    });

    // -- Then --
    assert.notEqual(
      actual.outcome,
      'finding_gone',
      `scanner ${tc.expectedReason} must never be shown as finding gone`
    );
  });
});

test('GWT-70.3 given empty patch when verifyFixOnWorktree then unable_to_verify with no_patch', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: '',
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.outcome, 'unable_to_verify', 'empty patch must not claim finding_gone');
  assert.equal(actual.reason, 'no_patch', 'empty patch reason must be no_patch');
  assert.deepEqual(actual.scannerActions, [], 'empty patch must not run scanners');
});

test('GWT-70.3 given empty patch when verifyFixOnWorktree then applyPatch is not called', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: FINDING,
    patch: '',
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.deepEqual(verifyPort.calls.applyPatch, [], 'empty patch must not be applied');
  assert.deepEqual(verifyPort.calls.runApplicableScanners, [], 'empty patch must not scan');
});

test('GWT-70.3 given apply failure when verifyFixOnWorktree then unable_to_verify with apply_failed', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ applyOk: false, scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.outcome, 'unable_to_verify', 'apply failure must be unable_to_verify');
  assert.equal(actual.reason, 'apply_failed', 'apply failure reason must be apply_failed');
  assert.notEqual(actual.outcome, 'finding_gone', 'apply failure must never be finding_gone');
});

test('GWT-70.3 given apply failure when verifyFixOnWorktree then scanners are not run', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ applyOk: false, scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.deepEqual(
    verifyPort.calls.runApplicableScanners,
    [],
    'failed apply must skip scanner re-check'
  );
});

test('GWT-70.3 given unable_to_verify when buildVerifyView then outcomeLabel is Unable to verify', () => {
  // -- Given --
  const verification = {
    outcome: 'unable_to_verify',
    reason: 'timeout',
    scannerActions: [{ name: 'semgrep', status: 'timeout' }],
    approvedRepoUnchanged: true,
    verificationStatus: 'unable_to_verify',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(
    actual.outcomeLabel,
    'Unable to verify',
    'OUTCOME_LABELS.unable_to_verify must surface as Unable to verify'
  );
});

test('GWT-70.3 given unable_to_verify when buildVerifyView then claimedFixedForbidden is true', () => {
  // -- Given --
  const verification = {
    outcome: 'unable_to_verify',
    reason: 'failed',
    scannerActions: [],
    approvedRepoUnchanged: true,
    verificationStatus: 'unable_to_verify',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(
    actual.claimedFixedForbidden,
    true,
    'unable_to_verify must never allow a Fixed claim'
  );
});

test('GWT-70.3 given unable reason when buildVerifyView then reasonText is non-empty', () => {
  // -- Given --
  const verification = {
    outcome: 'unable_to_verify',
    reason: 'missing',
    scannerActions: [],
    approvedRepoUnchanged: true,
    verificationStatus: 'unable_to_verify',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.ok(
    typeof actual.reasonText === 'string' && actual.reasonText.length > 0,
    'unable_to_verify must surface a human reasonText'
  );
});

// ── Port isolation + fingerprint ─────────────────────────────────────────────

test('GWT-70.1 given verify run when verifyFixOnWorktree then applyPatch uses only the temp path', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(verifyPort.calls.applyPatch.length, 1, 'applyPatch must be called once');
  assert.notEqual(
    verifyPort.calls.applyPatch[0].tempPath,
    APPROVED_REPO_PATH,
    'applyPatch must never receive the approved repository path'
  );
  assert.equal(
    verifyPort.calls.applyPatch[0].tempPath,
    MEMORY_TEMP_PATH,
    'applyPatch must target the memory temp copy'
  );
});

test('GWT-70.1 given verify run when verifyFixOnWorktree then runApplicableScanners uses only the temp path', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(verifyPort.calls.runApplicableScanners.length, 1, 'scanners must run once');
  assert.notEqual(
    verifyPort.calls.runApplicableScanners[0].tempPath,
    APPROVED_REPO_PATH,
    'runApplicableScanners must never receive the approved repository path'
  );
});

test('GWT-70.1 given memory port when verifyFixOnWorktree then cleanup receives the temp path', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: FINDING,
    patch: REMOVING_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.deepEqual(
    verifyPort.calls.cleanup,
    [MEMORY_TEMP_PATH],
    'temp copy must be cleaned up after verification'
  );
});

test('GWT-70.1 given VERIFICATION_OUTCOMES when read then three frozen outcomes', () => {
  // -- Given --
  const expected = ['finding_gone', 'still_present', 'unable_to_verify'];

  // -- When --
  const actual = [...VERIFICATION_OUTCOMES];

  // -- Then --
  assert.deepEqual(actual, expected, 'VERIFICATION_OUTCOMES must list the three honesty outcomes');
  assert.equal(Object.isFrozen(VERIFICATION_OUTCOMES), true, 'VERIFICATION_OUTCOMES must be frozen');
});

test('GWT-70.1 given OUTCOME_LABELS when read then operator text map is frozen', () => {
  // -- Given / When --
  const actual = { ...OUTCOME_LABELS };

  // -- Then --
  assert.deepEqual(
    actual,
    {
      finding_gone: 'Finding gone',
      still_present: 'Still present',
      unable_to_verify: 'Unable to verify',
    },
    'OUTCOME_LABELS must map outcomes to operator text'
  );
  assert.equal(Object.isFrozen(OUTCOME_LABELS), true, 'OUTCOME_LABELS must be frozen');
});

test('GWT-70.1 given verification when buildVerifyView then ariaLabel is Verify', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: [],
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.equal(actual.ariaLabel, 'Verify', 'Verify panel must expose ariaLabel Verify');
});

test('GWT-70.1 given scanner actions when buildVerifyView then scannerActionsLines are strings', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: [{ name: 'semgrep', status: 'ok', detail: 'no match' }],
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: FINDING, verification });

  // -- Then --
  assert.ok(Array.isArray(actual.scannerActionsLines), 'scannerActionsLines must be an array');
  assert.ok(
    actual.scannerActionsLines.every((line) => typeof line === 'string' && line.length > 0),
    'each scanner action line must be a non-empty string'
  );
  assert.match(
    actual.scannerActionsLines[0],
    /semgrep/,
    'scanner action lines must name the scanner'
  );
});
