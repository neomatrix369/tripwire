/**
 * Branch-coverage probes for slice-70 verify rescan / view.
 *
 * Author: swami
 * Created: 2026-09-20
 * Scope: GWT-70.* remaining branches — title+source match, fingerprint
 *   mismatch, null/empty verification, whitespace patch, cleanup on fail,
 *   reasonText defaults, scannerActionsLines formatting
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyFixOnWorktree,
  createMemoryVerifyPort,
} from '../tripwire-verify-rescan.js';
import {
  OUTCOME_LABELS,
  buildVerifyView,
} from '../tripwire-verify-view.js';

const APPROVED_REPO_PATH = '/approved/repo';
const MINIMAL_PATCH = '--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n';

function finding(overrides = {}) {
  return {
    id: 'f-cov-1',
    title: 'Path traversal',
    source: 'read.js:9',
    howWeDecided: { final: 'true_positive' },
    ...overrides,
  };
}

/** Port that mutates the approved fingerprint after apply — contract-violation path. */
function createFingerprintMismatchPort(scanResult) {
  const calls = {
    applyPatch: [],
    runApplicableScanners: [],
    cleanup: [],
  };
  let fingerprintN = 0;
  return {
    calls,
    createTempCopy() {
      return '/tmp/verify-mismatch-temp';
    },
    applyPatch(tempPath, patch) {
      calls.applyPatch.push({ tempPath, patch });
      return { ok: true };
    },
    runApplicableScanners({ tempPath, finding: f }) {
      calls.runApplicableScanners.push({ tempPath, finding: f });
      return scanResult;
    },
    cleanup(tempPath) {
      calls.cleanup.push(tempPath);
    },
    approvedRepoFingerprint() {
      fingerprintN += 1;
      return fingerprintN === 1 ? 'fp-before' : 'fp-after';
    },
  };
}

const SCAN_GONE = {
  status: 'ok',
  findings: [],
  actions: [{ name: 'cargo-audit', status: 'ok', detail: 'clean' }],
};

const SCAN_MATCH_BY_TITLE_SOURCE = {
  status: 'ok',
  findings: [{ title: 'Path traversal', source: 'read.js:9' }],
  actions: [{ name: 'semgrep', status: 'ok', detail: 'match' }],
};

// ── Finding match by title+source (no id) ────────────────────────────────────

test('GWT-70.2 given match by title and source when verifyFixOnWorktree then still_present', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_MATCH_BY_TITLE_SOURCE });
  const f = finding({ id: 'different-id' });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: f,
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.outcome,
    'still_present',
    'same title+source must match even when id differs'
  );
});

test('GWT-70.1 given no id or title match when verifyFixOnWorktree then finding_gone', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({
    scanResult: {
      status: 'ok',
      findings: [{ id: 'other', title: 'Other issue', source: 'other.js:1' }],
      actions: [{ name: 'semgrep', status: 'ok' }],
    },
  });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: finding(),
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.outcome,
    'finding_gone',
    'unrelated scanner findings must not keep the original finding present'
  );
});

// ── Fingerprint mismatch ─────────────────────────────────────────────────────

test('GWT-70.1 given fingerprint mismatch when verifyFixOnWorktree then approvedRepoUnchanged is false', () => {
  // -- Given --
  const verifyPort = createFingerprintMismatchPort(SCAN_GONE);

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: finding(),
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    actual.approvedRepoUnchanged,
    false,
    'fingerprint change after verify is a contract violation'
  );
});

test('GWT-70.1 given fingerprint mismatch when verifyFixOnWorktree then applyPatch still uses temp path', () => {
  // -- Given --
  const verifyPort = createFingerprintMismatchPort(SCAN_GONE);

  // -- When --
  verifyFixOnWorktree({
    finding: finding(),
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(
    verifyPort.calls.applyPatch[0].tempPath,
    '/tmp/verify-mismatch-temp',
    'even a violating port must receive applyPatch only for the temp copy'
  );
});

// ── Whitespace / missing patch ───────────────────────────────────────────────

test('GWT-70.3 given whitespace patch when verifyFixOnWorktree then unable_to_verify no_patch', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: finding(),
    patch: '   \n\t  ',
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.outcome, 'unable_to_verify', 'whitespace-only patch must be unable_to_verify');
  assert.equal(actual.reason, 'no_patch', 'whitespace-only patch reason must be no_patch');
});

test('GWT-70.3 given null patch when verifyFixOnWorktree then unable_to_verify no_patch', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ scanResult: SCAN_GONE });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: finding(),
    patch: null,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.outcome, 'unable_to_verify', 'null patch must be unable_to_verify');
  assert.equal(actual.reason, 'no_patch', 'null patch reason must be no_patch');
});

