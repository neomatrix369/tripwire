/**
 * Slice 74 — workflow stage model labels (pure ESM).
 * Defaults SSOT for stepper tabs; actuals from judges / router / fix provenance.
 * Soft-amend (slice 75): role-aware hints + parent-prefixed models lines.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-workflow-models.js
 *   CLOSEST-EXISTING: tripwire-workflow-stepper.js (labels only)
 *   EXTENSION-COST: stepper owns step state; model SSOT + actual extraction is a
 *   separate concern (router/judge/fix fields) and must stay reusable from panels
 *   PARALLEL-RATIONALE: SLICE-74-CONTRACT owns stage model display
 */

import { formatParentTargetMeta } from "./tripwire-workflow-pipeline.js";

/** Configured default aliases per workflow step (product SSOT).
 * Fix stays empty until an LLM propose path is the product default — today
 * propose is heuristic, so advertising gen-27b on the tab contradicted the panel.
 */
export const STAGE_DEFAULT_MODELS = Object.freeze({
  run: Object.freeze(["gen-4b", "gen-27b"]),
  triage: Object.freeze(["gen-4b"]),
  investigate: Object.freeze(["gen-4b", "qwen3.8-max"]),
  fix: Object.freeze([]),
  verify: Object.freeze([]),
  report: Object.freeze([]),
});

const ROLE_AWARE_HINTS = Object.freeze({
  run: "panel (light/mid): gen-4b · final (stronger): gen-27b",
  triage: "SIE triage: gen-4b",
  investigate: "SIE · Model Studio: gen-4b · qwen3.8-max",
});

/**
 * @param {unknown} ids
 * @returns {string}
 */
export function formatModelHint(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return "";
  const cleaned = ids.map((id) => String(id ?? "").trim()).filter(Boolean);
  if (!cleaned.length) return "";
  return cleaned.join(" · ");
}

/**
 * @param {string} stepId
 * @returns {string}
 */
export function defaultModelHintForStep(stepId) {
  if (Object.prototype.hasOwnProperty.call(ROLE_AWARE_HINTS, stepId)) {
    return ROLE_AWARE_HINTS[stepId];
  }
  const ids = STAGE_DEFAULT_MODELS[stepId];
  return formatModelHint(ids ?? []);
}

/**
 * Prefix a models line with parent type · name when finding is present.
 *
 * @param {string} line
 * @param {Record<string, unknown>|null|undefined} finding
 * @returns {string}
 */
