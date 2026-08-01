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

const STATUS_FROM_RISK = (risk) => {
  if (risk == null) return "grey";
  if (risk >= 1.5) return "red";
  if (risk >= 0.3) return "amber";
  return "green";
};

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

  const [items, scanRuns, scanRunScanners, findings] = await Promise.all([
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "items", "select=*&order=name.asc"),
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "scan_runs", "select=*&order=started_at.desc&limit=200"),
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "scan_run_scanners", "select=*"),
    supabaseGet(SUPABASE_URL, SUPABASE_ANON_KEY, "findings", "select=*"),
  ]);

  const runsByItem = {};
  for (const run of scanRuns) {
    (runsByItem[run.item_id] ??= []).push(run);
  }

  const scannersByRun = {};
  for (const s of scanRunScanners) {
    (scannersByRun[s.scan_run_id] ??= []).push(s);
  }

  const findingsByRun = {};
  for (const f of findings) {
    (findingsByRun[f.scan_run_id] ??= []).push(f);
  }

  const shaped = items.map((item) => {
    const runs = (runsByItem[item.id] || []).sort(
      (a, b) => (b.started_at || "").localeCompare(a.started_at || "")
    );
    const latestRun = runs[0];
    const latestRunId = latestRun?.id;
    const latestScanners = latestRunId ? scannersByRun[latestRunId] || [] : [];
    const latestFindings = latestRunId ? findingsByRun[latestRunId] || [] : [];

    const status =
      latestRun?.status === "failed"
        ? "error"
        : STATUS_FROM_RISK(item.risk_score);

    const partialNote =
      latestRun?.status === "partial-failed"
        ? "Some scanners unreachable — risk from completed engines"
        : null;

    return {
      id: item.id,
      type: item.type || "skill",
      name: item.name,
      identifier: item.identifier || item.name,
      status: item.heatmap_status || status,
      risk: item.risk_score,
      quality: item.quality_score,
      locus: item.install_locus || "unknown",
      avail: item.source_availability || "unknown",
      lastScan: latestRun?.completed_at || latestRun?.started_at || null,
      drifted: false,
      errorMessage:
        latestRun?.status === "failed"
          ? "Scan run failed"
          : partialNote,
      findings: latestFindings.map((f) => ({
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
      })),
      scanners: latestScanners.map((s) => ({
        source: s.scanner_source,
        status: s.status,
        checks_run: s.checks_run,
        detail: s.detail || null,
        output: {},
      })),
      trend: [],
      sandbox: latestRun
        ? {
            id: latestRunId,
            started: latestRun.started_at,
            completed: latestRun.completed_at,
            egressPhase: "live data",
            denied: [],
            cleanup: true,
          }
        : null,
    };
  });

  return {
    items: shaped,
    cliScenarios: {},
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

export default async function loadData(mode = 'live') {
  if (mode === 'mock') return loadMockData();
  return loadLiveData();
}
