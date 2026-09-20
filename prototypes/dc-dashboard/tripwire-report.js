/**
 * Slice 71 Stream C — Report view builder (pure ESM).
 * Headline (fixed / left / won't fix) + one primary export action.
 */

const DISPOSITIONS = Object.freeze(["fixed", "left", "wont_fix"]);

const SEVERITY_RANK = Object.freeze({
  high: 0,
  medium: 1,
  low: 2,
});

/**
 * @param {string|undefined|null} severity
 * @returns {number}
 */
function severityRank(severity) {
  if (severity == null) return 99;
  const key = String(severity).toLowerCase();
  return SEVERITY_RANK[key] ?? 99;
}

/**
 * Prefer reportDisposition when set; else map triageStatus.
 * @param {{ reportDisposition?: string, triageStatus?: string }|null|undefined} finding
 * @returns {'fixed'|'left'|'wont_fix'}
 */
export function resolveReportDisposition(finding) {
  const raw = finding?.reportDisposition;
  if (typeof raw === "string" && DISPOSITIONS.includes(raw)) {
    return /** @type {'fixed'|'left'|'wont_fix'} */ (raw);
  }
  const status = finding?.triageStatus;
  if (status === "dismissed") return "wont_fix";
  if (status === "fixed") return "fixed";
  return "left";
}

/**
 * @param {Array<object>|null|undefined} findings
 * @returns {{ fixed: number, left: number, wontFix: number }}
 */
function countDispositions(findings) {
  const counts = { fixed: 0, left: 0, wontFix: 0 };
  if (!Array.isArray(findings)) return counts;
  for (const f of findings) {
    const d = resolveReportDisposition(f);
    if (d === "fixed") counts.fixed += 1;
    else if (d === "wont_fix") counts.wontFix += 1;
    else counts.left += 1;
  }
  return counts;
}

/**
 * @param {{ fixed: number, left: number, wontFix: number }} counts
 * @returns {string}
 */
function buildHeadline(counts) {
  return `${counts.fixed} fixed · ${counts.left} left · ${counts.wontFix} won't fix`;
}

/**
 * @param {Array<object>|null|undefined} findings
 * @returns {Array<object>}
 */
function sortFindings(findings) {
  const list = Array.isArray(findings) ? findings.slice() : [];
  return list.sort(
    (a, b) => severityRank(a?.severity) - severityRank(b?.severity),
  );
}

/**
 * Build Report step view model.
 * @param {{ findings?: Array<object> }} [input]
 * @returns {{
 *   headline: string,
 *   counts: { fixed: number, left: number, wontFix: number },
 *   primaryExportLabel: string,
 *   findings: Array<object>
 * }}
 */
export function buildReportView({ findings } = {}) {
  const counts = countDispositions(findings);
  return {
    headline: buildHeadline(counts),
    counts,
    primaryExportLabel: "Export report",
    findings: sortFindings(findings),
  };
}
