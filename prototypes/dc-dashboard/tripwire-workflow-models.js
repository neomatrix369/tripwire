/**
 * Slice 74 — workflow stage model labels (pure ESM).
 * Defaults SSOT for stepper tabs; actuals from judges / router / fix provenance.
 *
 * WHY-NEW-FILE: prototypes/dc-dashboard/tripwire-workflow-models.js
 *   CLOSEST-EXISTING: tripwire-workflow-stepper.js (labels only)
 *   EXTENSION-COST: stepper owns step state; model SSOT + actual extraction is a
 *   separate concern (router/judge/fix fields) and must stay reusable from panels
 *   PARALLEL-RATIONALE: SLICE-74-CONTRACT owns stage model display
 */

/** Configured default aliases per workflow step (product SSOT). */
export const STAGE_DEFAULT_MODELS = Object.freeze({
  run: Object.freeze(["gen-4b", "gen-27b"]),
  triage: Object.freeze(["gen-4b"]),
  investigate: Object.freeze(["gen-4b", "qwen3.8-max"]),
  fix: Object.freeze(["gen-27b"]),
  verify: Object.freeze([]),
  report: Object.freeze([]),
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
  const ids = STAGE_DEFAULT_MODELS[stepId];
  return formatModelHint(ids ?? []);
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
 * @param {{ sie: string|null, modelStudio: string|null }} router
 * @returns {string[]}
 */
function routerIds(router) {
  const out = [];
  if (router.sie) out.push(router.sie);
  if (router.modelStudio) out.push(router.modelStudio);
  return out;
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
  if (stepId === "run") {
    const actual = collectJudgeModelIds(judges);
    if (actual.length) return `Models used: ${formatModelHint(actual)}`;
    if (!fallbackToDefaults) return "";
    const hint = defaultModelHintForStep("run");
    return hint ? `Models (default): ${hint}` : "";
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
    if (parts.length) return `Models used: ${parts.join(" · ")}`;
    if (!fallbackToDefaults || !finding) return "";
    const hint = defaultModelHintForStep(stepId);
    return hint ? `Models (default): ${hint}` : "";
  }

  if (stepId === "fix") {
    const modelId = extractFixModelId(finding, proposedFix);
    if (modelId) return `Models used: ${modelId}`;
    const source = proposedFix?.source ?? finding?.proposedPatch?.source;
    if (source === "heuristic") return "Models used: heuristic (no LLM)";
    if (!fallbackToDefaults) return "";
    const hint = defaultModelHintForStep("fix");
    return hint ? `Models (default): ${hint}` : "";
  }

  // verify / report — only when actuals exist
  const router = extractRouterModels(finding);
  const routerLine = formatRouterModelsLine(router);
  if (routerLine) return `Models used: ${routerLine}`;
  return "";
}
