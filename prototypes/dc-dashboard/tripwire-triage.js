/**
 * Slice 68 Stream C — Triage view builder (pure ESM).
 * Slice 73 — type / quality / per-target filters compose with status tabs.
 * Headline, status tabs, severity-sorted findings, coverage honesty.
 */

import {
  matchesQualityTab,
  QUALITY_TAB_FLOOR,
} from "./tripwire-status.js";

const STATUS_ORDER = Object.freeze([
  "to_fix",
  "needs_review",
  "dismissed",
]);

/**
 * Distinctive triage/investigate title — prefer package@ver · CVE · path over bare category.
 * SCA findings share category `dependency_vulnerability`; uniqueness is in package/CVE/path/message.
 * @param {{
 *   package_name?: string|null,
 *   package_version?: string|null,
 *   cve_ids?: string[]|null,
 *   file_path?: string|null,
 *   source?: string|null,
 *   message?: string|null,
 *   category?: string|null,
 *   title?: string|null,
 * }|null|undefined} finding
 * @returns {string}
 */
export function buildWorkflowFindingTitle(finding) {
  if (!finding || typeof finding !== "object") return "Finding";
  const pathHint = shortFindingPath(finding.file_path || finding.source);
  const pkg = finding.package_name;
  if (pkg) {
    const ver = finding.package_version;
    const label = ver ? `${pkg}@${ver}` : String(pkg);
    const cves = Array.isArray(finding.cve_ids)
      ? finding.cve_ids.filter(Boolean)
      : [];
    const cve = cves[0];
    const base = cve ? `${label} · ${cve}` : label;
    return pathHint ? `${base} · ${pathHint}` : base;
  }
  if (finding.message) {
    const msg = String(finding.message).slice(0, 120);
    return pathHint ? `${msg} · ${pathHint}` : msg;
  }
  if (finding.title) return String(finding.title).slice(0, 120);
  if (finding.category) {
    const cat = String(finding.category);
    return pathHint ? `${cat} · ${pathHint}` : cat;
  }
  return "Finding";
}

/**
 * @param {string|null|undefined} path
 * @returns {string}
 */
function shortFindingPath(path) {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  // Drop trailing :line from mapped source fields.
  const noLoc = trimmed.replace(/:\d+$/, "");
  if (noLoc.length <= 48) return noLoc;
  const parts = noLoc.split("/").filter(Boolean);
  if (parts.length <= 2) return noLoc.slice(-48);
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

/**
 * Collapse byte-identical SCA/insert duplicates (same target + package + CVE + path + scanner).
 * @param {Array<object>} findings
 * @returns {Array<object>}
 */
export function dedupeTriageFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return [];
  const byKey = new Map();
  for (const f of findings) {
    const key = triageDedupeKey(f);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...f, duplicateCount: 1 });
      continue;
    }
    existing.duplicateCount = (existing.duplicateCount || 1) + 1;
  }
  return [...byKey.values()];
}

/**
 * @param {object|null|undefined} f
 * @returns {string}
 */
function triageDedupeKey(f) {
  if (!f || typeof f !== "object") return "∅";
  // Only collapse SCA / message-identical inserts — never merge unrelated findings
  // that merely lack package fields (they share empty key slots otherwise).
  const hasIdentity = Boolean(f.package_name || f.message);
  if (!hasIdentity) return `id:${f.id != null ? f.id : "anon"}`;
  const cve = Array.isArray(f.cve_ids) ? f.cve_ids.filter(Boolean)[0] || "" : "";
  return [
    f.itemId || "",
    f.scanner || "",
    f.category || "",
    f.package_name || "",
    f.package_version || "",
    cve,
    f.file_path || f.source || "",
    f.message || "",
    f.triageStatus || "",
  ].join("\u0001");
}

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

const TYPE_TAB_DEFS = Object.freeze([
  { id: "all", label: "All items" },
  { id: "skill", label: "Skills" },
  { id: "mcp_server", label: "MCP Servers" },
  { id: "package", label: "Packages" },
]);

