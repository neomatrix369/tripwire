/**
 * Slice 69 Stream C — operator fix controls (pure ESM).
 * Mark fixed / won't-fix, patch copy helpers, J/K nav, progress, persistence.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-fix-controls.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-workflow-prefs.js
 *   EXTENSION-COST: would mix fix-decision keys with triage/expert prefs
 *   PARALLEL-RATIONALE: SLICE-69-CONTRACT assigns Stream C exclusive ownership
 */

import { isFixCandidate } from "./tripwire-fix-propose.js";

const FIX_KEY_PREFIX = "tripwire-fix:";

/**
 * @param {string} findingId
 * @returns {string}
 */
function fixKey(findingId) {
  return `${FIX_KEY_PREFIX}${findingId}`;
}

/**
 * @param {unknown} reason
 * @returns {boolean}
 */
export function requireWontFixReason(reason) {
  if (reason == null) return false;
  return String(reason).trim().length > 0;
}

/**
 * @param {{ status: string, reason?: string }} raw
 * @returns {{ status: 'fixed' }|{ status: 'wont_fix', reason: string }|null}
 */
function parseStoredDecision(raw) {
  if (raw?.status === "fixed") return { status: "fixed" };
  if (raw?.status === "wont_fix" && requireWontFixReason(raw.reason)) {
    return { status: "wont_fix", reason: String(raw.reason).trim() };
  }
  return null;
}

/**
 * @param {string} findingId
 * @param {{ getItem?: (k: string) => string|null }} [storage]
 * @returns {{ status: 'fixed' }|{ status: 'wont_fix', reason: string }|null}
 */
export function loadFixDecision(findingId, storage) {
  if (!storage?.getItem || findingId == null || findingId === "") return null;
  try {
    const raw = storage.getItem(fixKey(findingId));
    if (raw == null) return null;
    return parseStoredDecision(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * @param {string} findingId
 * @param {object} decision
 * @param {{ setItem?: (k: string, v: string) => void }} [storage]
 */
function persistDecision(findingId, decision, storage) {
  if (!storage?.setItem || findingId == null || findingId === "") return;
  try {
    storage.setItem(fixKey(findingId), JSON.stringify(decision));
  } catch {
    /* fail closed — do not throw */
  }
}

/**
 * @param {{ findingId: string, storage?: { setItem?: (k: string, v: string) => void } }} input
 */
export function markFixed({ findingId, storage }) {
  persistDecision(findingId, { status: "fixed" }, storage);
}

/**
 * @param {{ findingId: string, reason: unknown, storage?: { setItem?: (k: string, v: string) => void } }}
 * @returns {{ ok: true }|{ ok: false, error: 'reason_required' }}
 */
export function markWontFix({ findingId, reason, storage }) {
  if (!requireWontFixReason(reason)) {
    return { ok: false, error: "reason_required" };
  }
  persistDecision(
    findingId,
    { status: "wont_fix", reason: String(reason).trim() },
    storage,
  );
  return { ok: true };
}

/**
 * @param {Array<object>|null|undefined} findings
 * @param {{ getItem?: (k: string) => string|null }} [storage]
 * @returns {Array<object>}
 */
export function applyPersistedFixDecisions(findings, storage) {
  const list = findings ?? [];
  return list.map((finding) => {
    const stored = loadFixDecision(finding?.id, storage);
    if (stored == null) return finding;
    return { ...finding, fixDecision: stored };
  });
}

/**
 * @param {unknown} unifiedDiff
 * @returns {string}
 */
export function copyPatchText(unifiedDiff) {
  if (unifiedDiff == null) return "";
  return String(unifiedDiff);
}

/**
 * @param {unknown} unifiedDiff
 * @returns {string}
 */
export function gitApplyCommand(unifiedDiff) {
  const diff = copyPatchText(unifiedDiff);
  return `git apply <<'EOF'\n${diff}\nEOF`;
}

/**
 * @param {{ key?: string, index?: number, count?: number }}
 * @returns {{ index: number }}
 */
export function navigateFix({ key, index, count } = {}) {
  const total = Math.max(0, Number(count) || 0);
  const maxIndex = Math.max(0, total - 1);
  let next = Math.min(Math.max(Number(index) || 0, 0), maxIndex);
  if (key === "j" || key === "J") next = Math.min(next + 1, maxIndex);
  if (key === "k" || key === "K") next = Math.max(next - 1, 0);
  return { index: next };
}

/**
 * @param {unknown} decision
 * @returns {boolean}
 */
function isReviewedDecision(decision) {
  return decision?.status === "fixed" || decision?.status === "wont_fix";
}

/**
 * @param {object} finding
 * @param {Record<string, object>|null|undefined} decisions
 * @returns {object|null}
 */
function resolveDecision(finding, decisions) {
  const id = finding?.id;
  if (id != null && decisions?.[id]) return decisions[id];
  return finding?.fixDecision ?? null;
}

/**
 * @param {{ findings?: Array<object>, decisions?: Record<string, object> }}
 * @returns {{ reviewed: number, total: number, label: string }}
 */
export function buildFixProgress({ findings, decisions } = {}) {
  const candidates = (findings ?? []).filter(isFixCandidate);
  const total = candidates.length;
  const reviewed = candidates.filter((f) =>
    isReviewedDecision(resolveDecision(f, decisions)),
  ).length;
  return { reviewed, total, label: `${reviewed} of ${total} reviewed` };
}
