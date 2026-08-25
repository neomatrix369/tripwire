/**
 * Single source of truth for Tripwire dashboard status / severity → color.
 *
 * Two orthogonal concepts:
 * 1. Scan *execution* status (did the scan run finish?)
 * 2. Scan *result* severity (when it finished, how bad are the vulns?)
 *
 * heatmap_status / card colour = worst-of actionable findings (aligned with
 * tripwire_rollup_item). risk_score remains weighted density for sort/trend;
 * statusFromRisk is only a fallback when heatmap and findings are unscorable.
 */

export const STATUS_META = {
  // Hex must equal Tripwire.dc.html :root --*-ink (CSS owns the SSOT).
  red: { color: "#B42318", label: "RED", glyph: "●" }, // must equal --red-ink
  amber: { color: "#8B5A00", label: "AMBER", glyph: "▲" }, // must equal --amber-ink
  green: { color: "#0F766E", label: "GREEN", glyph: "✓" }, // must equal --green-ink
  grey: { color: "#6B645A", label: "UNSCANNED", glyph: "–" }, // must equal --text-muted
  running: { color: "#0E7490", label: "SCANNING", glyph: "◌" }, // must equal --signal-ink
  error: { color: "#6D28D9", label: "ERROR", glyph: "!" }, // must equal --violet-ink
};

/** Result colors only (completed scans with a risk bucket). */
export const RESULT_STATUSES = new Set(["red", "amber", "green"]);

/**
 * Map risk_score → density bucket (sort/trend fallback only — not card SSOT).
 * @param {number|null|undefined} risk
 * @returns {'red'|'amber'|'green'|'grey'}
 */
export function statusFromRisk(risk) {
  if (risk == null || Number.isNaN(Number(risk))) return "grey";
  const r = Number(risk);
  if (r >= 1.5) return "red";
  if (r >= 0.5) return "amber";
  return "green";
}

/**
 * @param {{scanner?: string, scanner_source?: string}|null|undefined} f
 */
function isRouterFinding(f) {
  const src = f?.scanner || f?.scanner_source || "";
  return src === "tiered_router";
}

/**
 * Highest actionable finding severity (green/info findings do not raise the card).
 * @param {Array<{severity?: string, scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @returns {'red'|'amber'|null}
 */
export function maxFindingStatus(findings) {
  if (!findings || !findings.length) return null;
  let hasAmber = false;
  for (const f of findings) {
    if (isRouterFinding(f)) continue;
    const sev = normalizeSeverity(f.severity);
    if (sev === "red") return "red";
    if (sev === "amber") hasAmber = true;
  }
  return hasAmber ? "amber" : null;
}

/**
 * Count actionable (red/amber) findings; exclude tiered_router.
 * @param {Array<{severity?: string, scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @returns {{ red: number, amber: number, total: number }}
 */
export function countActionableFindings(findings) {
  let red = 0;
  let amber = 0;
  if (!findings) return { red: 0, amber: 0, total: 0 };
  for (const f of findings) {
    if (isRouterFinding(f)) continue;
    const sev = normalizeSeverity(f.severity);
    if (sev === "red") red += 1;
    else if (sev === "amber") amber += 1;
  }
  return { red, amber, total: red + amber };
}

/**
 * When both red and amber are present, return counts for split chips; else null.
 * @param {Array<{severity?: string, scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @returns {{ red: number, amber: number }|null}
 */
export function findingCountParts(findings) {
  const { red, amber } = countActionableFindings(findings);
  return red > 0 && amber > 0 ? { red, amber } : null;
}

/**
 * Card chip label: "1 finding" / "3 findings" / "2● 1▲" when mixed.
 * Empty string when no actionable findings.
 * @param {Array<{severity?: string, scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @returns {string}
 */
