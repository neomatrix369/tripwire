/**
 * Slice 69 Stream A — fix propose view model (pure ESM).
 * Minimal unified diff, patch class label, regression suggestion, side-by-side view.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-fix-propose.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-investigate.js
 *   EXTENSION-COST: would mix investigate sections with fix diff generation and GWT-69.4 invariants
 *   PARALLEL-RATIONALE: SLICE-69-CONTRACT assigns Stream A exclusive ownership of this file
 */

export const PATCH_CLASSES = Object.freeze(["root_cause", "quick_patch"]);

const PATCH_CLASS_LABEL = Object.freeze({
  root_cause: "Root-cause fix",
  quick_patch: "Quick patch",
});

const VERIFICATION_STATUS = "not_verified";

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasText(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/**
 * @param {unknown} finding
 * @returns {boolean}
 */
function isEmptyFinding(finding) {
  if (finding == null) return true;
  if (typeof finding !== "object") return true;
  return Object.keys(finding).length === 0;
}

/**
 * @param {string|undefined|null} patchClass
 * @returns {'root_cause'|'quick_patch'}
 */
function resolvePatchClass(patchClass) {
  if (patchClass === "root_cause") return "root_cause";
  return "quick_patch";
}

/**
 * @param {Record<string, unknown>} fields
 * @returns {object}
 */
function finalizeFix(fields) {
  return {
    unifiedDiff: "",
    patchClass: "quick_patch",
    rootCause: "",
    regressionTest: "",
    source: "heuristic",
    ...fields,
    // GWT-69.4: force after spread so inbound claimedFixed/verified never win.
    verificationStatus: VERIFICATION_STATUS,
    claimedFixed: false,
  };
}

/**
 * @param {string|undefined|null} source
 * @returns {string}
 */
function parseSourceFile(source) {
  if (!hasText(source)) return "finding-target";
  const raw = String(source).trim();
  const colon = raw.lastIndexOf(":");
  if (colon > 0 && /^\d+$/.test(raw.slice(colon + 1))) return raw.slice(0, colon);
  return raw;
}

/**
 * @param {string|undefined|null} source
 * @param {string|undefined|null} evidence
 * @returns {string}
 */
function buildHeuristicDiff(source, evidence) {
  const file = parseSourceFile(source);
  const badLine = hasText(evidence) ? String(evidence).trim() : "/* vulnerable pattern */";
  const fixLine = `${badLine} // tripwire: remediate`;
  return [
    `--- a/${file}`,
    `+++ b/${file}`,
    "@@ -1,1 +1,1 @@",
    `-${badLine}`,
    `+${fixLine}`,
  ].join("\n");
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function heuristicRootCause(finding) {
  if (hasText(finding.explanation)) return String(finding.explanation);
  if (hasText(finding.evidenceHighlight)) {
    return `Vulnerable pattern at ${finding.source ?? "unknown"}: ${finding.evidenceHighlight}`;
  }
  return "Heuristic quick patch from finding metadata.";
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function heuristicRegressionTest(finding) {
  const label = finding.title ?? finding.id ?? "finding";
  const loc = finding.source ?? "reported location";
  return `Add regression test covering "${label}" at ${loc}.`;
}

/**
 * @param {Record<string, unknown>} patch
 * @param {'provided'|'generateFn'} source
 * @returns {object}
 */
function fromPatchFields(patch, source) {
  return finalizeFix({
    unifiedDiff: String(patch.unifiedDiff ?? ""),
    patchClass: resolvePatchClass(patch.patchClass),
    rootCause: String(patch.rootCause ?? ""),
    regressionTest: String(patch.regressionTest ?? ""),
    source,
  });
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {object}
 */
function fromHeuristic(finding) {
  return finalizeFix({
    unifiedDiff: buildHeuristicDiff(finding.source, finding.evidenceHighlight),
    patchClass: "quick_patch",
    rootCause: heuristicRootCause(finding),
    regressionTest: heuristicRegressionTest(finding),
    source: "heuristic",
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @returns {boolean}
 */
export function isFixCandidate(finding) {
  if (finding == null || typeof finding !== "object") return false;
  if (finding.howWeDecided?.final === "true_positive") return true;
  return finding.triageStatus === "to_fix";
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @param {{ generateFn?: (finding: Record<string, unknown>) => unknown }} [options]
 * @returns {object}
 */
export function buildProposedFix(finding, { generateFn } = {}) {
  if (isEmptyFinding(finding)) return finalizeFix({});

  const provided = finding.proposedPatch;
  if (provided && hasText(provided.unifiedDiff)) {
    return fromPatchFields(provided, "provided");
  }

  if (typeof generateFn === "function") {
    const generated = generateFn(finding);
    if (generated && typeof generated === "object") {
      return fromPatchFields(generated, "generateFn");
    }
  }

  return fromHeuristic(finding);
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function buildProblemText(finding) {
  const lines = [];
  if (hasText(finding.evidenceHighlight)) lines.push(String(finding.evidenceHighlight));
  if (hasText(finding.explanation)) lines.push(String(finding.explanation));
  if (hasText(finding.source) || hasText(finding.sink)) {
    const loc = [finding.source, finding.sink].filter(hasText).join(" → ");
    lines.push(`Flow: ${loc}`);
  }
  return lines.join("\n\n");
}

/**
 * @param {{ finding?: Record<string, unknown>, proposedFix?: Record<string, unknown> }} args
 * @returns {object}
 */
export function buildFixProposeView({ finding, proposedFix }) {
  const fix = proposedFix ?? finalizeFix({});
  const patchClass = resolvePatchClass(fix.patchClass);
  return {
    problemText: buildProblemText(finding ?? {}),
    diffText: String(fix.unifiedDiff ?? ""),
    patchClassLabel: PATCH_CLASS_LABEL[patchClass],
    regressionTest: String(fix.regressionTest ?? ""),
    verificationStatus: VERIFICATION_STATUS,
    claimedFixed: false,
    fixedClaimForbidden: true,
  };
}
