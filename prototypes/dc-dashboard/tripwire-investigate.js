/**
 * Slice 68 Stream D — investigate view (pure section list).
 * Order: title/severity → evidence → source/sink → explanation → verdict →
 * attack path → prerequisites → evidence verification → how we decided (collapsed).
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-investigate.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-workflow-stepper.js
 *   EXTENSION-COST: would couple stepper step-ids with investigate section composition
 *   PARALLEL-RATIONALE: SLICE-68-CONTRACT assigns Stream D exclusive ownership of this file
 */

const SECTION_DEFS = Object.freeze([
  Object.freeze({ id: "title_severity", title: "Finding", field: "titleSeverity" }),
  Object.freeze({ id: "evidence", title: "Evidence", field: "evidenceHighlight" }),
  Object.freeze({ id: "source_sink", title: "Source / sink", field: "sourceSink" }),
  Object.freeze({ id: "explanation", title: "Explanation", field: "explanation" }),
  Object.freeze({ id: "verdict", title: "Verdict", field: "verdictLine" }),
  Object.freeze({ id: "attack_path", title: "Attack path", field: "attackPath" }),
  Object.freeze({ id: "prerequisites", title: "Prerequisites", field: "prerequisites" }),
  Object.freeze({
    id: "evidence_verification",
    title: "Evidence verification",
    field: "evidenceVerification",
  }),
  Object.freeze({ id: "how_we_decided", title: "How we decided", field: "howWeDecided" }),
]);

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
 * @param {{ title?: string, severity?: string, agreement?: string }} finding
 * @returns {string}
 */
function titleSeverityBody(finding) {
  const parts = [finding.title, finding.severity].filter(hasText);
  const head = parts.join(" · ");
  if (!hasText(finding.agreement)) return head;
  return `${head}\nAgreement: ${finding.agreement}`;
}

/**
 * @param {{ source?: string, sink?: string }} finding
 * @returns {string}
 */
function sourceSinkBody(finding) {
  const lines = [];
  if (hasText(finding.source)) lines.push(`Source: ${finding.source}`);
  if (hasText(finding.sink)) lines.push(`Sink: ${finding.sink}`);
  return lines.join("\n");
}

/**
 * @param {{ howWeDecided?: { judges?: unknown, final?: string, rawIds?: unknown }, agreement?: string }} finding
 * @param {boolean} expertMode
 * @returns {string}
 */
function howWeDecidedBody(finding, expertMode) {
  const hwd = finding.howWeDecided || {};
  if (!expertMode) {
    const parts = [];
    if (hasText(hwd.final)) parts.push(String(hwd.final));
    if (hasText(finding.agreement)) parts.push(`Agreement: ${finding.agreement}`);
    return parts.join("\n");
  }
  return expertHowWeDecidedBody(hwd);
}

/**
 * @param {{ judges?: unknown, final?: string, rawIds?: unknown }} hwd
 * @returns {string}
 */
function expertHowWeDecidedBody(hwd) {
  const parts = [];
  if (hasText(hwd.final)) parts.push(`Final: ${hwd.final}`);
  if (hwd.judges != null) parts.push(`Judges: ${formatJudges(hwd.judges)}`);
  if (hwd.rawIds != null) parts.push(`Raw IDs: ${formatRawIds(hwd.rawIds)}`);
  return parts.join("\n");
}

/**
 * @param {unknown} judges
 * @returns {string}
 */
function formatJudges(judges) {
  if (typeof judges === "string") return judges;
  return JSON.stringify(judges);
}

/**
 * @param {unknown} rawIds
 * @returns {string}
 */
function formatRawIds(rawIds) {
  if (Array.isArray(rawIds)) return rawIds.join(", ");
  if (typeof rawIds === "string") return rawIds;
  return JSON.stringify(rawIds);
}

/**
 * @param {Record<string, unknown>} finding
 * @param {boolean} expertMode
 * @returns {Record<string, string>}
 */
function resolveBodies(finding, expertMode) {
  return {
    titleSeverity: titleSeverityBody(finding),
    evidenceHighlight: finding.evidenceHighlight ?? "",
    sourceSink: sourceSinkBody(finding),
    explanation: finding.explanation ?? "",
    verdictLine: finding.verdictLine ?? "",
    attackPath: finding.attackPath ?? "",
    prerequisites: finding.prerequisites ?? "",
    evidenceVerification: finding.evidenceVerification ?? "",
    howWeDecided: howWeDecidedBody(finding, expertMode),
  };
}

/**
 * @param {string} id
 * @param {string} body
 * @param {boolean} expertMode
 * @param {Record<string, unknown>} finding
 * @returns {boolean}
 */
function shouldInclude(id, body, expertMode, finding) {
  if (id === "source_sink") return hasText(finding.source) || hasText(finding.sink);
  if (id === "how_we_decided") {
    if (expertMode) return hasText(body) || finding.howWeDecided != null;
    return finding.howWeDecided != null || hasText(finding.agreement);
  }
  return hasText(body);
}

/**
 * Build ordered investigate sections for one finding.
 * @param {{ finding: Record<string, unknown>, expertMode?: boolean }} args
 * @returns {{ sections: Array<{ id: string, title: string, body: string, collapsed?: boolean }>, hiddenInSimple: string[] }}
 */
export function buildInvestigateView({ finding, expertMode = false }) {
  const bodies = resolveBodies(finding || {}, expertMode);
  const sections = [];
  const hiddenInSimple = [];

  for (const def of SECTION_DEFS) {
    const body = String(bodies[def.field] ?? "");
    if (!shouldInclude(def.id, body, expertMode, finding || {})) continue;

    const section = { id: def.id, title: def.title, body };
    if (def.id === "how_we_decided") section.collapsed = true;
    sections.push(section);

    if (!expertMode && def.id === "how_we_decided") {
      hiddenInSimple.push(def.id);
    }
  }

  return { sections, hiddenInSimple };
}