export function formatFindingCountLabel(findings) {
  const { red, amber, total } = countActionableFindings(findings);
  if (total === 0) return "";
  if (red > 0 && amber > 0) return `${red}● ${amber}▲`;
  if (total === 1) return "1 finding";
  return `${total} findings`;
}

/**
 * Drawer Findings heading — same actionable total / split as card chips.
 * @param {Array<{severity?: string, scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @param {string|null|undefined} errorMessage
 * @returns {string}
 */
export function formatFindingsHeadingLabel(findings, errorMessage) {
  const { red, amber, total } = countActionableFindings(findings);
  if (errorMessage && total === 0) return String(errorMessage);
  if (red > 0 && amber > 0) return `Findings (${red}● ${amber}▲)`;
  return `Findings (${total})`;
}

const SEVERITY_RED = new Set(["red", "critical", "high"]);
const SEVERITY_AMBER = new Set(["amber", "medium", "low", "warn", "warning"]);
const SEVERITY_GREEN = new Set(["green", "info", "informational"]);

/**
 * Normalize upstream / DB severity strings to Tripwire buckets.
 * CRITICAL/HIGH → red; MEDIUM/LOW → amber; INFO/green soft → green.
 * @param {string|null|undefined} raw
 * @returns {'red'|'amber'|'green'|null}
 */
export function normalizeSeverity(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase();
  if (SEVERITY_RED.has(s)) return "red";
  if (SEVERITY_AMBER.has(s)) return "amber";
  if (SEVERITY_GREEN.has(s)) return "green";
  return null;
}

/**
 * Resolve the card/heatmap status for a skill or MCP item.
 * Execution status wins over stale heatmap while a run is in flight.
 *
 * @param {{
 *   runStatus?: string|null,
 *   heatmapStatus?: string|null,
 *   riskScore?: number|null,
 *   findings?: Array<{severity?: string}>|null,
 * }} input
 * @returns {'red'|'amber'|'green'|'grey'|'running'|'error'}
 */
function resolveCompletedStatus(heatmapStatus, riskScore, findings) {
  // Worst-of findings wins over stale density-era heatmap / risk buckets.
  const fromFindings = maxFindingStatus(findings);
  if (fromFindings) return fromFindings;
  if (RESULT_STATUSES.has(heatmapStatus)) return heatmapStatus;
  const fromRisk = statusFromRisk(riskScore);
  if (fromRisk !== "grey") return fromRisk;
  // Completed/partial with nothing scorable → execution error (matches rollup).
  return "error";
}

function resolveNoRunStatus(heatmapStatus) {
  if (RESULT_STATUSES.has(heatmapStatus)) return heatmapStatus;
  if (heatmapStatus === "error") return "error";
  if (heatmapStatus === "grey" || heatmapStatus == null) return "grey";
  return heatmapStatus;
}

export function resolveItemStatus({
  runStatus,
  heatmapStatus,
  riskScore,
  findings,
} = {}) {
  if (runStatus === "running") return "running";
  if (runStatus === "failed") return "error";
  if (runStatus === "complete" || runStatus === "partial-failed") {
    return resolveCompletedStatus(heatmapStatus, riskScore, findings);
  }
  if (!runStatus) return resolveNoRunStatus(heatmapStatus);
  if (RESULT_STATUSES.has(heatmapStatus)) return heatmapStatus;
  if (heatmapStatus === "error") return "error";
  return statusFromRisk(riskScore);
}

/**
 * Color for a finding severity chip / left border.
 * @param {string|null|undefined} severity
 * @returns {string} hex color
 */
export function severityColor(severity) {
  const key = normalizeSeverity(severity);
  if (key && STATUS_META[key]) return STATUS_META[key].color;
  return STATUS_META.grey.color;
}

/**
 * Scanner *execution* status colors (not vulnerability severity).
 * Unreachable/failed use violet (error), not vuln-red.
 */