test('GWT-70.3 given missing args when verifyFixOnWorktree then unable_to_verify', () => {
  // -- Given / When --
  const actual = verifyFixOnWorktree();

  // -- Then --
  assert.equal(actual.outcome, 'unable_to_verify', 'missing args must fail closed');
  assert.notEqual(actual.outcome, 'finding_gone', 'missing args must never claim finding_gone');
});

// ── Cleanup on apply fail ────────────────────────────────────────────────────

test('GWT-70.3 given apply failure when verifyFixOnWorktree then cleanup still runs', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({ applyOk: false, scanResult: SCAN_GONE });

  // -- When --
  verifyFixOnWorktree({
    finding: finding(),
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(verifyPort.calls.cleanup.length, 1, 'cleanup must run in finally after apply failure');
});

test('GWT-70.3 given applyOk false with port error when verifyFixOnWorktree then reason surfaces', () => {
  // -- Given --
  const verifyPort = createMemoryVerifyPort({
    applyOk: false,
    scanResult: SCAN_GONE,
  });

  // -- When --
  const actual = verifyFixOnWorktree({
    finding: finding(),
    patch: MINIMAL_PATCH,
    approvedRepoPath: APPROVED_REPO_PATH,
    verifyPort,
  });

  // -- Then --
  assert.equal(actual.reason, 'apply_failed', 'default apply failure reason is apply_failed');
  assert.equal(actual.verificationStatus, 'unable_to_verify', 'verificationStatus must mirror outcome');
});

// ── Null / empty verification view ───────────────────────────────────────────

test('GWT-70.3 given null verification when buildVerifyView then Unable to verify', () => {
  // -- Given --
  const input = { finding: finding(), verification: null };

  // -- When --
  const actual = buildVerifyView(input);

  // -- Then --
  assert.equal(
    actual.outcomeLabel,
    OUTCOME_LABELS.unable_to_verify,
    'null verification must treat as unable_to_verify'
  );
});

test('GWT-70.3 given null verification when buildVerifyView then reasonText reflects not_run', () => {
  // -- Given --
  const input = { finding: finding(), verification: null };

  // -- When --
  const actual = buildVerifyView(input);

  // -- Then --
  assert.match(
    actual.reasonText,
    /not_run|not run/i,
    'null verification reasonText must indicate not_run'
  );
});

test('GWT-70.3 given empty verification when buildVerifyView then claimedFixedForbidden is true', () => {
  // -- Given --
  const input = { finding: finding(), verification: {} };

  // -- When --
  const actual = buildVerifyView(input);

  // -- Then --
  assert.equal(
    actual.claimedFixedForbidden,
    true,
    'empty verification must forbid Fixed claims'
  );
});

test('GWT-70.3 given missing args when buildVerifyView then ariaLabel is Verify', () => {
  // -- Given / When --
  const actual = buildVerifyView();

  // -- Then --
  assert.equal(actual.ariaLabel, 'Verify', 'buildVerifyView must always expose ariaLabel Verify');
  assert.ok(
    typeof actual.honestyLine === 'string' && actual.honestyLine.length > 0,
    'honestyLine must always be present even with missing args'
  );
});

test('GWT-70.1 given finding_gone with empty reason when buildVerifyView then reasonText is empty', () => {
  // -- Given --
  const verification = {
    outcome: 'finding_gone',
    reason: null,
    scannerActions: [],
    approvedRepoUnchanged: true,
    verificationStatus: 'finding_gone',
  };

  // -- When --
  const actual = buildVerifyView({ finding: finding(), verification });

  // -- Then --
  assert.equal(actual.reasonText, '', 'finding_gone with null reason must leave reasonText empty');
});

test('GWT-70.2 given scanner action without detail when buildVerifyView then line still names scanner', () => {
  // -- Given --
  const verification = {
    outcome: 'still_present',
    reason: null,
    scannerActions: [{ name: 'pip-audit', status: 'ok' }],
    approvedRepoUnchanged: true,
    verificationStatus: 'still_present',
  };

  // -- When --
  const actual = buildVerifyView({ finding: finding(), verification });

  // -- Then --
  assert.equal(actual.scannerActionsLines.length, 1, 'one action must yield one line');
  assert.match(actual.scannerActionsLines[0], /pip-audit/, 'line must include scanner name');
  assert.match(actual.scannerActionsLines[0], /ok/, 'line must include status');
});

test('GWT-70.3 given unable with empty scannerActions when buildVerifyView then lines are empty', () => {
  // -- Given --
  const verification = {
    outcome: 'unable_to_verify',
    reason: 'no_patch',
    scannerActions: [],
    approvedRepoUnchanged: true,
    verificationStatus: 'unable_to_verify',
  };

  // -- When --
  const actual = buildVerifyView({ finding: finding(), verification });

  // -- Then --
  assert.deepEqual(actual.scannerActionsLines, [], 'no scanner actions must yield empty lines');
});
