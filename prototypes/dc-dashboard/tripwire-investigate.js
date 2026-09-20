/**
 * Slice 68/71 — investigate view (pure section list).
 * Slice 75 — final-judge + evidence honesty (GWT-75.2 / 75.4).
 * Order: title/severity → evidence → source/sink → explanation → verdict →
 * attack path → prerequisites → evidence verification → how we decided (collapsed).
 * Expert mode enriches how_we_decided with judges, models, confidence, IDs, scanner, flow.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-investigate.js
 *   CLOSEST-EXISTING: prototypes/dc-dashboard/tripwire-workflow-stepper.js
 *   EXTENSION-COST: would couple stepper step-ids with investigate section composition
 *   PARALLEL-RATIONALE: SLICE-68/71 contracts assign exclusive ownership of this file
 */

import {
  buildFinalJudgeNarration,
  formatEvidenceVerification,
  honestAbsentCopy,
} from "./tripwire-workflow-pipeline.js";

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

/** Conceptual expert field keys listed in hiddenInSimple when Expert is off. */
const EXPERT_HIDDEN = Object.freeze({
  rawJudges: "raw_judges",
  modelIds: "model_ids",
  confidence: "confidence",
  weaknessIds: "weakness_ids",
  scannerDetails: "scanner_details",
  dataFlow: "data_flow",
});

const FINAL_VERDICTS = Object.freeze(
  new Set(["true_positive", "false_positive", "needs_review"]),
);

const JUDGE_PANEL_PENDING_RE = /judge\s*panel\s*pending/i;

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
 * Replace misattributed "judge panel pending" placeholders with honest copy.
 * @param {unknown} value
 * @param {'attack_path'|'prerequisites'|'evidence'|'verdict'} kind
 * @returns {string}
 */
function sanitizeFieldCopy(value, kind) {
  if (!hasText(value)) return "";
  const text = String(value);
  if (JUDGE_PANEL_PENDING_RE.test(text)) return honestAbsentCopy(kind);
  return text;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string|null}
 */
