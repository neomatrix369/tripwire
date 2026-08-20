# Slice 42 — Dashboard Data Quality Fixes

> Wave J | MoSCoW: **Must** | Status: 📋 PLANNED (reopen confirmed 2026-08-20) | Est: ~120 min + ~60 min delta
> Depends on: none (independent; complements slices 21 and 22)
> Prior merge: [#95](https://github.com/neomatrix369/tripwire/pull/95) shipped A1–A8 ✅ — this reopen adds **A9–A11** only
> Reopen: USER-CONFIRMED — ready for 🔨 on `slice/42-tessl-quality-card-surfacing`

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

> **Note**: A7 count is inflated by A1 (FE can't see the findings for out-of-window runs).
> Re-audit after A1 fix to get the true DB-only count.
>
> **Shipped (PR #95):** A1–A8. **Open delta:** A9–A11 (quality surfacing + risk tooltip).

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

---

## Before-Checks

### Shipped (A1–A8) — historical, PR #95

- [x] Reproduce A1: load dashboard, identify ≥1 RED card showing "never scanned" while Supabase confirms `heatmap_status='red'` and a scan run exists
- [x] Reproduce A3: confirm `SELECT install_locus FROM items WHERE type='mcp_server'` returns `'unknown'` for ≥1 MCP server that is locally invoked
- [x] Confirm `scan_runs` total count > 200 in Supabase (`SELECT count(*) FROM scan_runs`)
- [x] `quality-gates.sh` passes on `main` before starting

### Delta (A9–A11) — reopen

- [ ] On current `main` (post-#95): confirm grid cards show `risk` but no quality badge; Tessl expanded row hides null scores via `sc-if`
- [ ] Confirm `risk N.NN` has no hover/title explaining formula/range/meaning
- [ ] Identify ≥1 skill with numeric quality and ≥1 with null quality after scan (or mock fixtures covering both)
- [ ] `quality-gates.sh` passes on the delta branch base before starting
- [ ] Coordinate with slice 43: both touch `Tripwire.dc.html` — prefer execute after #96 merges, or rebase onto 43 tip

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

### Delta (A9–A11) — reopen gate

- [ ] GWT-42.6: Skill cards show highlighted `Q N` when known; `Q —` when never scanned; `Q ?` when scanned-not-scored; MCP cards omit Tessl quality
- [ ] GWT-42.7: Detail header + Tessl inner card always surface quality state; missing score shows schedule cue
- [ ] GWT-42.8: Hover/focus on `risk N.NN` (and `—`) shows tooltip covering what / how / range / colour independence; detail meta parity
- [ ] `(cd prototypes/dc-dashboard && npm test && npm run lint)` passes
- [ ] Specification coverage: every new GWT-42.6/42.7/42.8 clause has ≥1 test
- [ ] `./scripts/quality-gates.sh` passes
- [ ] Complexity evidence: prototype dashboard **reporting** only — `cd prototypes/dc-dashboard && npx eslint -c eslint.complexity.config.js *.js` recorded in `gate-evidence/slice-42.json` (delta); no inventing new thresholds
- [ ] `docs/plan/gate-evidence/slice-42.json` updated for delta (`gate_status` / commands / review) — prior A1–A8 PASS retained as `prior_pass: "#95"`
- [ ] Doc audit below complete for delta

---

## Doc Audit

### Shipped (A1–A8)

- [x] `docs/plan/DECISIONS.md`: log the A1 option chosen (Option A vs Option B)
- [x] `CHANGELOG.md`: entry for dashboard data quality fix
- [x] `SMOKE_TESTS.md`: update or add smoke test for dashboard data completeness (all RED cards show findings or justified 0)
- [x] Anomaly audit report (`~/.claude/plans/iterate-through-all-of-lovely-stearns.md`): note resolution status per anomaly

### Delta (A9–A11)

- [x] `docs/plan/DECISIONS.md`: log reopen of slice 42 for A9–A10 (this session)
- [x] `docs/plan/DECISIONS.md`: log A11 risk tooltip augment (this session)
- [ ] `CHANGELOG.md`: entry for Tessl quality card/panel surfacing + risk tooltip
- [ ] Screenshot or smoke note: quality badge states + risk hover visible on grid + detail (optional if mock fixtures cover tests)

---

## Open Questions (for discussion before 🔨)

### Resolved (A1–A8)

1. **A1 approach**: Option A chosen (limit=2000) — see DECISIONS 2026-08-19.
2. **A3 scope**: immediate rescan chosen — see DECISIONS 2026-08-19.
3. **A7 true count**: addressed post-A1 in PR #95 audit notes.

### Resolved (A9–A11) — USER-CONFIRMED reopen 2026-08-20 (+ A11 pile-on)

1. **Badge copy**: compact `Q 92` / `Q —` / `Q ?` (not spelled-out).
2. **MCP servers**: omit Tessl quality badge entirely (no `Q n/a`).
3. **Sequencing vs slice 43**: execute on branch `slice/42-tessl-quality-card-surfacing` from `main` after #96 merges when practical; if #96 still open, rebase onto 43 tip before editing `Tripwire.dc.html` (same-file overlap).
4. **Risk tooltip**: native `title` minimum; prefer keyboard-accessible description; copy must match `tripwire_rollup_item` formula (no invented scale max).

---

## Gate Status

📋 PLANNED — **reopened** for A9–A11 (USER-CONFIRMED). A1–A8 remain shipped via #95. Ready for 🔨 on `slice/42-tessl-quality-card-surfacing`.

```json
{
  "slice": 42,
  "gate_status": "PLANNED",
  "delta": "A9-A11-quality-and-risk-tooltip",
  "prior_pass": "#95",
  "branch": "slice/42-tessl-quality-card-surfacing",
  "open_questions": [],
  "reopen_confirmed": "2026-08-20"
}
```
