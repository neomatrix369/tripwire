/**
 * Slice 70 Stream B — Verify step view model (pure ESM).
 * Outcome labels, scanner action lines, honesty copy for the dashboard Verify panel.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-verify-view.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-fix-propose.js
 *   EXTENSION-COST: would mix fix-propose generation with Verify outcome labels and honesty invariants
 *   PARALLEL-RATIONALE: SLICE-70-CONTRACT assigns Stream B exclusive ownership of this file
 */

export const OUTCOME_LABELS = Object.freeze({
  finding_gone: "Finding gone",
  still_present: "Still present",
  unable_to_verify: "Unable to verify",
});

const DEFAULT_OUTCOME = "unable_to_verify";
const DEFAULT_REASON = "not_run";

const REASON_TEXT = Object.freeze({
  not_run: "Verification has not run",
  no_patch: "No patch to verify",
  apply_failed: "Patch failed to apply on temp worktree",
  missing: "Applicable scanner missing",
  failed: "Scanner failed",
  timeout: "Scanner timed out",
});

const HONESTY_FINDING_GONE =
  "Verified on temp worktree — approved repo unchanged";
const HONESTY_NOT_GONE =
  "Not claimed fixed — verified only on temp worktree when scanners complete";

/**
 * @param {unknown} verification
 * @returns {boolean}
 */
function isEmptyVerification(verification) {
  if (verification == null) return true;
  if (typeof verification !== "object") return true;
  return Object.keys(verification).length === 0;
}

/**
 * @param {unknown} verification
 * @returns {'finding_gone'|'still_present'|'unable_to_verify'}
 */
function resolveOutcome(verification) {
  if (isEmptyVerification(verification)) return DEFAULT_OUTCOME;
  const raw = verification.outcome ?? verification.verificationStatus;
  if (raw === "finding_gone" || raw === "still_present" || raw === "unable_to_verify") {
    return raw;
  }
  return DEFAULT_OUTCOME;
}

/**
 * @param {unknown} verification
 * @param {string} outcome
 * @returns {string}
 */
function resolveReasonCode(verification, outcome) {
  if (isEmptyVerification(verification)) return DEFAULT_REASON;
  if (outcome !== "unable_to_verify") return "";
  const raw = verification.reason;
  if (raw == null || raw === "") return DEFAULT_REASON;
  return String(raw);
}

/**
 * @param {string} reasonCode
 * @returns {string}
 */
function humanReasonText(reasonCode) {
  if (!reasonCode) return "";
  return REASON_TEXT[reasonCode] ?? reasonCode;
}

/**
 * @param {{ name?: string, status?: string, detail?: string }} action
 * @returns {string}
 */
function formatScannerAction(action) {
  const name = action?.name ? String(action.name) : "scanner";
  const status = action?.status ? String(action.status) : "unknown";
  if (action?.detail) return `${name}: ${status} — ${action.detail}`;
  return `${name}: ${status}`;
}

/**
 * @param {unknown} verification
 * @returns {string[]}
 */
function buildScannerActionLines(verification) {
  if (isEmptyVerification(verification)) return [];
  const actions = verification.scannerActions;
  if (!Array.isArray(actions)) return [];
  return actions.map(formatScannerAction);
}

/**
 * @param {string} outcome
 * @returns {string}
 */
function honestyForOutcome(outcome) {
  if (outcome === "finding_gone") return HONESTY_FINDING_GONE;
  return HONESTY_NOT_GONE;
}

/**
 * Build Verify step view model.
 *
 * @param {{ finding?: unknown, verification?: unknown }} [input]
 * @returns {{
 *   outcomeLabel: string,
 *   reasonText: string,
 *   scannerActionsLines: string[],
 *   honestyLine: string,
 *   claimedFixedForbidden: boolean,
 *   ariaLabel: string
 * }}
 */
export function buildVerifyView({ finding: _finding, verification } = {}) {
  const outcome = resolveOutcome(verification);
  const reasonCode = resolveReasonCode(verification, outcome);
  return {
    outcomeLabel: OUTCOME_LABELS[outcome],
    reasonText: humanReasonText(reasonCode),
    scannerActionsLines: buildScannerActionLines(verification),
    honestyLine: honestyForOutcome(outcome),
    claimedFixedForbidden: outcome !== "finding_gone",
    ariaLabel: "Verify",
  };
}