const QUALITY_TAB_DEFS = Object.freeze([
  { id: "all", label: "All quality" },
  { id: "high", label: `Quality ≥ ${QUALITY_TAB_FLOOR}` },
  { id: "low", label: `Quality < ${QUALITY_TAB_FLOOR}` },
  { id: "unscored", label: "No quality score" },
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
 * @param {object|null|undefined} finding
 * @returns {{ type?: string, quality?: number|null }}
 */
function findingAsItem(finding) {
  return {
    type: finding?.itemType,
    quality: finding?.itemQuality,
  };
}

/**
 * @param {Array<object>} findings
 * @param {string|null|undefined} typeFilter
 * @returns {Array<object>}
 */
function filterByType(findings, typeFilter) {
  if (!typeFilter || typeFilter === "all") return findings;
  return findings.filter((f) => f?.itemType === typeFilter);
}

/**
 * @param {Array<object>} findings
 * @param {string|null|undefined} qualityTab
 * @returns {Array<object>}
 */
function filterByQuality(findings, qualityTab) {
  if (!qualityTab || qualityTab === "all") return findings;
  return findings.filter((f) =>
    matchesQualityTab(findingAsItem(f), qualityTab),
  );
}

/**
 * @param {Array<object>} findings
 * @param {string|null|undefined} targetFilter
 * @returns {Array<object>}
 */
function filterByTarget(findings, targetFilter) {
  if (!targetFilter || targetFilter === "all") return findings;
  return findings.filter((f) => f?.itemId === targetFilter);
}

/**
 * @param {Array<object>} findings
 * @param {string} selectedType
 * @returns {Array<{ id: string, label: string, count: number, selected: boolean }>}
 */
function buildTypeTabs(findings, selectedType) {
  return TYPE_TAB_DEFS.map((tab) => {
    const count =
      tab.id === "all"
        ? findings.length
        : findings.filter((f) => f?.itemType === tab.id).length;
    return {
      id: tab.id,
      label: tab.label,
      count,
      selected: tab.id === selectedType,
    };
  });
}

/**
 * @param {Array<object>} findings
 * @param {string} selectedQuality
 * @returns {Array<{ id: string, label: string, count: number, selected: boolean }>}
 */
function buildQualityTabs(findings, selectedQuality) {
  return QUALITY_TAB_DEFS.map((tab) => {
    const count =
      tab.id === "all"
        ? findings.length
        : findings.filter((f) =>
            matchesQualityTab(findingAsItem(f), tab.id),
          ).length;
    return {
      id: tab.id,
      label: tab.label,
      count,
      selected: tab.id === selectedQuality,
    };
  });
}

/**
 * @param {Array<object>} findings
 * @param {string} selectedTarget
 * @returns {Array<{ id: string, label: string, count: number, selected: boolean }>}
 */
function buildTargetChips(findings, selectedTarget) {
  const byId = new Map();
  for (const f of findings) {
    const id = f?.itemId;
    if (!id) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byId.set(id, {
      id,
      label: f.itemName || id,
      count: 1,
    });
  }
  const chips = [...byId.values()].sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  );
  return [
    {
      id: "all",
      label: "All targets",
      count: findings.length,
      selected: selectedTarget === "all",
    },
    ...chips.map((c) => ({
      ...c,
      selected: c.id === selectedTarget,
    })),
  ];
}

/**
 * Build triage panel view model.
 * @param {{
 *   findings?: Array<object>,
 *   coverage?: object,
 *   triageFilter?: string|null,
 *   typeFilter?: string|null,
 *   qualityTab?: string|null,
 *   targetFilter?: string|null,
 * }} input
 * @returns {{
 *   headline: string,
 *   tabs: Array<object>,
 *   typeTabs: Array<object>,
 *   qualityTabs: Array<object>,
 *   targetChips: Array<object>,
 *   filteredFindings: Array<object>,
 *   coverageHonesty: object,
 * }}
 */
export function buildTriageView({
  findings,
  coverage,
  triageFilter,
  typeFilter = "all",
  qualityTab = "all",
  targetFilter = "all",
} = {}) {
  const list = dedupeTriageFindings(Array.isArray(findings) ? findings : []);
  const resolvedType = typeFilter || "all";
  const resolvedQuality = qualityTab || "all";
  const resolvedTarget = targetFilter || "all";

  const typeScoped = filterByType(list, resolvedType);
  const qualityScoped = filterByQuality(typeScoped, resolvedQuality);
  const targetScoped = filterByTarget(qualityScoped, resolvedTarget);

  const counts = countByStatus(targetScoped);
  const selectedId = resolveSelectedTab(triageFilter);

  return {
    headline: buildHeadline(counts),
    tabs: buildTabs(counts, selectedId),
    typeTabs: buildTypeTabs(list, resolvedType),
    qualityTabs: buildQualityTabs(typeScoped, resolvedQuality),
    targetChips: buildTargetChips(qualityScoped, resolvedTarget),
    filteredFindings: filterAndSort(targetScoped, selectedId),
    coverageHonesty: buildCoverageHonesty(coverage),
  };
}