export const SCANNER_EXEC_META = {
  running: { color: STATUS_META.running.color, label: "◌ Running" },
  completed: { color: STATUS_META.green.color, label: "✓ Completed" },
  skipped_missing_credential: { color: STATUS_META.grey.color, label: "⊘ Skipped" },
  needs_setup: { color: STATUS_META.amber.color, label: "Needs Setup" },
  unreachable: { color: STATUS_META.error.color, label: "✗ Unreachable" },
  not_applicable: { color: STATUS_META.grey.color, label: "— N/A" },
  failed: { color: STATUS_META.error.color, label: "✗ Failed" },
  not_available_yet: {
    color: STATUS_META.grey.color,
    label: "Not Available Yet",
  },
};

/**
 * @param {string|null|undefined} scannerStatus
 * @returns {{ color: string, label: string }}
 */
export function scannerExecMeta(scannerStatus) {
  return (
    SCANNER_EXEC_META[scannerStatus] || {
      color: STATUS_META.grey.color,
      label: scannerStatus || "unknown",
    }
  );
}

/**
 * Attach flat color fields for templates (avoids nested meta.* binding issues).
 * @param {keyof typeof STATUS_META|string} status
 */
export function decorateStatus(status) {
  const meta = STATUS_META[status] || STATUS_META.grey;
  return {
    status,
    meta,
    statusColor: meta.color,
    statusLabel: meta.label,
    statusGlyph: meta.glyph,
  };
}

/** Operator-facing chrome for risk density (GWT-42.8 / 42.10). */
export const RISK_TOOLTIP_KNOWN =
  "Risk density = weighted finding density for sort/trend (not card colour).\n" +
  "Formula: (3×red + 1×amber) ÷ completed scanner checks. Router findings excluded.\n" +
  "Range: 0 = clean density; higher = denser weighted findings (unbounded; ≥1.5 is high-density fallback).\n" +
  "Card colour (RED/AMBER/GREEN) = worst actionable finding, independent of this number.";

export const RISK_TOOLTIP_UNKNOWN =
  "Risk density is unknown until a completed or partial-failed scan produces a rollup — not zero risk.\n" +
  "Formula when scored: (3×red + 1×amber) ÷ completed scanner checks (router findings excluded).\n" +
  "Card colour is independent of this number.";

/**
 * @param {string|null|undefined} riskLabel displayed value (`0.75` or `—`)
 * @returns {string}
 */
export function riskTooltip(riskLabel) {
  if (riskLabel == null || riskLabel === "—" || riskLabel === "") {
    return RISK_TOOLTIP_UNKNOWN;
  }
  return RISK_TOOLTIP_KNOWN;
}

/**
 * Compact risk density badge (parity with Tessl `Q N`).
 * @param {string|null|undefined} riskLabel
 * @returns {string} e.g. `R 0.75` or `R —`
 */
export function formatRiskBadge(riskLabel) {
  const value = riskLabel == null || riskLabel === "" ? "—" : String(riskLabel);
  return `R ${value}`;
}

/**
 * Long-form risk chrome (list header / aria); prefer `formatRiskBadge` on cards.
 * @param {string|null|undefined} riskLabel
 * @returns {string} e.g. `Risk density 0.75`
 */
export function formatRiskDensityLabel(riskLabel) {
  const value = riskLabel == null || riskLabel === "" ? "—" : String(riskLabel);
  return `Risk density ${value}`;
}

/**
 * Tessl quality badge + tooltip + schedule cue for skill cards (GWT-42.6–42.9).
 * MCP / non-skills → null (omit badge).
 *
 * @param {{
 *   type?: string,
 *   quality?: number|null,
 *   lastScan?: string|null,
 *   status?: string|null,
 *   identifier?: string|null,
 *   name?: string|null,
 * }} item
 * @returns {{
 *   badge: string,
 *   tone: 'known'|'unknown-unscanned'|'unknown-unscored',
 *   tooltip: string,
 *   scheduleCue: string|null,
 * }|null}
 */
