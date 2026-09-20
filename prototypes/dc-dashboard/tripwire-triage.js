/**
 * Slice 68 Stream C — Triage view builder (pure ESM).
 * Headline, status tabs, severity-sorted findings, coverage honesty.
 */

/**
 * Distinctive triage/investigate title — prefer package@ver · CVE over bare category.
 * SCA findings share category `dependency_vulnerability`; uniqueness is in package/CVE/message.
 * @param {{
 *   package_name?: string|null,
 *   package_version?: string|null,
 *   cve_ids?: string[]|null,
 *   message?: string|null,
 *   category?: string|null,
 *   title?: string|null,
 * }|null|undefined} finding
 * @returns {string}
 */
export function buildWorkflowFindingTitle(finding) {
  if (!finding || typeof finding !== "object") return "Finding";
  const pkg = finding.package_name;
  if (pkg) {
    const ver = finding.package_version;
    const label = ver ? `${pkg}@${ver}` : String(pkg);
    const cves = Array.isArray(finding.cve_ids)
      ? finding.cve_ids.filter(Boolean)
      : [];
    const cve = cves[0];
    return cve ? `${label} · ${cve}` : label;
  }
  if (finding.message) return String(finding.message).slice(0, 120);
  if (finding.title) return String(finding.title).slice(0, 120);
  if (finding.category) return String(finding.category);
  return "Finding";
}

const STATUS_ORDER = Object.freeze([
  "to_fix",
  "needs_review",
  "dismissed",
]);

const STATUS_LABEL = Object.freeze({
  to_fix: "to-fix",
  needs_review: "needs-review",
  dismissed: "dismissed",
});

const SEVERITY_RANK = Object.freeze({
  high: 0,
  medium: 1,
  low: 2,
});

const TAB_DEFS = Object.freeze([
  { id: "all", label: "All" },
  { id: "to_fix", label: "To fix" },
  { id: "needs_review", label: "Needs review" },
  { id: "dismissed", label: "Dismissed" },
]);

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
 * @param {Array<{ triageStatus?: string }>|null|undefined} findings
 * @returns {{ to_fix: number, needs_review: number, dismissed: number }}
 */
function countByStatus(findings) {
  const counts = { to_fix: 0, needs_review: 0, dismissed: 0 };
  if (!findings) return counts;
  for (const f of findings) {
    const status = f?.triageStatus;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

/**
 * @param {{ to_fix: number, needs_review: number, dismissed: number }} counts
 * @returns {string}
 */
function buildHeadline(counts) {
  return STATUS_ORDER.map(
    (id) => `${counts[id]} ${STATUS_LABEL[id]}`,
  ).join(" · ");
}

/**
 * @param {{ to_fix: number, needs_review: number, dismissed: number }} counts
 * @param {string} selectedId
 * @returns {Array<{ id: string, label: string, count: number, selected: boolean }>}
 */
function buildTabs(counts, selectedId) {
  return TAB_DEFS.map((tab) => {
    const count =
      tab.id === "all"
        ? counts.to_fix + counts.needs_review + counts.dismissed
        : counts[tab.id];
    return {
      id: tab.id,
      label: tab.label,
      count,
      selected: tab.id === selectedId,
    };
  });
}

/**
 * @param {string|null|undefined} triageFilter
 * @returns {string}
 */
function resolveSelectedTab(triageFilter) {
  if (triageFilter == null || triageFilter === "all") return "all";
  return triageFilter;
}

/**
 * @param {Array<object>} findings
 * @param {string} selectedId
 * @returns {Array<object>}
 */
function filterAndSort(findings, selectedId) {
  const list = Array.isArray(findings) ? findings : [];
  const filtered =
    selectedId === "all"
      ? list.slice()
      : list.filter((f) => f?.triageStatus === selectedId);
  return filtered.sort(
    (a, b) => severityRank(a?.severity) - severityRank(b?.severity),
  );
}

/**
 * @param {{ discovered?: number, scanned?: number, failed?: number, skipped?: number }|null|undefined} coverage
 * @returns {{ discovered: number, scanned: number, failed: number, skipped: number }}
 */
function buildCoverageHonesty(coverage) {
  const src = coverage ?? {};
  return {
    discovered: Number(src.discovered) || 0,
    scanned: Number(src.scanned) || 0,
    failed: Number(src.failed) || 0,
    skipped: Number(src.skipped) || 0,
  };
}

/**
 * Build triage panel view model.
 * @param {{ findings?: Array<object>, coverage?: object, triageFilter?: string|null }} input
 * @returns {{ headline: string, tabs: Array<object>, filteredFindings: Array<object>, coverageHonesty: object }}
 */
export function buildTriageView({ findings, coverage, triageFilter } = {}) {
  const counts = countByStatus(findings);
  const selectedId = resolveSelectedTab(triageFilter);
  return {
    headline: buildHeadline(counts),
    tabs: buildTabs(counts, selectedId),
    filteredFindings: filterAndSort(findings, selectedId),
    coverageHonesty: buildCoverageHonesty(coverage),
  };
}
