/**
 * Slice 69 Stream B — apply-clean evaluation on temp copy (pure ESM).
 * applyPatch runs only against tempPath; approved repo is fingerprint-checked, never written.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-apply-clean.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-fix-propose.js (patch text only)
 *   EXTENSION-COST: would mix generation with temp-apply I/O port seam
 *   PARALLEL-RATIONALE: SLICE-69-CONTRACT assigns Stream B exclusive ownership
 */

/** @returns {{ applyClean: false, approvedRepoUnchanged: true, appliedTo: 'none', error: null }} */
function emptyApplyResult() {
  return {
    applyClean: false,
    approvedRepoUnchanged: true,
    appliedTo: "none",
    error: null,
  };
}

/**
 * @param {unknown} patch
 * @returns {boolean}
 */
function hasPatchText(patch) {
  if (patch == null || typeof patch !== "string") return false;
  return patch.trim().length > 0;
}

/**
 * @param {boolean} ok
 * @param {boolean} approvedRepoUnchanged
 * @param {string|undefined} error
 */
function tempApplyResult(ok, approvedRepoUnchanged, error) {
  return {
    applyClean: ok,
    approvedRepoUnchanged,
    appliedTo: "temp",
    error: ok ? null : (error ?? "apply_failed"),
  };
}

/**
 * Evaluate whether a patch applies cleanly on a temporary copy of the approved repo.
 *
 * @param {{ patch?: string, approvedRepoPath?: string, applyPort?: {
 *   snapshotApprovedRepo: (path: string) => string,
 *   createTempCopy: (approvedRepoPath: string) => string,
 *   applyPatch: (tempPath: string, patch: string) => { ok: boolean, error?: string },
 *   cleanup: (tempPath: string) => void,
 *   approvedRepoFingerprint: (path: string) => string
 * } }} [input]
 */
export function evaluateApplyClean({ patch, approvedRepoPath, applyPort } = {}) {
  if (!hasPatchText(patch)) return emptyApplyResult();

  applyPort.snapshotApprovedRepo(approvedRepoPath);
  const before = applyPort.approvedRepoFingerprint(approvedRepoPath);
  const tempPath = applyPort.createTempCopy(approvedRepoPath);

  try {
    const result = applyPort.applyPatch(tempPath, patch);
    const unchanged = before === applyPort.approvedRepoFingerprint(approvedRepoPath);
    return tempApplyResult(result.ok, unchanged, result.error);
  } finally {
    applyPort.cleanup(tempPath);
  }
}

/** In-memory apply port for tests — records calls; stable fingerprint. */
export function createMemoryApplyPort() {
  const calls = {
    snapshotApprovedRepo: [],
    createTempCopy: [],
    applyPatch: [],
    cleanup: [],
    approvedRepoFingerprint: [],
  };
  const STABLE_FINGERPRINT = "tripwire-memory-fingerprint";

  return {
    calls,
    snapshotApprovedRepo(path) {
      calls.snapshotApprovedRepo.push(path);
      return `snap-${calls.snapshotApprovedRepo.length}`;
    },
    createTempCopy(approvedRepoPath) {
      calls.createTempCopy.push(approvedRepoPath);
      return `/tmp/tripwire-temp-${calls.createTempCopy.length}`;
    },
    applyPatch(tempPath, patch) {
      calls.applyPatch.push({ tempPath, patch });
      // Memory port: +++ is enough to treat the payload as a unified diff.
      // Real git apply lives in slice 70's worktree port — not this prototype.
      if (typeof patch === "string" && patch.includes("+++")) {
        return { ok: true };
      }
      return { ok: false, error: "invalid_patch" };
    },
    cleanup(tempPath) {
      calls.cleanup.push(tempPath);
    },
    approvedRepoFingerprint(path) {
      calls.approvedRepoFingerprint.push(path);
      return STABLE_FINGERPRINT;
    },
  };
}
