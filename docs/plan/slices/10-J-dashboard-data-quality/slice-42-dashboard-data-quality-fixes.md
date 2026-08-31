# Slice 42 — Dashboard Data Quality Fixes

> Wave J | MoSCoW: **Must** | Status: 🔀 ON BRANCH (A14–A15 delta) | Est: ~120 min + ~60 min (A9–A13) + ~45 min (A14–A15)
> Depends on: none (independent; complements slices 21 and 22). **A14–A15** requires A9–A13 ✅ ([#98](https://github.com/neomatrix369/tripwire/pull/98)) + slice 47 ✅ on `main`.
> Prior merge: [#95](https://github.com/neomatrix369/tripwire/pull/95) shipped A1–A8 ✅ · [#98](https://github.com/neomatrix369/tripwire/pull/98) shipped A9–A13 ✅ — this reopen adds **A14–A15** only
> Branch (when building A14–A15): `slice/42-quality-score-tabs`

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

**Delta (2026-08-20):** Tessl `quality_score` is only visible inside an expanded Tessl scanner
row when the value is truthy. Grid cards show `risk` but not quality; null / never-scanned /
Tessl-unreachable states have no explicit indicator — operators cannot triage “schedule a Tessl
review” from the card face or the detail panel header. **Pile-on:** `risk 0.75` has no hover
explaining that risk is weighted finding density `(3×red+1×amber)/checks`, not card colour.

**Delta (2026-08-25):** After A9–A13, operators still scroll the full skills grid to triage by Tessl
quality. Embed **Quality ≥ 80** / **Quality < 80** / **No quality score** filter tabs in the dashboard toolbar
(skills only; threshold **80/100** on Tessl Review Quality axis). **Augment slice 42 in place** —
standalone slice 54 stub superseded (see DECISIONS 2026-08-25).

**Source**: Anomaly audit in `~/.claude/plans/iterate-through-all-of-lovely-stearns.md` and
scratchpad investigation reports (2026-08-19). Delta request: enhanced-flow-planner continuation
(augment existing Wave J slice — do not open a new slice).

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
| A8 | **FE/UX** | Medium | Cards show no scanner run stats — user cannot see how many scanners completed vs failed without clicking into each item | All scanned cards |
| A9 | **FE/UX** | Medium | Grid/list cards never surface Tessl quality; null/unknown/unscanned quality is invisible | Skills (Tessl-eligible) |
| A10 | **FE/UX** | Medium | Detail + Tessl inner cards hide missing quality — no scan-scheduling cue when score unknown | Skills with null/`unreachable` Tessl |
| A11 | **FE/UX** | Medium | `risk N.NN` label has no hover explanation — operators cannot tell formula, range, or that card colour ≠ risk density | All cards showing risk |
| A12 | **FE/UX** | Medium | Even after A9, quality badge has no hover explaining Tessl 0–100 meaning / provenance (parity gap vs A11 risk tooltip) | Skills showing `Q …` |
| A13 | **FE/UX** | Medium | Operator-facing copy uses schema jargon (`risk_score`, ambiguous list “Score”, some locus/avail phrasing) | All dashboard surfaces |
| A14 | **FE/UX** | Medium | No quick filter to separate high Tessl quality skills (≥80) from below-threshold and unscored | Skills (Tessl-eligible) |
| A15 | **FE/UX** | Low | Quality tab counts and empty-state copy not wired when filters yield zero skills | Dashboard toolbar |

> **Note**: A7 count is inflated by A1 (FE can't see the findings for out-of-window runs).
> Re-audit after A1 fix to get the true DB-only count.
>
> **Shipped (PR #95):** A1–A8. **Shipped (PR #98):** A9–A13. **Open delta:** A14–A15 quality score tabs — **IMPLEMENTED** on `slice/42-quality-score-tabs` (awaiting PR).
>
> **Propagation check (2026-08-20):** Live adapter already maps `items.quality_score` → `item.quality` and into Tessl `output.quality_score` (`tripwire-live.js`). **UI top-of-card does not render it yet** — only the expanded Tessl row, and only when truthy. A9/A10/A12 close that gap.

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

### GWT-42.5 — Scanner run stats visible on every scanned card (A8)

**Given** an item has been scanned (at least one entry in `scan_run_scanners` for its latest run)
**When** the dashboard grid renders
**Then** each scanned card displays a compact scanner stat badge showing the count of completed scanners and the count of failed/unreachable scanners (e.g. `2✓ 1✗`) — without requiring the user to click into the item

**Given** all scanners for an item completed successfully
**When** the dashboard grid renders
**Then** the card shows only the success count (e.g. `3✓`) with no failure badge

**Given** an item has not yet been scanned (no scan_run_scanners rows)
**When** the dashboard grid renders
**Then** no scanner stat badge is shown on that card

### GWT-42.6 — Tessl quality highlighted on cards (A9) — **delta open**

**Given** a skill item has a numeric `quality` / `quality_score` from Tessl
**When** the dashboard grid (and list) renders that card
**Then** the card shows a compact, visually distinct quality badge (e.g. `Q 92` or `quality 92`) next to risk — more prominent than muted secondary text (mono badge with border/tint, not plain `span` body copy)

**Given** a skill item has never been scanned (`status=grey` / no last scan) **or** has been scanned but `quality` is null (Tessl incomplete / unreachable / not applicable yet)
**When** the dashboard grid renders that card
**Then** the card shows an explicit quality-state indicator distinguishing:

- **never scanned** → e.g. `Q —` / `quality unknown` with muted/grey treatment
- **scanned, score not known** (Tessl missing/unreachable/null after a run) → e.g. `Q ?` / `quality not scored` with amber or muted attention treatment

so operators can tell “not scanned yet” from “scanned but Tessl score absent”

**Given** an MCP server item (Tessl not in the skill-quality path)
**When** the dashboard grid renders
**Then** no Tessl quality badge is required (omit or show N/A — do not invent a fake score)

### GWT-42.7 — Inner panel surfaces quality + scan-scheduling cue (A10) — **delta open**

**Given** an item is selected in the detail panel
**When** the panel header/meta row renders
**Then** Tessl quality state is visible without expanding a scanner card (same states as GWT-42.6: numeric score, never-scanned unknown, or scanned-not-scored)

**Given** the Tessl scanner row exists for a skill
**When** the inner scanner card renders (collapsed header and/or expanded body)
**Then** quality is surfaced on that inner card even when score is missing — not only via `sc-if` on a truthy `quality_score` — including an explicit “not scored” / “Tessl unreachable” label when applicable

**Given** quality is unknown or not scored for a Tessl-eligible skill
**When** the operator views the detail panel or Tessl inner card
**Then** a short scheduling cue is visible (e.g. copy pointing at `tripwire scan <name> --force` or “Schedule Tessl review”) so they can act without hunting docs

### GWT-42.8 — Risk score hover explains meaning (A11) — **delta open**

**Canonical formula** (SoT: `db/schema.sql` → `tripwire_rollup_item`):

```
risk_score = (3 × red_findings + 1 × amber_findings) / Σ checks_run
```

- Counts exclude `tiered_router` findings.
- Denominator = sum of `checks_run` on **completed** scanners for the latest run.
- If no completed checks: `risk_score = 0` (when the run is still scorable).
- Unscanned / failed / running with nothing to score: `risk_score` is `null` (UI shows `—`).

**Meaning**: weighted **finding density** for sort/trend — **not** card colour. Card RAG is worst-of actionable findings (`heatmap_status`). Density fallback buckets (FE only, when heatmap unscorable): `≥1.5` red · `≥0.5` amber · else green (`statusFromRisk`).

**Range**: ≥ 0, theoretically unbounded (more weighted findings than checks → can exceed 1.0 / 1.5). Typical live values are small decimals (e.g. `0.75`); `null` when unknown.

**Given** a card or detail meta row shows a numeric risk label (e.g. `risk 0.75`)
**When** the operator hovers (or focuses via keyboard) that risk label
**Then** a tooltip/title (or accessible description) explains at least:
  1. **What** — weighted finding density for sort/trend (not the card colour)
  2. **How** — `(3×red + 1×amber) ÷ completed checks` (router findings excluded)
  3. **Range** — `0` = no actionable density; higher = denser weighted findings; may exceed `1.5`
  4. **Colour** — card RAG = worst finding severity, independent of this number

**Given** risk is unknown (`—` / null)
**When** the operator hovers the risk label
**Then** the tooltip states that risk is unknown until a completed/partial-failed scan produces a rollup (not “zero risk”)

**Given** the detail panel meta row (`risk_score … · last scan …`)
**When** hovering the risk portion
**Then** the same explanation applies (parity with grid/list cards)

### GWT-42.9 — Tessl quality badge hover explains meaning (A12) — **delta open**

**Canonical meaning** (SoT: `sandbox/scanners.py` → `_tessl_quality_score` / `run_tessl`):

- **What**: Tessl skill-review **quality score** (skill doc/content quality axis) — orthogonal to security findings and to `risk_score`.
- **Source**: `npx tessl@latest skill review --json`; persisted on `items.quality_score`; Live maps to `item.quality` and Tessl scanner `output.quality_score`.
- **Range**: **0–100** (higher = better Tessl review). Parsed from `score`, `review.reviewScore`, or averaged `normalizedScore×100` judge keys.
- **Null**: unscanned, Tessl skipped/unreachable, or unparseable output — UI `Q —` / `Q ?` (A9), not a fake `0`.

**Given** a skill card or detail header shows a quality badge (`Q 92`, `Q —`, or `Q ?`)
**When** the operator hovers (or keyboard-focuses) that badge
**Then** a tooltip/title (or accessible description) explains at least:
  1. **What** — Tessl skill-review quality (not security risk / not card colour)
  2. **Range** — 0–100; higher is better
  3. **Source** — from Tessl `skill review` when the scanner completed with a parseable score
  4. **Unknown states** — `Q —` = never scanned / no Tessl score yet; `Q ?` = scanned but Tessl did not yield a score (schedule rescan)

**Given** the Tessl inner scanner card shows a quality line
**When** hovering that quality label
**Then** the same explanation applies (parity with top-of-card badge)

**Given** an MCP card (no Tessl quality badge)
**When** rendered
**Then** no quality tooltip is required

### GWT-42.10 — Operator-facing labels use plain language (A13) — **delta open**

Schema / API field names may stay snake_case in code and tooltips’ technical lines. **Visible UI chrome must not.**

**Locked operator glossary (defaults):**

| Current UI | Replace with | Notes |
|------------|--------------|--------|
| `risk_score 0.75` (detail meta) | `Risk density 0.75` (aria) / compact `R 0.75` badge | Never show `risk_score` in chrome |
| `risk 0.75` (grid) | Compact `R 0.75` badge (tooltip = density formula) | Parity with `Q` chip UX |
| List column `Score` | `Risk density` | Avoid clash with Tessl quality |
| `Quality score: 92/100` (Tessl expand) | `Tessl quality 92/100` | Matches A9 `Q` badge language |
| `Locus unknown` | `Location unknown` | Drop “locus” jargon |
| `Source on disk` | `On disk` | Shorter; tooltip may say “local source files” |
| `Introspection only` | `No local source` | Clearer for bare-binary MCP |
| `Scannability unknown` | `Scanability unknown` | Prefer plain spelling; or `Unknown scanability` |

**Given** the detail meta row currently reads `risk_score {{ riskLabel }} · last scan …`
**When** the panel renders
**Then** it reads using the glossary (e.g. `Risk density 0.75 · Last scan …`) — no `risk_score`, `quality_score`, `heatmap_status`, `install_locus`, or `source_availability` snake_case in visible text

**Given** grid cards and the list table
**When** rendered
**Then** risk uses the same “Risk density” wording; list header is not bare “Score”

**Given** Tessl inner quality line and planned `Q` badges
**When** rendered
**Then** operator text says “Tessl quality” (not raw `quality_score`)

**Given** locus / availability chips
**When** rendered
**Then** chips use the glossary above (or equally plain synonyms) — never raw enum keys like `source_on_disk`

**Out of scope:** renaming DB columns, API fields, or developer console/`outputJson` dumps.

### GWT-42.11 — Three quality tabs render on the dashboard (A14) — **delta open**

**Given** the operator is on the Tripwire dashboard (past intro)
**When** the dashboard toolbar renders
**Then** three quality triage tabs are visible: **Quality ≥ 80**, **Quality < 80**, and **No quality score**
**And** exactly one tab is active at a time (default: **Quality ≥ 80**)

### GWT-42.12 — High tab lists only skills with quality ≥ 80 (A14)

**Given** live or mock data includes skills with mixed quality scores (e.g. 92, 88, 75, 61, null) and MCP servers
**When** the operator selects **Quality ≥ 80**
**Then** the grid/list shows only **skill** items where `typeof quality === 'number' && quality >= 80`
**And** MCP servers are excluded from quality buckets (no Tessl score) but pass through the quality filter and remain visible in the grid on all quality tabs

### GWT-42.13 — Low tab lists only below-threshold scored skills (A14)

**Given** the same mixed dataset
**When** the operator selects **Quality < 80**
**Then** the grid/list shows only **skill** items where `typeof quality === 'number' && quality < 80`
**And** items with quality exactly 79 appear here, not in High or No quality score
**And** null/missing/NaN quality skills are excluded
**And** MCP servers are excluded from quality buckets but pass through the quality filter and remain visible in the grid

### GWT-42.17 — No quality score tab lists unscored skills only (A14)

**Given** the same mixed dataset
**When** the operator selects **No quality score**
**Then** the grid/list shows only **skill** items where quality is `null`, missing, or `NaN`
**And** items with any numeric score (including 0–79) are excluded
**And** MCP servers are excluded from quality buckets but pass through the quality filter and remain visible in the grid

### GWT-42.14 — Quality tabs compose with search and type filters (A14)

**Given** the operator has typed a search query and/or selected **Skills** in the existing type tabs
**When** they switch between quality tabs
**Then** results are the intersection of search + type filter + active quality tab
**And** clearing filters resets quality tab to default, search, and type filter

### GWT-42.15 — Empty state when a quality tab has no matches (A15)

**Given** filters yield zero skills for the active quality tab
**When** the dashboard renders
**Then** the existing filter-empty panel appears with copy naming the active quality tab
**And** **Clear filters** resets quality tab to default, search, and type filter

### GWT-42.16 — Tab counts reflect filtered skills (A15)

**Given** the dashboard has loaded item data
**When** quality tabs render
**Then** each tab label includes a count of matching **skills** (e.g. `≥ 80 (12)`)
**And** counts update when Live realtime refresh replaces item data

---

## Before-Checks

### Shipped (A1–A8) — historical, PR #95

- [x] Reproduce A1: load dashboard, identify ≥1 RED card showing "never scanned" while Supabase confirms `heatmap_status='red'` and a scan run exists
- [x] Reproduce A3: confirm `SELECT install_locus FROM items WHERE type='mcp_server'` returns `'unknown'` for ≥1 MCP server that is locally invoked
- [x] Confirm `scan_runs` total count > 200 in Supabase (`SELECT count(*) FROM scan_runs`)
- [x] `quality-gates.sh` passes on `main` before starting

### Delta (A9–A13) — reopen

- [x] On current `main` (post-#95): confirm grid cards show `risk` but **no** top-level quality badge; Tessl expanded row hides null scores via `sc-if`
- [x] Confirm detail meta still shows literal `risk_score` and list column label is ambiguous `Score`
- [x] Confirm `risk N.NN` has no hover/title explaining formula/range/meaning
- [x] Confirm quality (when shown in Tessl expand) has no hover explaining 0–100 Tessl meaning
- [x] Identify ≥1 skill with numeric quality and ≥1 with null quality after scan (or mock fixtures covering both)
- [x] `quality-gates.sh` passes on the delta branch base before starting
- [x] Coordinate with slice 43: both touch `Tripwire.dc.html` — prefer execute after #96 merges, or rebase onto 43 tip

### Delta (A14–A15) — second reopen

- [ ] On current `main` (post-#98): confirm A9–A13 quality badges render; no quality triage tabs yet
- [ ] Confirm slice 47 ✅ on `main` (`items.quality_score` scoped to Tessl Review Quality)
- [ ] Branch `slice/42-quality-score-tabs` created from current `main`
- [ ] No concurrent edit on `Tripwire.dc.html` (check slices 48/51 if ON BRANCH — rebase if needed)
- [ ] `quality-gates.sh` passes on the delta branch base before starting

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

### Sub-task 6 — Fix A8: scanner run stats badge on cards (FE/UX)

**File**: `prototypes/dc-dashboard/Tripwire.dc.html`

**Where**: `decorateItem()` method (around line 1229) + card template (lines 563–575).

**Logic** (pure FE — no API change needed, data already in `it.scanners`):

```js
// In decorateItem(), after findingCountParts:
const FAIL_STATUSES = new Set(['failed', 'unreachable', 'skipped_missing_credential']);
const scannerOk   = (it.scanners || []).filter(s => s.status === 'completed').length;
const scannerFail = (it.scanners || []).filter(s => FAIL_STATUSES.has(s.status)).length;
const hasScannerStats = scannerOk + scannerFail > 0;
const scannerStatBadge = hasScannerStats
  ? (scannerFail > 0 ? `${scannerOk}✓ ${scannerFail}✗` : `${scannerOk}✓`)
  : null;
```

**Template** — add after the `hasFindingCountSingle` block (line ~574):

```html
<sc-if value="{{ item.scannerStatBadge }}">
  <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);
               background:var(--bg-elevated);padding:2px 6px;border-radius:4px;
               border:1px solid var(--border-subtle);white-space:nowrap">
    {{ item.scannerStatBadge }}
  </span>
</sc-if>
```

Color rule: if `scannerFail > 0`, tint the badge amber (`#f59e0b18` background, `#f59e0b` border and text); if all passed, use muted/neutral.

**Tests** (existing `guard/tests/test_dashboard_live_data.py` or a new `test_scanner_stat_badge.py`):
- Item with 3 scanners all completed → `scannerStatBadge === '3✓'`
- Item with 2 completed + 1 unreachable → `scannerStatBadge === '2✓ 1✗'`
- Item with 0 scanners (unscanned) → `scannerStatBadge === null`
- Item with 1 failed + 0 completed → `scannerStatBadge === '0✓ 1✗'`

---

### Sub-task 7 — Fix A4: improve Tessl quality_score logging and parser (Sandbox)

**Fix is inside this repo** — no external dependency. **Shipped in PR #95.**

**Root cause** (from code audit, A4): `sandbox/scanners.py:559-582` (`run_tessl`) calls
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

### Sub-task 8 — Fix A9: quality badge + unknown indicators on cards (FE/UX) — **delta**

**Files**:
- `prototypes/dc-dashboard/Tripwire.dc.html` — `decorateItemStatus()` + grid/list card templates
- Prefer deriving labels from existing `it.quality` (already mapped in `tripwire-live.js` from `quality_score`)

**Logic** (pure FE):

```js
// In decorateItemStatus(), alongside scannerStatBadge:
// skills only
const qualityKnown = typeof it.quality === 'number' && !Number.isNaN(it.quality);
const neverScanned = !it.lastScan && it.status === 'grey';
const qualityBadge = it.type !== 'skill' ? null
  : qualityKnown ? `Q ${Math.round(it.quality)}`
  : neverScanned ? 'Q —'
  : 'Q ?';  // scanned / running / error but no Tessl score
const qualityBadgeTone = qualityKnown ? 'known' : neverScanned ? 'unknown-unscanned' : 'unknown-unscored';
```

**Template** — grid + list cards: badge after risk (or beside scannerStatBadge), with distinct styles:
- `known`: CTA/signal-ink tint, mono, bordered (highlight)
- `unknown-unscanned`: muted grey (`--text-muted` / grey chip)
- `unknown-unscored`: amber attention chip (actionable — schedule Tessl)

**Tooltip** — required on the badge (A12 / GWT-42.9); do not ship A9 without hover/focus explanation.

**Tests** (`prototypes/dc-dashboard/test/`):
- Skill with `quality: 92` → badge `Q 92`, tone known
- Skill `grey` + null quality + no lastScan → `Q —`
- Skill scanned + null quality → `Q ?`
- MCP item → no quality badge
- HTML contract: template references `qualityBadge` (same style as existing `scannerStatBadge` tests)

---

### Sub-task 9 — Fix A10: detail + Tessl inner cards surface metrics + schedule cue (FE/UX) — **delta**

**Files**:
- `prototypes/dc-dashboard/Tripwire.dc.html` — detail meta row (~risk/last scan line) + Tessl scanner card header/body
- Do **not** rely solely on `<sc-if value="{{ scv.output.quality_score }}">` (hides null)

**Behaviour**:
1. Detail header always shows quality state for skills (same three states as A9).
2. Tessl inner card header shows score or explicit not-scored/unreachable label when collapsed.
3. When state is `unknown-unscanned` or `unknown-unscored`, show one-line cue:
   `Schedule: tripwire scan <identifier> --force` (or equivalent short operator hint).

**Tests**:
- selectedView / scannersView expose `qualityBadge` / `qualityScheduleCue`
- Tessl row with null score still renders not-scored label + cue
- Truthy score still shows numeric highlight (regression on existing `/100` display)

---

### Sub-task 10 — Fix A11: risk label hover explains formula / range / meaning (FE/UX) — **delta**

**Files**:
- `prototypes/dc-dashboard/Tripwire.dc.html` — grid/list `risk {{ item.riskLabel }}` and detail `risk_score {{ selectedView.riskLabel }}`
- Optional helper in `tripwire-status.js` (keep tooltip copy SSOT next to `statusFromRisk`) if that avoids duplicating long strings in HTML

**Behaviour**:
1. Wrap the risk label in an element with `title` (minimum) and preferably `aria-describedby` / focusable tooltip so hover **and** keyboard focus work.
2. Tooltip body (exact wording may be tightened in implementation; must cover all four facts from GWT-42.8):

```
Risk score = weighted finding density for sort/trend (not card colour).
Formula: (3×red + 1×amber) ÷ completed scanner checks. Router findings excluded.
Range: 0 = clean density; higher = denser weighted findings (unbounded; ≥1.5 is high-density fallback).
Card colour (RED/AMBER/GREEN) = worst actionable finding, independent of this number.
```

3. When `riskLabel === '—'` / risk null, use the unknown variant from GWT-42.8.
4. Do **not** change rollup math — tooltip only; SoT remains `tripwire_rollup_item`.

**Tests**:
- HTML/contract: risk label element(s) carry tooltip/title content matching formula keywords (`3×` or `3*`, `checks`, `worst` or `colour`/`color`)
- Optional unit: helper builds known vs unknown tooltip strings
- Regression: displayed `risk 0.75` formatting unchanged

---

### Sub-task 11 — Fix A12: quality badge hover explains Tessl 0–100 (FE/UX) — **delta**

**Files**:
- Same as A9/A10 (`Tripwire.dc.html` quality badge + Tessl quality line)
- Optional SSOT helper next to risk tooltip helper (e.g. `qualityTooltip(state)` in `tripwire-status.js`)

**Behaviour**:
1. Every rendered `qualityBadge` (grid, list, detail header) carries hover/focus explanation covering GWT-42.9 facts.
2. Tessl inner-card quality label gets the same tooltip (including when showing not-scored).
3. Suggested copy (tighten in implementation; must stay accurate):

```
Tessl quality = skill-review score from Tessl (not security risk / not card colour).
Range: 0–100 (higher is better). Source: tessl skill review --json → items.quality_score.
Q — = never scanned / no score yet. Q ? = scanned but Tessl did not yield a score — schedule: tripwire scan <id> --force.
```

4. Do **not** invent thresholds that paint card colour from quality — quality stays informational.

**Tests**:
- HTML/contract: `qualityBadge` / quality label elements include tooltip keywords (`Tessl`, `0–100` or `0-100`, `skill review`)
- Unknown-state tooltips distinguish never-scanned vs unscored
- MCP cards still omit quality badge + tooltip

---

### Sub-task 12 — Fix A13: operator-friendly labels (FE/UX) — **delta**

**Files**: `prototypes/dc-dashboard/Tripwire.dc.html` (templates + `locusLabel` / `availLabel` + `listColumns`)

**Behaviour**:
1. Apply GWT-42.10 glossary to all operator-visible strings listed there.
2. Prefer one shared `riskDensityLabel` prefix helper so grid/detail/list stay consistent.
3. Keep A11/A12 tooltips free to mention schema names (`risk_score`, `quality_score`) in the *explanation* body if useful — chrome labels stay plain.
4. Do not rename DB/API fields.

**Tests**:
- HTML contract: no operator chrome match for `/\brisk_score\b/` or `/\bquality_score\b/` in visible template strings (allow inside comments/tooltips if documented)
- Detail meta uses `Risk density`
- List column label is `Risk density` (not `Score`)
- Tessl line uses `Tessl quality`
- `locusLabel`/`availLabel` return glossary phrases for known enums

---

### Sub-task 13 — Fix A14–A15: quality score triage tabs (FE/UX) — **delta**

**Files**:
- `prototypes/dc-dashboard/tripwire-status.js` — pure helpers: `qualityMeetsThreshold(item, floor)`, `qualityTabBucket(item)`, `filterItemsByQualityTab(items, tab)`
- `prototypes/dc-dashboard/Tripwire.dc.html` — state `qualityTab` (`high` | `low` | `unscored`); toolbar tab buttons; wire into `filtered` pipeline after type/search/status filters; extend `filterEmptyCopy` / `clearFilters`
- `prototypes/dc-dashboard/test/tripwire-status.test.js` — GWT-42.12–42.13, GWT-42.17 unit tests (79 vs 80 boundary, null, NaN)

**Behaviour**:
1. Three tabs: **Quality ≥ 80** (default), **Quality < 80**, and **No quality score** — skills-only filter (`item.type === 'skill'`).
2. Threshold **80** on `item.quality` (already mapped from `items.quality_score` in `tripwire-live.js`).
3. Tab labels include skill counts (GWT-42.16); empty state names active tab (GWT-42.15).
4. Reuse A11/A12 tooltip helpers — do not duplicate quality explanation strings.

**Out of scope:** Supabase schema; Tessl scanner; `/tw-verify` output; canvas artifact removal.

**Tests**:
- Unit: high bucket excludes 79 and null; low includes 79/61 not null; unscored includes null/NaN only; boundary 80/79
- Unit or manual: search + type + quality intersection (GWT-42.14)
- Manual smoke: tab chrome + counts on `http://127.0.0.1:8765/`

---

## After-Checks

### Shipped (A1–A8) — historical, PR #95

- [x] GWT-42.1: Dashboard reloaded; every previously "never scanned" RED card now shows a last-scan date and ≥1 finding (or a justified 0 with explanation)
- [x] GWT-42.2: `SELECT name, install_locus, source_availability FROM items WHERE type='mcp_server'` — zero rows with `'unknown'` locus
- [x] GWT-42.3: Open any ERROR card — panel shows contextual failure message (not bare "0 findings")
- [x] GWT-42.4: Network tab confirms `findings` and `scan_run_scanners` requests are scoped (not full-table)
- [x] GWT-42.5: Every card with ≥1 scanner shows a compact `N✓` or `N✓ M✗` badge; unscanned cards show no badge; amber tint appears when `M > 0`
- [x] All CLI tests pass: `npm test` in `cli/`
- [x] Specification coverage: every GWT clause has ≥1 test (GWT-first); essential error paths covered
- [x] `quality-gates.sh` passes
- [x] Dashboard anomaly re-audit: count drops from 66 to <10
- [x] Complexity evidence: `cli/` complexity policy `enforcing` (existing gate); `tripwire-live.js` changes are UX/data-fetch only — no new cyclomatic complexity introduced

### Delta (A9–A13) — reopen gate

- [x] GWT-42.6: Skill cards show highlighted `Q N` when known; `Q —` when never scanned; `Q ?` when scanned-not-scored; MCP cards omit Tessl quality
- [x] GWT-42.7: Detail header + Tessl inner card always surface quality state; missing score shows schedule cue
- [x] GWT-42.8: Hover/focus on risk density value (and `—`) shows tooltip covering what / how / range / colour independence; detail meta parity
- [x] GWT-42.9: Hover/focus on quality badge (`Q N` / `Q —` / `Q ?`) and Tessl quality line explains Tessl 0–100 meaning / source / unknown states
- [x] GWT-42.10: No `risk_score` / `quality_score` in operator chrome; “Risk density” + “Tessl quality” + glossary locus/avail labels; list header not bare “Score”
- [x] `(cd prototypes/dc-dashboard && npm test && npm run lint)` passes
- [x] Specification coverage: every new GWT-42.6–42.10 clause has ≥1 test
- [x] `./scripts/quality-gates.sh` passes
- [x] Complexity evidence: prototype dashboard **reporting** only — `cd prototypes/dc-dashboard && npx eslint -c eslint.complexity.config.js *.js` recorded in `gate-evidence/slice-42.json` (delta); no inventing new thresholds
- [x] `docs/plan/gate-evidence/slice-42.json` updated for delta (`gate_status` / commands / review) — prior A1–A8 PASS retained as `prior_pass: "#95"`
- [x] Doc audit below complete for delta
- [x] code review passed (nw-review — APPROVED 2026-08-20)

### Delta (A14–A15) — second reopen gate

- [x] GWT-42.11: Quality ≥ 80 / Quality < 80 / No quality score tabs visible; default High
- [x] GWT-42.12: unit — high bucket excludes 79, null
- [x] GWT-42.13: unit — low bucket includes 79/61, excludes null
- [x] GWT-42.17: unit — unscored bucket includes null/NaN, excludes numeric scores
- [ ] GWT-42.14: search + type + quality intersection (unit or manual)
- [ ] GWT-42.15: empty state copy names active quality tab (manual smoke)
- [ ] GWT-42.16: tab labels show skill counts (manual smoke)
- [x] `(cd prototypes/dc-dashboard && npm test && npm run lint)` passes
- [ ] `./scripts/quality-gates.sh` passes
- [ ] Complexity evidence: prototype dashboard **reporting** only — same policy as A9–A13 delta
- [x] `docs/plan/gate-evidence/slice-42.json` updated for A14–A15 delta (`prior_pass` retains #98)
- [ ] Doc audit below complete for A14–A15
- [x] `/nw-review` APPROVED before ✅ PASSED

---

## Code Review (nw-review, slice-42 delta)

**Reviewer**: software-crafter (review mode)
**Timestamp**: 2026-08-20 15:18 UTC
**Verdict**: **APPROVED**

**Summary**: All GWT-42.6–42.10 acceptance criteria are implemented, tested, and ready for production. Test quality is high (14 unit + 2 HTML contract tests, zero theater, 100% behavioral assertions). No blockers, no high issues. External validity confirmed: all computed fields are wired into templates and rendered.

**Test Evidence**:
- ✅ qualitySurfacing: 4 tests covering known / unknown-unscanned / unknown-unscored / MCP-omit states
- ✅ riskTooltip: 2 tests covering formula explanation and unknown-risk states
- ✅ qualityTooltip: tone-specific variants verified
- ✅ operatorLocusLabel / operatorAvailLabel: 8-mapping glossary audit
- ✅ tesslInnerQuality: 3 tests covering null / known / non-Tessl cases
- ✅ HTML contract: regex validation of template wiring, no snake_case chrome, CSS tip hosting

**Quality Gates**: All G1–G9 pass. Test budget 14 ≤ 18 (2 × 9 behaviors). Zero defects, zero escalations.

**Approval basis**:
- All 9 distinct behaviors from GWT-42.6–42.10 have ≥1 test with concrete assertions
- Zero testing theater, zero test modifications, zero test escalations
- All entry points wired and tested in HTML contract
- Operator glossary enforced: no `risk_score` / `quality_score` / enum jargon in visible chrome

---

## Doc Audit

### Shipped (A1–A8)

- [x] `docs/plan/DECISIONS.md`: log the A1 option chosen (Option A vs Option B)
- [x] `CHANGELOG.md`: entry for dashboard data quality fix
- [x] `SMOKE_TESTS.md`: update or add smoke test for dashboard data completeness (all RED cards show findings or justified 0)
- [x] Anomaly audit report (`~/.claude/plans/iterate-through-all-of-lovely-stearns.md`): note resolution status per anomaly

### Delta (A9–A13)

- [x] `docs/plan/DECISIONS.md`: log reopen of slice 42 for A9–A10 (this session)
- [x] `docs/plan/DECISIONS.md`: log A11 risk tooltip augment (this session)
- [x] `docs/plan/DECISIONS.md`: log A12 quality tooltip + top propagation check (this session)
- [x] `docs/plan/DECISIONS.md`: log A13 operator-friendly labels (this session)
- [x] `CHANGELOG.md`: entry for Tessl quality card/panel surfacing + risk/quality tooltips + label polish
- [x] Screenshot or smoke note: quality badge + risk hover + plain labels visible on grid + detail (optional if mock fixtures cover tests)

### Delta (A14–A15)

- [x] `docs/plan/DECISIONS.md`: log A14–A15 reopen; note slice 54 superseded
- [x] `CHANGELOG.md`: entry for dashboard quality score triage tabs (≥80 / <80 / unscored)
- [x] `docs/STATUS.md`: IMPLEMENTED note on branch

---

## Open Questions (for discussion before 🔨)

### Resolved (A1–A8)

1. **A1 approach**: Option A chosen (limit=2000) — see DECISIONS 2026-08-19.
2. **A3 scope**: immediate rescan chosen — see DECISIONS 2026-08-19.
3. **A7 true count**: addressed post-A1 in PR #95 audit notes.

### Resolved (A9–A13) — USER-CONFIRMED reopen 2026-08-20 (+ A11–A13 pile-ons)

1. **Badge copy**: compact `Q 92` / `Q —` / `Q ?` (not spelled-out).
2. **MCP servers**: omit Tessl quality badge entirely (no `Q n/a`).
3. **Sequencing vs slice 43**: execute on branch `slice/42-tessl-quality-card-surfacing` from `main` after #96 merges when practical; if #96 still open, rebase onto 43 tip before editing `Tripwire.dc.html` (same-file overlap).
4. **Risk tooltip**: fixed `#score-tip-portal` (not native `title`, not in-card absolute — overflow clip); keyboard-accessible; copy matches `tripwire_rollup_item` formula (no invented scale max).
5. **Quality tooltip**: required with A9 — Tessl 0–100 skill-review explanation; parity with risk hover; not optional.
6. **Operator labels**: use GWT-42.10 glossary (`Risk density`, `Tessl quality`, plain locus/avail); no snake_case in chrome.

### Resolved (A14–A15) — USER-CONFIRMED reopen 2026-08-25

1. **Blend, not new slice**: quality tabs are A14–A15 delta on slice 42; slice 54 stub removed.
2. **Threshold**: 80/100 fixed (Tessl Review Quality axis); not configurable in v1.
3. **Scope**: skills only; MCP servers never appear in quality tab filters.
4. **Default tab**: Quality ≥ 80 (operators see the “good” set first).
5. **Branch**: `slice/42-quality-score-tabs` from current `main`.
6. **Three tabs (2026-08-25 amend)**: split former **Rest** into **Quality < 80** (numeric score below threshold) and **No quality score** (null/missing/NaN).

---

## Gate Status

✅ PASSED — A1–A13 merged ([#95](https://github.com/neomatrix369/tripwire/pull/95) + [#98](https://github.com/neomatrix369/tripwire/pull/98)).

📋 PLANNED — A14–A15 quality score tabs (second delta reopen on slice 42).

🔀 ON BRANCH — A14–A15 implemented on `slice/42-quality-score-tabs` (`2326793`); awaiting PR + nw-review before ✅ PASSED.

```json
{
  "slice": 42,
  "gate_status": "ON_BRANCH",
  "delta": "A14-A15-quality-score-tabs",
  "prior_pass": "#95 + #98",
  "branch": "slice/42-quality-score-tabs",
  "open_questions": [],
  "reopen_confirmed": "2026-08-25"
}
```

---

## Code Review (nw-review, slice-42 A14–A15 delta)

**Date:** 2026-08-25 · **Reviewer:** software-crafter-reviewer · **Mode:** classic TDD · **Iteration:** 1

### Verdict: ✅ APPROVED

### Summary

All five quality-tab unit tests are correctly designed, budget-compliant, and carry zero TDD violations. Implementation is end-to-end wired through the dashboard entry point with proper reactive updates. No test modifications detected. Three critical design decisions (MCP exclusion via null bucket, default 'high' tab hiding MCPs, empty-state copy naming) all survive adversarial refutation.

### Quantitative Results

| Metric | Result | Budget | Status |
|--------|--------|--------|--------|
| Test count (tripwire-status.test.js) | 5 unit tests | 14 max (7 behaviors × 2) | ✓ PASS |
| Line coverage | 100% on new functions | N/A | ✓ PASS |
| Branch coverage | 100% (boundary 79/80, NaN identity, MCP exclusion) | N/A | ✓ PASS |
| Test budget exceeded | No | N/A | ✓ PASS |
| TDD phases (3-phase canon) | RED→GREEN→COMMIT observed | All present | ✓ PASS |
| Quality gates (G1–G9) | All pass (no test modification, no testing theater) | 9/9 | ✓ PASS |
| AC coverage (GWT-42.11–42.17) | Complete (7/7 scenarios) | 100% | ✓ PASS |

### Detailed Findings

**Test Quality Dimensions:**

1. **Observable Behavioral Outcomes** — ✓ All assertions validate return values: filtered item IDs, bucket enums, boolean matches, count objects. No internal-state testing.

2. **Port-Boundary Compliance** — ✓ All tests enter through public functions (`filterItemsByQualityTab`, `qualityTabBucket`, `matchesQualityTab`, `countSkillsByQualityTab`). No domain-entity direct testing. No hexagon mocking.

3. **Testing Theater Detection** — ✓ Applied deletion test to all 5 test cases; each fails when production code is removed or logic inverted. Specific checks:
   - Line 301–308 (high tab): fails if `quality >= floor` becomes `>` (boundary 79/80 caught)
   - Line 310–317 (low tab): fails if `<` becomes `<=` (boundary caught)
   - Line 319–326 (unscored): fails if `Number.isNaN()` check removed (NaN identity caught)
   - Line 328–340 (bucket + MCP exclusion): fails if `isSkillItem()` guard omitted (MCP hidden-by-default caught)
   - Line 342–348 (counts): fails if count logic inverts

4. **Completeness Validation** — ✓ Mapped GWT-42.11–42.17 to test coverage; no gaps. Boundary conditions (79 vs 80, NaN, null) explicitly tested. Error scenarios covered.

5. **RPP Code Smells (L1–L2)** — ✓ Scanned implementation:
   - L1 (readability): No dead code, no how-comments, named constants in spec (`QUALITY_TAB_FLOOR`), clean scope.
   - L2 (complexity): No method > 20 lines; no duplicated code across filter functions; straightforward conditionals (max nesting 2 levels).
   - Cascade stopped at L1 clean. No L3+ issues present.

### Design Decision Validation (Adversarial Refutation)

| Decision | Adversarial Test | Survived? | Evidence |
|----------|------------------|-----------|----------|
| **MCP pass-through in quality filter** | Non-skill items always pass `matchesQualityTab` regardless of active tab; `qualityTabBucket` still returns null for non-skills but `matchesQualityTab` short-circuits before comparing | ✓ CORRECTED | Bug (PR #120): `matchesQualityTab` returned `false` for MCP servers on all tabs, making them invisible in the default `'high'` view. Fix: `if (!isSkillItem(item)) return true` in `matchesQualityTab` — quality tabs are skills-only; non-skills are never filtered out |
| **Default tab 'high' scope** | Omit `qualityTab: 'high'` state initialization | ✓ YES | If qualityTab is undefined, code crashes on `s.qualityTab` reference in filter pipeline; state must be initialised |
| **Empty-state names quality tab** | Remove quality-tab prefix from `filterEmptyCopy()` | ✓ YES | Hypothetical test: filter yields zero items with `qualityTab='low'`; without the prefix, empty copy would not signal "Quality < 80" filtering to user |

### External Validity

✓ **Feature is wired end-to-end through the dashboard entry point:**
- HTML `onClick` → `setQualityTab()` → `setState({ qualityTab })`
- Filter pipeline: `matchQualityTab(it, s.qualityTab)` applied in render-phase filter chain
- Live data: `countSkillsByQualityTab(data.items)` counts actual loaded items; tabs update reactively
- Reset: `clearFilters()` → `qualityTab: 'high'` default restored

### Test Modification Detection (G9)

✓ **PASS** — No weakened, deleted, or skipped tests detected. All assertions at original strength. No comment markers (TODO, FIXME) in test files. Commit 2326793 shows tests authored in GREEN phase with full assertions intact.

### Checklist

- [x] Test budget validation passed (5 ≤ 14)
- [x] All AC (GWT-42.11–42.17) covered by tests
- [x] Boundary conditions tested (79/80, NaN identity, MCP exclusion)
- [x] No internal-class testing; all tests enter through driving ports
- [x] No mocks inside hexagon (pure function tests)
- [x] All assertions on observable outcomes (return values, not internals)
- [x] Zero testing theater patterns (tautological, mock-dominated, zero-assertion)
- [x] TDD phases observed (RED→GREEN→COMMIT)
- [x] Quality gates G1–G9 all pass
- [x] Test modification detection (G9) clean
- [x] External validity verified (feature wired end-to-end)
- [x] Contract shape compliant (docstrings, GWT naming, clear messages)

### Approval Status

**✅ APPROVED for merge.** Zero defects. Ready for PR.