export function qualitySurfacing(item) {
  if (!item || item.type !== "skill") return null;

  const qualityKnown =
    typeof item.quality === "number" && !Number.isNaN(item.quality);
  const neverScanned = !item.lastScan && item.status === "grey";
  const tone = qualityKnown
    ? "known"
    : neverScanned
      ? "unknown-unscanned"
      : "unknown-unscored";
  const badge = qualityKnown
    ? `Q ${Math.round(item.quality)}`
    : neverScanned
      ? "Q —"
      : "Q ?";
  const scanTarget = item.identifier || item.name || "<name>";
  const scheduleCue =
    tone === "known"
      ? null
      : `Schedule: tripwire scan ${scanTarget} --force`;

  return {
    badge,
    tone,
    tooltip: qualityTooltip(tone),
    scheduleCue,
  };
}

/**
 * @param {'known'|'unknown-unscanned'|'unknown-unscored'|string} tone
 * @returns {string}
 */
export function qualityTooltip(tone) {
  const base =
    "Tessl quality = quality review score from Tessl (not security risk / not card colour).\n" +
    "Range: 0–100 (higher is better). Source: tessl review run quality --json → items.quality_score.";
  if (tone === "unknown-unscanned") {
    return `${base}\nQ — = never scanned / no Tessl score yet.`;
  }
  if (tone === "unknown-unscored") {
    return (
      `${base}\nQ ? = scanned but Tessl did not yield a score — schedule: tripwire scan <id> --force.`
    );
  }
  return base;
}

/** Plain-language install locus (GWT-42.10). */
export function operatorLocusLabel(v) {
  return (
    {
      local: "Local",
      cloud: "Cloud",
      unknown: "Location unknown",
    }[v] || v
  );
}

/** Plain-language source availability (GWT-42.10). */
export function operatorAvailLabel(v) {
  return (
    {
      source_on_disk: "On disk",
      cloneable: "Cloneable",
      introspection_only: "No local source",
      unavailable: "Unavailable",
      unknown: "Scanability unknown",
    }[v] || v
  );
}

/**
 * Ordered Tessl scanner_source values shown as a contiguous Scanner Outputs block.
 */
export const TESSL_CAPABILITY_SOURCES = Object.freeze([
  "Tessl: Lint",
  "Tessl: Review (Quality)",
  "Tessl: Scenario Generation",
  "Tessl: Eval",
  "Tessl: Review (Security)",
]);

function tesslPlaceholderRow(source) {
  return {
    source,
    status: "not_available_yet",
    checks_run: null,
    duration_ms: null,
    output: {},
  };
}

function tesslRowsFrom(bySource) {
  return TESSL_CAPABILITY_SOURCES.map(
    (source) => bySource.get(source) ?? tesslPlaceholderRow(source)
  );
}

function insertTesslBlock(others, tesslRows) {
  const insertAt = others.findIndex(
    (row) =>
      String(row.source ?? "").localeCompare("Tessl", undefined, {
        sensitivity: "base",
      }) > 0
  );
  const idx = insertAt === -1 ? others.length : insertAt;
  return [...others.slice(0, idx), ...tesslRows, ...others.slice(idx)];
}

/**
 * Pad missing Tessl capabilities with UI-only sentinels. DB rows win.
 * MCP / non-Tessl scans are returned unchanged.
 * @param {Array<{source?: string}>|null|undefined} rows
 * @returns {Array<{source?: string, status?: string}>}
 */
export function mergeTesslCapabilityRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const bySource = new Map(
    list
      .filter((row) => TESSL_CAPABILITY_SOURCES.includes(row.source))
      .map((row) => [row.source, row])
  );
  if (bySource.size === 0) return list.slice();
  const others = list.filter(
    (row) => !TESSL_CAPABILITY_SOURCES.includes(row.source)
  );
  others.sort((a, b) =>
    String(a.source ?? "").localeCompare(String(b.source ?? ""), undefined, {
      sensitivity: "base",
    })
  );
  return insertTesslBlock(others, tesslRowsFrom(bySource));
}

