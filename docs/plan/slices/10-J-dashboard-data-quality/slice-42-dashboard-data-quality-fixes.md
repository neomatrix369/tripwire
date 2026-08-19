# Slice 42 — Dashboard Data Quality Fixes

> Wave J | MoSCoW: **Must** | Status: 📋 PLANNED | Est: ~120 min
> Depends on: none (independent; complements slices 21 and 22)

---

## Motivation

A systematic audit of the Tripwire dashboard (2026-08-19) via direct Supabase API queries
revealed **66 of 235 cards (28%) showing incorrect or incomplete panel data**. The root causes
span three layers — FE data-fetch, BE discovery, and UX presentation — and create a misleading
security posture for users.

Two RED cards with the same badge can show completely different panel content: one with 11
findings + scanner details (correct), another with "never scanned" + 0 findings (FE data bug).
Users cannot distinguish genuinely unscanned items from items whose scan data the FE is failing
to load.

**Source**: Anomaly audit in `~/.claude/plans/iterate-through-all-of-lovely-stearns.md` and
scratchpad investigation reports (2026-08-19).

---

## Anomaly Catalogue (from audit)

| ID | Layer | Severity | Root cause | Affected |
|----|-------|----------|------------|---------|
| A1 | **FE** | Critical | `tripwire-live.js:172` `scan_runs` fetch `limit=200` — 408 runs exist | ~35+ cards |
| A2 | **FE** | High | `findings` + `scan_run_scanners` fetched unbounded (`select=*`) | All 235 |
| A3 | **BE** | High | `discovery.js:138-143` manifest entries hardcoded `locus:unknown, avail:unknown` | 14 MCP servers |
| A4 | **Scanner** | Medium | 7 skills have `source_on_disk` but `NULL quality_score` (Tessl incomplete) | 7 skills |
| A5 | **FE/UX** | Medium | ERROR cards show "0 findings" with no contextual explanation | 12 cards |
| A6 | **Ops** | Low | 2 SCANNING items stuck since Aug 16 (`automate`, `autopilot`) | 2 items |
| A7 | **DB** | Low | 59 RED/ERROR items with 0 non-router findings in latest scan run | 59 items |

