/**
 * Single source of truth for Tripwire dashboard status / severity → color.
 *
 * Two orthogonal concepts:
 * 1. Scan *execution* status (did the scan run finish?)
 * 2. Scan *result* severity (when it finished, how bad are the vulns?)
 *
 * Risk thresholds mirror db/schema.sql tripwire_rollup_item:
 *   risk >= 1.5 → red; risk >= 0.5 → amber; else green.
 */

export const STATUS_META = {
  red: { color: "#f43f5e", label: "RED", glyph: "●" },
  amber: { color: "#f59e0b", label: "AMBER", glyph: "▲" },
  green: { color: "#34d399", label: "GREEN", glyph: "✓" },
  grey: { color: "#6b7a8e", label: "UNSCANNED", glyph: "–" },
  running: { color: "#4da2ff", label: "SCANNING", glyph: "◌" },
  error: { color: "#a78bfa", label: "ERROR", glyph: "!" },
};

/** Result colors only (completed scans with a risk bucket). */
export const RESULT_STATUSES = new Set(["red", "amber", "green"]);

/**
 * Map risk_score → heatmap bucket (aligned with tripwire_rollup_item).
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
 * Highest actionable finding severity (green/info findings do not raise the card).
 * @param {Array<{severity?: string}>|null|undefined} findings
 * @returns {'red'|'amber'|null}
 */
export function maxFindingStatus(findings) {
  if (!findings || !findings.length) return null;
  let hasAmber = false;
  for (const f of findings) {
    const sev = normalizeSeverity(f.severity);
    if (sev === "red") return "red";
    if (sev === "amber") hasAmber = true;
  }
  return hasAmber ? "amber" : null;
}

/**
 * Normalize upstream / DB severity strings to Tripwire buckets.
 * CRITICAL/HIGH → red; MEDIUM/LOW → amber; INFO/green soft → green.
 * @param {string|null|undefined} raw
 * @returns {'red'|'amber'|'green'|null}
 */
export function normalizeSeverity(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "red" || s === "critical" || s === "high") return "red";
  if (s === "amber" || s === "medium" || s === "low" || s === "warn" || s === "warning") {
    return "amber";
  }
  if (s === "green" || s === "info" || s === "informational") return "green";
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
export function resolveItemStatus({
  runStatus = null,
  heatmapStatus = null,
  riskScore = null,
  findings = null,
} = {}) {
  if (runStatus === "running") return "running";
  if (runStatus === "failed") return "error";

  if (runStatus === "complete" || runStatus === "partial-failed") {
    if (RESULT_STATUSES.has(heatmapStatus)) return heatmapStatus;
    const fromRisk = statusFromRisk(riskScore);
    if (fromRisk !== "grey") return fromRisk;
    const fromFindings = maxFindingStatus(findings);
    if (fromFindings) return fromFindings;
    // Completed/partial with nothing scorable → execution error (matches rollup).
    return "error";
  }

  if (!runStatus) {
    if (RESULT_STATUSES.has(heatmapStatus)) return heatmapStatus;
    if (heatmapStatus === "error") return "error";
    if (heatmapStatus === "grey" || heatmapStatus == null) return "grey";
    return heatmapStatus;
  }

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
  completed: { color: STATUS_META.green.color, label: "✓ Completed" },
  skipped_missing_credential: { color: STATUS_META.grey.color, label: "⊘ Skipped" },
  unreachable: { color: STATUS_META.error.color, label: "✗ Unreachable" },
  not_applicable: { color: "#506880", label: "— N/A" },
  failed: { color: STATUS_META.error.color, label: "✗ Failed" },
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

export default {
  STATUS_META,
  RESULT_STATUSES,
  STATUS_FROM_RISK: statusFromRisk,
  statusFromRisk,
  maxFindingStatus,
  normalizeSeverity,
  resolveItemStatus,
  severityColor,
  SCANNER_EXEC_META,
  scannerExecMeta,
  decorateStatus,
};