function resolveFinalVerdict(finding) {
  const panel = finding.judgePanel;
  const candidates = [
    finding.howWeDecided?.final,
    finding.finalVerdict,
    finding.final_verdict,
    panel?.finalVerdict,
    panel?.final_verdict,
    panel?.final_judge?.verdict,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const key = String(candidate).trim();
    if (FINAL_VERDICTS.has(key)) return key;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {boolean}
 */
function resolveDisagreement(finding) {
  if (finding.disagreement != null) return Boolean(finding.disagreement);
  if (finding.howWeDecided?.disagreement != null) {
    return Boolean(finding.howWeDecided.disagreement);
  }
  if (finding.judgePanel?.disagreement != null) {
    return Boolean(finding.judgePanel.disagreement);
  }
  return false;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string|null}
 */
function resolveFinalReason(finding) {
  const panel = finding.judgePanel;
  const reason =
    finding.finalReason ??
    finding.howWeDecided?.finalReason ??
    finding.howWeDecided?.reason ??
    panel?.finalReason ??
    panel?.final_reason ??
    panel?.final_judge?.reason ??
    null;
  return hasText(reason) ? String(reason) : null;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string|null}
 */
function resolveFinalModel(finding) {
  const panel = finding.judgePanel;
  const model =
    finding.finalModel ??
    finding.howWeDecided?.finalModel ??
    panel?.finalModel ??
    panel?.final_model ??
    panel?.final_judge?.model ??
    null;
  return hasText(model) ? String(model) : null;
}

/**
 * @param {Record<string, unknown>} finding
 * @param {boolean} expertMode
 * @returns {{ finalLine: string, disagreementLine: string }|null}
 */
function finalJudgeNarration(finding, expertMode) {
  const finalVerdict = resolveFinalVerdict(finding);
  if (!finalVerdict) return null;
  return buildFinalJudgeNarration({
    mode: "present",
    panelOff: false,
    finalVerdict,
    finalReason: resolveFinalReason(finding),
    finalModel: expertMode ? resolveFinalModel(finding) : null,
    disagreement: resolveDisagreement(finding),
  });
}

/**
 * @param {{ title?: string, severity?: string, agreement?: string }} finding
 * @param {{ finalLine: string, disagreementLine: string }|null} narration
 * @returns {string}
 */
function titleSeverityBody(finding, narration) {
  const parts = [finding.title, finding.severity].filter(hasText);
  const head = parts.join(" · ");
  // Prefer final-judge disagreement narration over vote-count agreement alone.
  if (narration) return head;
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
 * @param {Record<string, unknown>} finding
 * @param {{ finalLine: string, disagreementLine: string }|null} narration
 * @returns {string}
 */
function verdictBody(finding, narration) {
  if (narration) {
    const lines = [narration.finalLine];
    if (hasText(narration.disagreementLine)) lines.push(narration.disagreementLine);
    return lines.join("\n");
  }
  const cleaned = sanitizeFieldCopy(finding.verdictLine, "verdict");
  if (hasText(cleaned)) return cleaned;
  return "";
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function evidenceVerificationBody(finding) {
  const hasKey =
    Object.prototype.hasOwnProperty.call(finding, "evidenceVerification") ||
    Object.prototype.hasOwnProperty.call(finding, "evidence_status") ||
    Object.prototype.hasOwnProperty.call(finding, "evidenceStatus");
  if (!hasKey) return "";

  const raw =
    finding.evidenceVerification ??
    finding.evidence_status ??
    finding.evidenceStatus;

  if (hasText(raw) && JUDGE_PANEL_PENDING_RE.test(String(raw))) {
    return formatEvidenceVerification(null);
  }
  return formatEvidenceVerification(raw);
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {unknown[]|null}
 */
function judgeSlots(finding) {
  const hwdJudges = finding.howWeDecided?.judges;
  if (Array.isArray(hwdJudges)) return hwdJudges;
  const slots = finding.judgePanel?.slots;
  if (Array.isArray(slots)) return slots;
  return null;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {unknown}
 */
function resolveJudges(finding) {
  const hwd = finding.howWeDecided;
  if (hwd?.judges != null) return hwd.judges;
  const slots = finding.judgePanel?.slots;
  if (Array.isArray(slots) && slots.length > 0) return slots;
  return null;
}

/**
 * @param {unknown} judges
 * @returns {string}
 */
function formatJudges(judges) {
  if (typeof judges === "string") return judges;
  if (!Array.isArray(judges)) return JSON.stringify(judges);
  return judges.map(formatOneJudge).join("; ");
}

/**
 * @param {unknown} entry
 * @returns {string}
 */
function formatOneJudge(entry) {
  if (entry == null || typeof entry !== "object") return String(entry);
  const ans = entry.answer ?? entry.raw ?? entry.verdict ?? entry.reason ?? "";
  const id = entry.slot ?? entry.id ?? "";
  if (hasText(id) && hasText(ans)) return `${id}=${ans}`;
  if (hasText(ans)) return String(ans);
  return JSON.stringify(entry);
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
 * @param {unknown} value
 * @returns {string[]}
 */
function asIdList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(hasText).map(String);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string[]}
 */
function collectModelIds(finding) {
  const slots = judgeSlots(finding) || [];
  return slots
    .map((s) => (s && typeof s === "object" ? s.modelId ?? s.model : null))
    .filter(hasText)
    .map(String);
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string[]}
 */
function collectConfidences(finding) {
  const fromSlots = (judgeSlots(finding) || [])
    .map((s) => (s && typeof s === "object" ? s.confidence : null))
    .filter((c) => c != null && c !== "");
  if (fromSlots.length) return fromSlots.map(String);
  if (finding.confidence != null && finding.confidence !== "") {
    return [String(finding.confidence)];
  }
  return [];
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string[]}
 */
function collectWeaknessIds(finding) {
  return [
    ...asIdList(finding.cwe_ids),
    ...asIdList(finding.weaknessIds),
    ...asIdList(finding.ai_sec_ids),
  ];
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function formatScanner(finding) {
  const details = finding.scannerDetails ?? finding.scanner;
  if (details == null || details === "") return "";
  if (typeof details === "object") return `Scanner: ${JSON.stringify(details)}`;
  return `Scanner: ${details}`;
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function formatDataFlow(finding) {
  if (hasText(finding.dataFlow)) return `Data flow: ${finding.dataFlow}`;
  if (hasText(finding.source) && hasText(finding.sink)) {
    return `Data flow: ${finding.source} → ${finding.sink}`;
  }
  return "";
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {boolean}
 */
function hasExpertExtras(finding) {
  if (resolveJudges(finding) != null) return true;
  if (collectModelIds(finding).length) return true;
  if (collectConfidences(finding).length) return true;
  if (collectWeaknessIds(finding).length) return true;
  if (hasText(finding.scannerDetails) || hasText(finding.scanner)) return true;
  if (finding.scannerDetails != null && typeof finding.scannerDetails === "object") {
    return true;
  }
  return Boolean(formatDataFlow(finding));
}

/**
 * @param {Record<string, unknown>} finding
 * @returns {string}
 */
function expertHowWeDecidedBody(finding) {
  const hwd = finding.howWeDecided || {};
  const parts = [];
  const narration = finalJudgeNarration(finding, true);
  if (narration) {
    parts.push(narration.finalLine);
    if (hasText(narration.disagreementLine)) parts.push(narration.disagreementLine);
  } else if (hasText(hwd.final)) {
    parts.push(`Final: ${hwd.final}`);
  }
  const judges = resolveJudges(finding);
  if (judges != null) parts.push(`Judges: ${formatJudges(judges)}`);
  if (hwd.rawIds != null) parts.push(`Raw IDs: ${formatRawIds(hwd.rawIds)}`);
  const models = collectModelIds(finding);
  if (models.length) parts.push(`Model IDs: ${models.join(", ")}`);
  const conf = collectConfidences(finding);
  if (conf.length) parts.push(`Confidence: ${conf.join(", ")}`);
  const weakness = collectWeaknessIds(finding);
  if (weakness.length) parts.push(`Weakness IDs: ${weakness.join(", ")}`);
  const scanner = formatScanner(finding);
  if (scanner) parts.push(scanner);
  const flow = formatDataFlow(finding);
  if (flow) parts.push(flow);
  return parts.join("\n");
}

/**
 * @param {Record<string, unknown>} finding
 * @param {boolean} expertMode
 * @param {{ finalLine: string, disagreementLine: string }|null} narration
 * @returns {string}
 */
function howWeDecidedBody(finding, expertMode, narration) {
  if (expertMode) return expertHowWeDecidedBody(finding);

  const hwd = finding.howWeDecided || {};
  const parts = [];
  if (narration) {
    parts.push(narration.finalLine);
    if (hasText(narration.disagreementLine)) parts.push(narration.disagreementLine);
  } else if (hasText(hwd.final)) {
    parts.push(String(hwd.final));
  }
  if (!narration && hasText(finding.agreement)) {
    parts.push(`Agreement: ${finding.agreement}`);
  }
  return parts.join("\n");
}

/**
 * @param {Record<string, unknown>} finding
 * @param {boolean} expertMode
 * @returns {Record<string, string>}
 */
function resolveBodies(finding, expertMode) {
  const narration = finalJudgeNarration(finding, expertMode);
  return {
    titleSeverity: titleSeverityBody(finding, narration),
    evidenceHighlight: finding.evidenceHighlight ?? "",
    sourceSink: sourceSinkBody(finding),
    explanation: finding.explanation ?? "",
    verdictLine: verdictBody(finding, narration),
    attackPath: sanitizeFieldCopy(finding.attackPath, "attack_path"),
    prerequisites: sanitizeFieldCopy(finding.prerequisites, "prerequisites"),
    evidenceVerification: evidenceVerificationBody(finding),
    howWeDecided: howWeDecidedBody(finding, expertMode, narration),
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
    if (expertMode) {
      return hasText(body) || finding.howWeDecided != null || hasExpertExtras(finding);
    }
    return (
      finding.howWeDecided != null ||
      hasText(finding.agreement) ||
      resolveFinalVerdict(finding) != null
    );
  }
  return hasText(body);
}

/**
 * @param {Record<string, unknown>} finding
 * @param {boolean} howIncluded
 * @returns {string[]}
 */
function collectHiddenInSimple(finding, howIncluded) {
  const hidden = [];
  if (howIncluded) hidden.push("how_we_decided");
  if (resolveJudges(finding) != null || finding.howWeDecided?.rawIds != null) {
    hidden.push(EXPERT_HIDDEN.rawJudges);
  }
  if (collectModelIds(finding).length) hidden.push(EXPERT_HIDDEN.modelIds);
  if (collectConfidences(finding).length) hidden.push(EXPERT_HIDDEN.confidence);
  if (collectWeaknessIds(finding).length) hidden.push(EXPERT_HIDDEN.weaknessIds);
  if (formatScanner(finding)) hidden.push(EXPERT_HIDDEN.scannerDetails);
  if (formatDataFlow(finding)) hidden.push(EXPERT_HIDDEN.dataFlow);
  return hidden;
}

/**
 * Build ordered investigate sections for one finding.
 * @param {{ finding: Record<string, unknown>, expertMode?: boolean }} args
 * @returns {{ sections: Array<{ id: string, title: string, body: string, collapsed?: boolean }>, hiddenInSimple: string[] }}
 */
export function buildInvestigateView({ finding, expertMode = false }) {
  const f = finding || {};
  const bodies = resolveBodies(f, expertMode);
  const sections = [];

  for (const def of SECTION_DEFS) {
    const body = String(bodies[def.field] ?? "");
    if (!shouldInclude(def.id, body, expertMode, f)) continue;

    const section = { id: def.id, title: def.title, body };
    if (def.id === "how_we_decided") section.collapsed = true;
    sections.push(section);
  }

  if (expertMode) return { sections, hiddenInSimple: [] };

  const howIncluded = sections.some((s) => s.id === "how_we_decided");
  return { sections, hiddenInSimple: collectHiddenInSimple(f, howIncluded) };
}