/**
 * Tessl inner-card quality line when score may be missing (GWT-42.7 / 42.9).
 * @param {{ source?: string, status?: string, output?: { quality_score?: number|null } }|null|undefined} scanner
 * @param {{ identifier?: string, name?: string }|null|undefined} item
 * @returns {{
 *   show: boolean,
 *   label: string,
 *   headerBadge: string,
 *   tooltip: string,
 *   scheduleCue: string|null,
 * }|null}
 */
export function tesslInnerQuality(scanner, item) {
  const src = String(scanner?.source || "");
  if (src !== "Tessl: Review (Quality)") return null;

  const score = scanner?.output?.quality_score;
  const known = typeof score === "number" && !Number.isNaN(score);
  const unreachable =
    scanner?.status === "unreachable" || scanner?.status === "failed";
  const label = known
    ? `Tessl quality ${Math.round(score)}/100`
    : unreachable
      ? "Tessl quality not scored (unreachable)"
      : "Tessl quality not scored";
  const scanTarget = item?.identifier || item?.name || "<name>";
  return {
    show: true,
    label,
    headerBadge: known ? `Q ${Math.round(score)}` : "Q ?",
    tooltip: qualityTooltip(known ? "known" : "unknown-unscored"),
    scheduleCue: known ? null : `Schedule: tripwire scan ${scanTarget} --force`,
  };
}

const TESSL_QUALITY_SOURCE = "Tessl: Review (Quality)";

function tesslUpstreamIds(scanner) {
  return scanner?.upstream_run_ids || scanner?.output?.upstream_run_ids || {};
}

/**
 * UI-level Quality↔Security traceability (GWT-51.3). No live Tessl CLI fetch.
 * @param {{ source?: string, upstream_run_ids?: { review_quality?: string|null }, output?: { upstream_run_ids?: { review_quality?: string|null } } }|null|undefined} scanner
 * @returns {{ qualityId: string, source: string }|null}
 */
export function securityQualityLink(scanner) {
  if (String(scanner?.source || "") !== "Tessl: Review (Security)") return null;
  const qualityId = tesslUpstreamIds(scanner).review_quality;
  if (!qualityId) return null;
  return { qualityId, source: TESSL_QUALITY_SOURCE };
}

/**
 * Quality findings shown beside Security when the Quality run ID is linked.
 * @param {object|null|undefined} scanner
 * @param {Array<{scanner?: string, scanner_source?: string}>|null|undefined} findings
 * @returns {Array<object>}
 */
export function linkedQualityFindingsForSecurity(scanner, findings) {
  if (!securityQualityLink(scanner)) return [];
  return (findings || []).filter(
    (f) => (f.scanner || f.scanner_source) === TESSL_QUALITY_SOURCE
  );
}

export default {
  STATUS_META,
  RESULT_STATUSES,
  STATUS_FROM_RISK: statusFromRisk,
  statusFromRisk,
  maxFindingStatus,
  countActionableFindings,
  findingCountParts,
  formatFindingCountLabel,
  formatFindingsHeadingLabel,
  normalizeSeverity,
  resolveItemStatus,
  severityColor,
  SCANNER_EXEC_META,
  scannerExecMeta,
  decorateStatus,
  RISK_TOOLTIP_KNOWN,
  RISK_TOOLTIP_UNKNOWN,
  riskTooltip,
  formatRiskBadge,
  formatRiskDensityLabel,
  qualitySurfacing,
  qualityTooltip,
  operatorLocusLabel,
  operatorAvailLabel,
  tesslInnerQuality,
  securityQualityLink,
  linkedQualityFindingsForSecurity,
  TESSL_CAPABILITY_SOURCES,
  mergeTesslCapabilityRows,
};
