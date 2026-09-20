/**
 * Slice 70 Stream A — verify fix via worktree re-scan (pure ESM).
 * Applies patch on temp copy only; maps scanner port results to honesty outcomes.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-verify-rescan.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-apply-clean.js (temp apply + fingerprint port)
 *   EXTENSION-COST: would mix apply-clean boolean with verify outcome taxonomy and scanner rematch
 *   PARALLEL-RATIONALE: SLICE-70-CONTRACT assigns Stream A exclusive ownership of this file
 */

export const VERIFICATION_OUTCOMES = Object.freeze([
  "finding_gone",
  "still_present",
  "unable_to_verify",
]);

const UNABLE = "unable_to_verify";
const SCANNER_UNABLE = Object.freeze(["missing", "failed", "timeout"]);

/**
 * @param {string} outcome
 * @param {string|null} reason
 * @param {Array<{ name: string, status: string, detail?: string }>} scannerActions
 * @param {boolean} approvedRepoUnchanged
 */
function verificationResult(outcome, reason, scannerActions, approvedRepoUnchanged) {
  return {
    outcome,
    reason,
    scannerActions,
    approvedRepoUnchanged,
    verificationStatus: outcome,
  };
}

/**
 * @param {unknown} patch
 * @returns {string|null}
 */
function extractPatchText(patch) {
  if (patch == null) return null;
  if (typeof patch === "string") {
    return patch.trim().length > 0 ? patch : null;
  }
  if (typeof patch === "object" && typeof patch.unifiedDiff === "string") {
    return patch.unifiedDiff.trim().length > 0 ? patch.unifiedDiff : null;
  }
  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @param {Record<string, unknown>} scanned
 * @returns {boolean}
 */
function findingMatches(finding, scanned) {
  if (finding == null || scanned == null) return false;
  if (finding.id != null && scanned.id != null && finding.id === scanned.id) {
    return true;
  }
  if (finding.title == null || finding.source == null) return false;
  return scanned.title === finding.title && scanned.source === finding.source;
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @param {unknown} findings
 * @returns {boolean}
 */
function findingStillPresent(finding, findings) {
  if (!Array.isArray(findings)) return false;
  return findings.some((scanned) => findingMatches(finding, scanned));
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @param {{
 *   status?: string,
 *   findings?: Array<{ id?: unknown, title?: unknown, source?: unknown }>,
 *   actions?: Array<{ name: string, status: string, detail?: string }>,
 *   reason?: string
 * }|null|undefined} scan
 * @param {boolean} approvedRepoUnchanged
 */
function mapScanToOutcome(finding, scan, approvedRepoUnchanged) {
  const actions = Array.isArray(scan?.actions) ? scan.actions : [];
  const status = scan?.status;

  if (SCANNER_UNABLE.includes(status)) {
    return verificationResult(UNABLE, scan.reason ?? status, actions, approvedRepoUnchanged);
  }

  if (status === "ok") {
    if (findingStillPresent(finding, scan.findings)) {
      return verificationResult("still_present", null, actions, approvedRepoUnchanged);
    }
    return verificationResult("finding_gone", null, actions, approvedRepoUnchanged);
  }

  return verificationResult(UNABLE, scan?.reason ?? UNABLE, actions, approvedRepoUnchanged);
}

/**
 * Verify a proposed fix on a temp worktree copy — never writes the approved repo.
 *
 * @param {{
 *   finding?: Record<string, unknown>,
 *   patch?: unknown,
 *   approvedRepoPath?: string,
 *   verifyPort?: {
 *     createTempCopy: (approvedRepoPath: string) => string,
 *     applyPatch: (tempPath: string, patch: string) => { ok: boolean, error?: string },
 *     runApplicableScanners: (args: { tempPath: string, finding: unknown }) => {
 *       status: 'ok'|'failed'|'timeout'|'missing',
 *       findings: Array<{ id?: unknown, title?: unknown, source?: unknown }>,
 *       actions: Array<{ name: string, status: string, detail?: string }>,
 *       reason?: string
 *     },
 *     cleanup: (tempPath: string) => void,
 *     approvedRepoFingerprint: (path: string) => string
 *   }
 * }} [input]
 */
export function verifyFixOnWorktree({ finding, patch, approvedRepoPath, verifyPort } = {}) {
  const patchText = extractPatchText(patch);
  if (!patchText) {
    return verificationResult(UNABLE, "no_patch", [], true);
  }

  const before = verifyPort.approvedRepoFingerprint(approvedRepoPath);
  const tempPath = verifyPort.createTempCopy(approvedRepoPath);

  try {
    const applied = verifyPort.applyPatch(tempPath, patchText);
    const unchanged = before === verifyPort.approvedRepoFingerprint(approvedRepoPath);

    if (!applied.ok) {
      return verificationResult(UNABLE, applied.error ?? "apply_failed", [], unchanged);
    }

    const scan = verifyPort.runApplicableScanners({ tempPath, finding });
    return mapScanToOutcome(finding, scan, unchanged);
  } finally {
    verifyPort.cleanup(tempPath);
  }
}

/**
 * In-memory verify port for tests — records calls; stable fingerprint.
 *
 * @param {{
 *   applyOk?: boolean,
 *   scanResult?: {
 *     status: 'ok'|'failed'|'timeout'|'missing',
 *     findings?: Array<{ id?: unknown, title?: unknown, source?: unknown }>,
 *     actions?: Array<{ name: string, status: string, detail?: string }>,
 *     reason?: string
 *   }
 * }} [options]
 */
export function createMemoryVerifyPort({ applyOk = true, scanResult } = {}) {
  const calls = {
    createTempCopy: [],
    applyPatch: [],
    runApplicableScanners: [],
    cleanup: [],
    approvedRepoFingerprint: [],
  };
  const STABLE_FINGERPRINT = "tripwire-memory-verify-fingerprint";
  const defaultScan = {
    status: "ok",
    findings: [],
    actions: [{ name: "memory-scanner", status: "ok", detail: "no match" }],
  };
  const configuredScan = scanResult ?? defaultScan;

  return {
    calls,
    createTempCopy(approvedRepoPath) {
      calls.createTempCopy.push(approvedRepoPath);
      return `/tmp/tripwire-verify-temp-${calls.createTempCopy.length}`;
    },
    applyPatch(tempPath, patch) {
      calls.applyPatch.push({ tempPath, patch });
      if (!applyOk) return { ok: false, error: "apply_failed" };
      return { ok: true };
    },
    runApplicableScanners({ tempPath, finding }) {
      calls.runApplicableScanners.push({ tempPath, finding });
      return {
        status: configuredScan.status,
        findings: configuredScan.findings ?? [],
        actions: configuredScan.actions ?? [],
        reason: configuredScan.reason,
      };
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
