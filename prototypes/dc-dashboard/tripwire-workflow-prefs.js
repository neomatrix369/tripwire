/**
 * Slice 68 Stream E — expert toggle + triage decision persistence.
 * Pure ESM; storage is injected (sessionStorage-/localStorage-like getItem/setItem).
 */

const EXPERT_MODE_KEY = "tripwire-expert-mode";
const TRIAGE_KEY_PREFIX = "tripwire-triage:";

/**
 * FNV-1a 32-bit — deterministic, no crypto, no DOM.
 * @param {string} input
 * @returns {string} 8-char hex
 */
function fnv1aHex(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * @param {{ getItem?: (k: string) => string|null }} [storage]
 * @returns {boolean}
 */
export function loadExpertMode(storage) {
  if (!storage?.getItem) return false;
  try {
    return storage.getItem(EXPERT_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} enabled
 * @param {{ setItem?: (k: string, v: string) => void }} [storage]
 */
export function saveExpertMode(enabled, storage) {
  if (!storage?.setItem) return;
  storage.setItem(EXPERT_MODE_KEY, enabled ? "true" : "false");
}

/**
 * Prefer finding.id; else deterministic id from title|severity|evidenceHighlight.
 * @param {{ id?: string, title?: string, severity?: string, evidenceHighlight?: string }|null|undefined} finding
 * @returns {string}
 */
export function stableFindingId(finding) {
  const id = finding?.id;
  if (id != null && String(id) !== "") return String(id);
  const material = [
    finding?.title ?? "",
    finding?.severity ?? "",
    finding?.evidenceHighlight ?? "",
  ].join("|");
  return `gen:${fnv1aHex(material)}`;
}

/**
 * @param {string} id
 * @returns {string}
 */
function triageKey(id) {
  return `${TRIAGE_KEY_PREFIX}${id}`;
}

/**
 * @param {string} id
 * @param {{ getItem?: (k: string) => string|null }} [storage]
 * @returns {string|null}
 */
export function loadTriageDecision(id, storage) {
  if (!storage?.getItem || id == null || id === "") return null;
  try {
    return storage.getItem(triageKey(id));
  } catch {
    return null;
  }
}

/**
 * @param {string} id
 * @param {string} status
 * @param {{ setItem?: (k: string, v: string) => void }} [storage]
 */
export function saveTriageDecision(id, status, storage) {
  if (!storage?.setItem || id == null || id === "") return;
  storage.setItem(triageKey(id), status);
}

/**
 * Overlay persisted triageStatus onto findings (immutable new array).
 * @param {Array<object>|null|undefined} findings
 * @param {{ getItem?: (k: string) => string|null }} [storage]
 * @returns {Array<object>}
 */
export function applyPersistedTriage(findings, storage) {
  const list = findings ?? [];
  return list.map((finding) => {
    const stored = loadTriageDecision(stableFindingId(finding), storage);
    if (stored == null) return finding;
    return { ...finding, triageStatus: stored };
  });
}