> **Note**: A7 count is inflated by A1 (FE can't see the findings for out-of-window runs).
> Re-audit after A1 fix to get the true DB-only count.

---

## Spec / GWT

### GWT-42.1 — scan_runs fetch covers all items (A1)

**Given** the Tripwire dashboard loads live data from Supabase
**When** the dashboard renders 235 items with 408 total scan runs
**Then** every item that has been scanned shows its actual last-scan date, findings count, and scanner outputs (not "never scanned" / 0 findings)

### GWT-42.2 — MCP servers show resolved locus and availability (A3)

**Given** MCP servers are discovered from `.cursor/mcp.json` or `~/.cursor/mcp.json` manifest files
**When** a manifest entry has a resolvable `packPath` (source on disk)
**Then** the item is stored with `install_locus='local'` and `source_availability='source_on_disk'` (not `unknown`/`unknown`)

**Given** a manifest entry has no resolvable `packPath` (bare-binary command like `npx context7`)
**When** Tripwire discovers the item
**Then** the item is stored with `install_locus='local'` and `source_availability='introspection_only'` (not `unknown`/`unknown`)

### GWT-42.3 — ERROR cards communicate scan failure clearly (A5)

**Given** an item's latest scan run status is `failed`
**When** a user opens that item's right-panel
**Then** the FINDINGS section displays "Scan run failed — no findings available" (not bare "FINDINGS (0)")

### GWT-42.4 — No unbounded table scans on dashboard load (A2)

**Given** the dashboard fetches live data
**When** the fetch completes
**Then** the `findings` and `scan_run_scanners` Supabase queries are scoped to the scan runs returned for current items (no full-table scan)

---

## Before-Checks

- [ ] Reproduce A1: load dashboard, identify ≥1 RED card showing "never scanned" while Supabase confirms `heatmap_status='red'` and a scan run exists
- [ ] Reproduce A3: confirm `SELECT install_locus FROM items WHERE type='mcp_server'` returns `'unknown'` for ≥1 MCP server that is locally invoked
- [ ] Confirm `scan_runs` total count > 200 in Supabase (`SELECT count(*) FROM scan_runs`)
- [ ] `quality-gates.sh` passes on `main` before starting

---

## TDD Execution Order

### Sub-task 1 — Fix A1: raise scan_runs window (FE)

**File**: `prototypes/dc-dashboard/tripwire-live.js:172`

**Option A (immediate)**: change `limit=200` → `limit=2000`

**Option B (proper)**: replace the four parallel fetches with a single DB view call:
```sql
-- In db/schema.sql — new view
create or replace view latest_item_scan_context as
select distinct on (sr.item_id)
  sr.*, i.name, i.type, i.identifier, i.heatmap_status, i.risk_score,
  i.quality_score, i.install_locus, i.source_availability
from scan_runs sr
join items i on i.id = sr.item_id
order by sr.item_id, sr.started_at desc;
```
Then `tripwire-live.js` queries this view instead of raw `scan_runs`.

> **Discussion required**: Option A is a one-line fix (safe, fast). Option B is the correct
> architecture but requires a DB migration and FE refactor. Decide which to ship first.

**Test**: After fix, reload dashboard; `amber-skill` (previously "never scanned") must show
its actual last-scan date and findings count.

---

### Sub-task 2 — Fix A3: MCP server locus detection (BE)

**File**: `cli/src/discovery.js:138-143`

Current code:
```js
const meta = typeof t === 'string'
  ? await detectType(t)
  : { type: 'mcp_server', locus: 'unknown', avail: 'unknown' };
```

Fix:
```js
const meta = typeof t === 'string'
  ? await detectType(t)
  : t.packPath
    ? await detectType(t.packPath)
    : { type: 'mcp_server', locus: 'local', avail: 'introspection_only' };
```

**Tests** (existing `cli/test/discovery.*`):
- Add: manifest entry WITH `packPath` pointing to a dir with `server.py` → expects `locus: 'local', avail: 'source_on_disk'`
- Add: manifest entry WITHOUT `packPath` → expects `locus: 'local', avail: 'introspection_only'`
- Existing tests must remain green

**Rescan**: After fix, rescan MCP servers: `tripwire scan --defaults --type mcp`; confirm `items` rows updated.

---

### Sub-task 3 — Fix A5: ERROR card messaging (FE/UX)

**File**: `prototypes/dc-dashboard/Tripwire.dc.html` (findings panel section, approx line 750–810)

When `item.errorMessage` is set, display it in the findings section header instead of bare "FINDINGS (0)". Exact message:
- `runStatus === 'failed'` → `"Scan run failed — no findings available"`
- `runStatus === 'partial-failed'` with unreachable scanners → use `partialNote` (already computed in `tripwire-live.js:117-119`)

---

### Sub-task 4 — Scope A2: findings/scanners fetch (FE)

**File**: `prototypes/dc-dashboard/tripwire-live.js:171,173`

After A1 is resolved, add `scan_run_id=in.(...)` filter scoped to the run IDs actually fetched.
This is a follow-on to A1; the exact query depends on which A1 option is chosen.

> **Discussion required**: if Option B (DB view) for A1 is chosen, A2 is resolved automatically
> (the view pre-joins all data). If Option A (limit raise) is chosen, A2 needs explicit scoping.

---

### Sub-task 5 — Ops: resolve stuck SCANNING items (A6)

Run: `node scripts/reconcile-stuck-scan-runs.mjs`

Confirm `automate` and `autopilot` scan_runs transition from `running` to `failed`, then
resubmit: `tripwire scan automate autopilot --force`.

---

### Sub-task 6 — Fix A4: improve Tessl quality_score logging and parser (Sandbox)

**Fix is inside this repo** — no external dependency.

**Root cause** (from code audit): `sandbox/scanners.py:559-582` (`run_tessl`) calls
`npx tessl@latest skill review --json <workdir>` and returns `(None, [_unreachable(...)])` on
any of: non-zero exit code, unparseable JSON, or `_tessl_quality_score()` returning `None`.
`sandbox/scan_app.py:249-257` only writes `quality_score` to `items` when the value is not `None`.

**Files**:
- `sandbox/scanners.py:540-582` — `_tessl_quality_score()` and `run_tessl()`
- `sandbox/scan_app.py:249-257` — writes `quality_score` to DB

**Fix**:
1. Add structured logging in `run_tessl()` when score extraction fails:
   ```python
   if score is None:
       print(f"[tessl] quality_score extraction failed — raw output: {out[:500]!r}")
       return None, [_unreachable("Tessl", "scanner returned no parseable quality score", ...)]
   ```
2. Extend `_tessl_quality_score()` to handle any additional JSON shapes emitted by
   newer `tessl@latest` versions (inspect live output after step 1 reveals the shape).
3. Force-rescan the 7 affected skills: `tripwire scan brownfield-conductor canvas create-hook create-rule nw-sd-patterns --force`
   (skip the 2 SCANNING items until A6 resolves them first).

**Tests** (existing `sandbox/tests/test_scanners_status.py`):
- Add: `_tessl_quality_score` with unknown JSON shape → returns `None` and logs (no crash)
- Add: `_tessl_quality_score` with each known shape (score, reviewScore, normalizedScore) → correct float
- Existing tests must remain green

---

## After-Checks

- [ ] GWT-42.1: Dashboard reloaded; every previously "never scanned" RED card now shows a last-scan date and ≥1 finding (or a justified 0 with explanation)
- [ ] GWT-42.2: `SELECT name, install_locus, source_availability FROM items WHERE type='mcp_server'` — zero rows with `'unknown'` locus
- [ ] GWT-42.3: Open any ERROR card — panel shows contextual failure message (not bare "0 findings")
- [ ] GWT-42.4: Network tab confirms `findings` and `scan_run_scanners` requests are scoped (not full-table)
- [ ] All CLI tests pass: `npm test` in `cli/`
- [ ] Specification coverage: every GWT clause has ≥1 test (GWT-first); essential error paths covered
- [ ] `quality-gates.sh` passes
- [ ] Dashboard anomaly re-audit: count drops from 66 to <10
- [ ] Complexity evidence: `cli/` complexity policy `enforcing` (existing gate); `tripwire-live.js` changes are UX/data-fetch only — no new cyclomatic complexity introduced

---

## Doc Audit

- [ ] `docs/plan/DECISIONS.md`: log the A1 option chosen (Option A vs Option B)
- [ ] `CHANGELOG.md`: entry for dashboard data quality fix
- [ ] `SMOKE_TESTS.md`: update or add smoke test for dashboard data completeness (all RED cards show findings or justified 0)
- [ ] Anomaly audit report (`~/.claude/plans/iterate-through-all-of-lovely-stearns.md`): note resolution status per anomaly

---

## Open Questions (for discussion before 🔨)

1. **A1 approach**: Option A (limit=2000, ship today) vs Option B (DB view, proper architecture, ~1 extra sprint day)?
2. **A3 scope**: after `locus` is fixed in discovery, should we trigger an automatic re-scan of all 14 MCP servers, or leave them for the next scheduled scan cycle?
3. **A7 true count**: after A1 fix, how many of the 59 "RED with 0 findings" are real DB anomalies vs FE fetch artifacts? Run the re-audit SQL and decide if a data-repair pass is needed.

---

## Gate Status

📋 PLANNED — not started. Open questions must be resolved before 🔨 IN PROGRESS.

```json
{
  "slice": 42,
  "gate_status": "PLANNED",
  "branch": "slice/42-dashboard-data-quality-fixes",
  "open_questions": ["A1-option", "A3-rescan-scope", "A7-true-count"]
}
```
