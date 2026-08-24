/**
 * Live Supabase data loader for the Tripwire dashboard.
 *
 * Fetches items, scan_runs, scan_run_scanners, and findings from Supabase
 * and reshapes them into the same structure as tripwire-data.js (mock).
 *
 * Uses demo data when Live is selected but:
 *  - window.__TRIPWIRE_CONFIG is not set (config file missing)
 *  - SUPABASE_URL or SUPABASE_ANON_KEY is empty
 *  - Any fetch fails (source: mock-failed → chip "Connection error")
 * Empty successful responses stay on Live (source: live-empty).
 */

import { resolveItemStatus } from "./tripwire-status.js";

// ── Scanner shaping helpers ───────────────────────────────────────────────────

function worstScannerSeverity(findings) {
  if (findings.find((f) => f.severity === "red")) return "red";
  if (findings.find((f) => f.severity === "amber")) return "amber";
  return "info";
}

function buildCompletedScannerSummary(s, scannerFindings) {
  const nFindings = scannerFindings.length;
  const checks = s.checks_run || 1;
  if (nFindings === 0) return `${checks} checks passed — no findings`;
  const worst = worstScannerSeverity(scannerFindings);
  const brief = scannerFindings[0].message || "flagged";
  const label = brief.length > 80 ? brief.slice(0, 77) + "…" : brief;
  return `${checks} checks — ${nFindings} finding${nFindings !== 1 ? "s" : ""} (${worst}): ${label}`;
}

function buildScannerOutput(s, scannerFindings) {
  const output = {};
  if (s.detail) {
    if (s.status === "completed" || s.status === "running") {
      output.raw_summary = s.detail;
    } else {
      output.reason = s.detail;
    }
  } else if (s.status === "completed") {
    output.raw_summary = buildCompletedScannerSummary(s, scannerFindings);
  }
  if (s.console_output) output.console_output = s.console_output;
  if (s.started_at && s.completed_at) {
    output.duration_ms = new Date(s.completed_at) - new Date(s.started_at);
  }
  return output;
}

function shapeScannerRow(s, mappedFindings, itemQualityScore) {
  const scannerFindings = mappedFindings.filter((f) => f.scanner === s.scanner_source);
  const output = buildScannerOutput(s, scannerFindings);
  if (s.scanner_source === "Tessl: Review (Quality)" && itemQualityScore != null) {
    output.quality_score = itemQualityScore;
  }
  return {
    source: s.scanner_source,
    status: s.status,
    checks_run: s.checks_run,
    detail: s.detail || null,
    started_at: s.started_at || null,
    completed_at: s.completed_at || null,
    output,
  };
}

// ── Item shaping helpers ──────────────────────────────────────────────────────

function resolveLastScanTime(latestRun, isRunning) {
  if (isRunning) return null;
  return latestRun?.completed_at || latestRun?.started_at || null;
}

function getRunContext(item, runsByItem, scannersByRun, findingsByRun) {
  const runs = (runsByItem[item.id] || []).sort(
    (a, b) => (b.started_at || "").localeCompare(a.started_at || "")
  );
  const latestRun = runs[0];
  const latestRunId = latestRun?.id;
  return {
    latestRun,
    latestRunId,
    latestScanners: latestRunId ? scannersByRun[latestRunId] || [] : [],
    latestFindings: latestRunId ? findingsByRun[latestRunId] || [] : [],
    runStatus: latestRun?.status || null,
  };
}