export function appendParentTargetMeta(line, finding) {
  if (!line) return "";
  const meta = formatParentTargetMeta(finding);
  if (!meta) return line;
  return `${meta} — ${line}`;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function asModelId(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

/**
 * Distinct model IDs from judge panel slots.
 * @param {{ slots?: Array }|null|undefined} judges
 * @returns {string[]}
 */
export function collectJudgeModelIds(judges) {
  const slots = judges?.slots;
  if (!Array.isArray(slots)) return [];
  const seen = new Set();
  const out = [];
  for (const slot of slots) {
    if (!slot || typeof slot !== "object") continue;
    const id = asModelId(slot.modelId ?? slot.model);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Router models from finding envelope / nested models object.
 * @param {Record<string, unknown>|null|undefined} finding
 * @returns {{ sie: string|null, modelStudio: string|null }}
 */
export function extractRouterModels(finding) {
  if (!finding || typeof finding !== "object") {
    return { sie: null, modelStudio: null };
  }
  const models =
    finding.models ||
    finding.routerModels ||
    finding.howWeDecided?.models ||
    null;
  if (!models || typeof models !== "object") {
    return { sie: null, modelStudio: null };
  }
  return {
    sie: asModelId(models.sie),
    modelStudio: asModelId(models.model_studio ?? models.modelStudio),
  };
}

/**
 * Format router actuals preferentially as SIE=… · MS=… when either field present.
 * @param {{ sie: string|null, modelStudio: string|null }} router
 * @returns {string}
 */
export function formatRouterModelsLine(router) {
  if (!router.sie && !router.modelStudio) return "";
  const sie = router.sie || "—";
  const ms = router.modelStudio || "—";
  return `SIE=${sie} · MS=${ms}`;
}

/**
 * @param {Record<string, unknown>|null|undefined} finding
 * @param {Record<string, unknown>|null|undefined} proposedFix
 * @returns {string|null}
 */
export function extractFixModelId(finding, proposedFix) {
  const fromFix = asModelId(
    proposedFix?.modelId ?? proposedFix?.model ?? proposedFix?.models?.fix
  );
  if (fromFix) return fromFix;

  const patch = finding?.proposedPatch;
  if (patch && typeof patch === "object") {
    const fromPatch = asModelId(patch.modelId ?? patch.model);
    if (fromPatch) return fromPatch;
  }

  const source = proposedFix?.source ?? finding?.proposedPatch?.source;
  if (source === "heuristic" || source === "provided") return null;
  if (source === "generateFn") {
    return asModelId(proposedFix?.modelId ?? proposedFix?.model);
  }
  return null;
}

/**
 * Role-labelled Run actuals: panel vs final when distinguishable.
 *
 * @param {{ slots?: Array, finalModel?: unknown, final_model?: unknown }|null|undefined} judges
 * @returns {string}
 */
function formatRunActualsBody(judges) {
  const panelIds = collectJudgeModelIds(judges);
  const finalId = asModelId(judges?.finalModel ?? judges?.final_model);
  if (!panelIds.length && !finalId) return "";
  if (panelIds.length && finalId) {
    return `panel: ${formatModelHint(panelIds)} · final: ${finalId}`;
  }
  if (finalId) return `final: ${finalId}`;
  return `panel: ${formatModelHint(panelIds)}`;
}

/**
 * Actual models-used line for a workflow panel.
 *
 * @param {{
 *   stepId: string,
 *   judges?: { slots?: Array }|null,
 *   finding?: Record<string, unknown>|null,
 *   proposedFix?: Record<string, unknown>|null,
 *   fallbackToDefaults?: boolean
 * }} args
 * @returns {string} empty when nothing to show
 */
export function buildModelsUsedLine({
  stepId,
  judges = null,
  finding = null,
  proposedFix = null,
  fallbackToDefaults = true,
} = {}) {
  let line = "";

  if (stepId === "run") {
    const actualBody = formatRunActualsBody(judges);
    if (actualBody) {
      line = `Models used: ${actualBody}`;
    } else if (fallbackToDefaults) {
      const hint = defaultModelHintForStep("run");
      line = hint ? `Models (default): ${hint}` : "";
    }
    return appendParentTargetMeta(line, finding);
  }

  if (stepId === "triage" || stepId === "investigate") {
    const router = extractRouterModels(finding);
    const routerLine = formatRouterModelsLine(router);
    const judgeIds = collectJudgeModelIds({
      slots: finding?.judgePanel?.slots || finding?.howWeDecided?.judges || [],
    });
    const parts = [];
    if (routerLine) parts.push(routerLine);
    if (judgeIds.length) parts.push(`judges: ${formatModelHint(judgeIds)}`);
    if (parts.length) {
      line = `Models used: ${parts.join(" · ")}`;
    } else if (fallbackToDefaults && finding) {
      const hint = defaultModelHintForStep(stepId);
      line = hint ? `Models (default): ${hint}` : "";
    }
    return appendParentTargetMeta(line, finding);
  }

  if (stepId === "fix") {
    const modelId = extractFixModelId(finding, proposedFix);
    if (modelId) {
      line = `Models used: ${modelId}`;
    }
    // Heuristic / provided patches did not call an LLM — do not invent a model line
    // that fights an empty Fix tab hint (or a future configured default).
    return appendParentTargetMeta(line, finding);
  }

  // verify / report — only when actuals exist
  const router = extractRouterModels(finding);
  const routerLine = formatRouterModelsLine(router);
  if (routerLine) {
    line = `Models used: ${routerLine}`;
  }
  return appendParentTargetMeta(line, finding);
}