function shapeItem(item, runsByItem, scannersByRun, findingsByRun) {
  const { latestRun, latestRunId, latestScanners, latestFindings, runStatus } =
    getRunContext(item, runsByItem, scannersByRun, findingsByRun);
  const isRunning = runStatus === "running";

  const mappedFindings = latestFindings.map((f) => ({
    severity: f.severity,
    category: f.category,
    file_path: f.file_path,
    location: f.location,
    entity_kind: f.entity_kind,
    entity_name: f.entity_name,
    scanner: f.scanner_source,
    message: f.message,
    snippet: f.snippet,
    cwe_ids: f.cwe_ids,
  }));

  const status = resolveItemStatus({
    runStatus,
    heatmapStatus: item.heatmap_status,
    riskScore: item.risk_score,
    findings: mappedFindings,
  });

  const unreachableCount = latestScanners.filter((s) => s.status === "unreachable").length;
  const totalScanners = latestScanners.length;
  const partialNote = runStatus === "partial-failed"
    ? `${unreachableCount} out of ${totalScanners} scanners unreachable — risk from completed engines`
    : null;

  return {
    id: item.id,
    type: item.type || "skill",
    name: item.name,
    identifier: item.identifier || item.name,
    status,
    risk: item.risk_score,
    quality: item.quality_score,
    locus: item.install_locus || "unknown",
    avail: item.source_availability || "unknown",
    lastScan: resolveLastScanTime(latestRun, isRunning),
    drifted: false,
    scanStartedAt: isRunning ? latestRun.started_at : null,
    errorMessage: runStatus === "failed" ? "Scan run failed — no findings available" : partialNote,
    findings: mappedFindings,
    scanners: latestScanners.map((s) => shapeScannerRow(s, mappedFindings, item.quality_score)),
    trend: [],
    sandbox: latestRun
      ? { id: latestRunId, started: latestRun.started_at, completed: latestRun.completed_at,
          egressPhase: "live data", denied: [], cleanup: true }
      : null,
  };
}

// ── Supabase fetch ────────────────────────────────────────────────────────────

async function supabaseGet(baseUrl, anonKey, table, params = "") {
  const url = `${baseUrl}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

async function fetchLiveData() {
  const cfg = window.__TRIPWIRE_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    return null;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg;

  // Phase 1: fetch items and scan_runs (scan_runs ordered newest-first per item)
  const [items, scanRuns] = await Promise.all([
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "items", "select=*&order=name.asc"),
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "scan_runs", "select=*&order=started_at.desc&limit=2000"),
  ]);

  const runsByItem = {};
  for (const run of scanRuns) {
    (runsByItem[run.item_id] ??= []).push(run);
  }

  // Phase 2: scope scanners + findings to the latest run ID per item only
  const latestRunIds = Object.values(runsByItem).map((runs) => runs[0].id);
  const [scanRunScanners, findings] = latestRunIds.length > 0
    ? await Promise.all([
        supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "scan_run_scanners",
          `select=*&scan_run_id=in.(${latestRunIds.join(",")})`),
        supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "findings",
          `select=*&scan_run_id=in.(${latestRunIds.join(",")})`),
      ])
    : [[], []];

  const scannersByRun = {};
  for (const s of scanRunScanners) {
    (scannersByRun[s.scan_run_id] ??= []).push(s);
  }

  const findingsByRun = {};
  for (const f of findings) {
    (findingsByRun[f.scan_run_id] ??= []).push(f);
  }

  const shaped = items.map(
    (item) => shapeItem(item, runsByItem, scannersByRun, findingsByRun)
  );

  return {
    items: shaped,
    guardScenarios: [],
  };
}

async function loadMockData() {
  const mock = await import("./tripwire-data.js");
  console.info("[tripwire-dashboard] using demo data (user selected)");
  return { data: mock.default, source: 'mock-selected' };
}

async function loadLiveData() {
  const cfg = window.__TRIPWIRE_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.info("[tripwire-dashboard] Supabase not configured — using demo data");
    const mock = await import("./tripwire-data.js");
    return { data: mock.default, source: "mock" };
  }

  try {
    const live = await fetchLiveData();
    if (!live) {
      console.info("[tripwire-dashboard] Supabase not configured — using demo data");
      const mock = await import("./tripwire-data.js");
      return { data: mock.default, source: "mock" };
    }
    if (live.items.length > 0) {
      console.info("[tripwire-dashboard] loaded", live.items.length, "items from Supabase");
      return { data: live, source: "live" };
    }
    // Connected successfully but DB has no rows — do not swap in mock demo data.
    console.info("[tripwire-dashboard] Supabase connected — 0 items");
    return { data: live, source: "live-empty" };
  } catch (err) {
    console.warn("[tripwire-dashboard] live fetch failed:", err.message);
    const mock = await import("./tripwire-data.js");
    return { data: mock.default, source: "mock-failed" };
  }
}

export default async function loadData(mode = 'mock') {
  if (mode === 'mock') return loadMockData();
  return loadLiveData();
}
