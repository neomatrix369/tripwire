# Slice 48 — "Not Available Yet" Placeholder Rows (Rows 3–5)

**Wave**: 12-L
**MoSCoW**: Must
**Depends on**: 47
**Status**: 🔨 IN PROGRESS · `slice/48-not-available-yet-ui`
**Read time**: ~3 min

## Context

From day 1, the Scanner Outputs list shows all 5 Tessl rows. Rows 3–5 (Scenario Generation, Eval, Review (Security)) are not yet implemented and render in a greyed-out "Not Available Yet" state — no action affordance, never inserted into the DB.

This slice adds the static constant list of 5 Tessl `scanner_source` values to the dashboard, and emits sentinel objects for any that are absent from the actual DB rows for the current scan_run.

Design reference: `docs/design/tessl-5-row-expansion.md § (d) — "Not Available Yet" Rendering Rules`

## Acceptance Criteria (GWT)

### Scenario 1 — All 5 Tessl rows visible immediately

**Given** a scan_run has only `Tessl: Lint` and `Tessl: Review (Quality)` rows in the DB (rows 3–5 not implemented yet)
**When** the dashboard renders
**Then** 5 Tessl rows appear in the Scanner Outputs list, in order: Lint, Review (Quality), Scenario Generation, Eval, Review (Security)
**And** rows 3–5 show pill label "Not Available Yet" in muted style
**And** rows 3–5 have no chevron/expand affordance, no checks_run count, no duration

### Scenario 2 — Scanner Outputs count includes placeholder rows

**Given** a scan_run with 2 implemented Tessl rows and 3 "Not Available Yet" sentinel rows
**When** the dashboard renders the Scanner Outputs header
**Then** the count reflects all 5 Tessl rows plus other scanner rows (e.g. `(10)` not `(7)`)

### Scenario 3 — Sentinel rows are never inserted to DB

**Given** the Tessl runner executes (any scan_run)
**When** the runner completes
**Then** no `scan_run_scanners` row with `scanner_source IN ("Tessl: Scenario Generation", "Tessl: Eval", "Tessl: Review (Security)")` is written
**And** the dashboard derives the sentinel rows from the static list, not from the DB

### Scenario 4 — Sentinel rows disappear when feature ships

**Given** a future implementation inserts a `"Tessl: Scenario Generation"` or `"Tessl: Eval"` row for a scan_run (slices 49–50)
**When** the dashboard renders
**Then** the sentinel placeholder for that capability is replaced by the real DB row (with its actual status pill, e.g. Eval `blocked`, `running`, or `completed`)
**And** only `"Tessl: Review (Security)"` remains a sentinel until slice 51 ships

### Scenario 5 — Tessl plugin upload omits host `evals/`

**Given** a local skill directory with a Tessl root marker (`tessl.json` or `.tessl-plugin/`) and a host `evals/` corpus
**When** the host packs the directory for Modal (`_pack_local_dir`) or copies it on the same machine (`_copy_local`)
**Then** root `evals/` is absent from the sandbox workdir
**And** other skill files (e.g. `SKILL.md`) are present
**And** a nested path that is not the plugin-root `evals/` directory is kept

### Scenario 6 — Non-Tessl trees keep `evals/`

**Given** a local skill directory with no Tessl root marker and an `evals/` folder
**When** `_pack_local_dir` acquires the target
**Then** `evals/` is present in the archive

Git clone and `hashLocalPath` still walk on-disk `evals/` (identity hash / URL clone). This slice only changes host → sandbox file transfer.

## Forward compatibility (slices 49–50)

Slice 48 ships with rows 3–5 as UI-only sentinels. When slice 49 lands, `"Tessl: Scenario Generation"` is written by the runner; when slice 50 lands, `"Tessl: Eval"` is written (initially `blocked`, then auto-chained). The `TESSL_CAPABILITY_SOURCES` merge logic in this slice must continue to prefer DB rows over sentinels — no dashboard rewrite required.

When real rows replace sentinels (slices 49–51), the dashboard may surface `tessl_run_id` and `upstream_run_ids` on expanded views (full cross-read UI deferred to slice 52). Sentinels never carry these fields.

## Files to touch

- `prototypes/dc-dashboard/tripwire-status.js` — `TESSL_CAPABILITY_SOURCES`, `mergeTesslCapabilityRows`, `SCANNER_EXEC_META.not_available_yet`
- `prototypes/dc-dashboard/Tripwire.dc.html` — call merge in `scannersView`; muted `not_available_yet` style branch (no chevron/expand)
- `prototypes/dc-dashboard/test/tripwire-status.test.js` — GWT-48.1–48.4 + MCP guard
- `sandbox/tests/test_scanners_status.py` — runner never writes placeholder sources
- `sandbox/scan_app.py` — omit root `evals/` from Tessl plugin pack/copy
- `sandbox/tests/test_acquire_target.py` — GWT-48.5 / GWT-48.6

## Before-Checks

- [x] Slice 47 ✅ (#109) on main; stub + branch `slice/48-not-available-yet-ui`
- [x] Design § (d) count formula DECIDED (include NAY; MCP unpadded)

## After-Checks

- [x] GWT-48.1 — five Tessl sources in design order; rows 3–5 `not_available_yet`, no checks/duration
- [x] GWT-48.2 — Scanner Outputs count includes placeholders
- [x] GWT-48.3 — runner does not emit Scenario Generation / Eval / Review (Security)
- [x] GWT-48.4 — DB Eval row replaces sentinel; Security stays NAY
- [x] MCP-only scanners are not padded
- [x] Mock UI: `safe-changelog-writer` Scanner Outputs (7), three NAY pills, no chevron; MCP (3) unpadded
- [x] `/nw-review` APPROVED (2026-08-24, iteration 1)
- [x] `./scripts/quality-gates.sh` passes locally
- [x] Doc audit: design § (d), STATUS, ARCHITECTURE, CHANGELOG, DECISIONS
- [x] GWT-48.5 — Tessl pack/copy omits root `evals/`; nested non-root paths kept
- [x] GWT-48.6 — non-Tessl pack keeps `evals/`
- [ ] `/nw-review` packing addendum (iteration 2) — UI review remains APPROVED; packing landed after

## Gate evidence fields

`coverage_pct`: dashboard JS statements/lines ≥ 95% (`prototypes/dc-dashboard`); sandbox packing covered by `test_acquire_target.py` GWT-48.5/48.6
`complexity_tool`: N/A (dashboard JS; xenon still runs on sandbox in quality-gates)
`doc_audit`: design doc § (d) NAY rules + open question E packing exclude — mark as implemented

---

## 🔍 Review (nw-software-crafter-reviewer)

**Verdict**: **APPROVED** (Iteration 1, 2026-08-24T23:42Z)

### Summary

Slice 48 ships a clean, well-tested UI feature for placeholder Tessl rows (3–5, "Not Available Yet"). Implementation is minimal and correct: static constant + merge function + metadata entry. All 5 GWT acceptance criteria are satisfied by 9 JS tests + 1 Python guard. No test modifications, no testing theater, no over-engineering. Dashboard HTML integration verified via regex gate. Forward-compatible with slices 49–51 (DB rows win over sentinels).

### Quantitative Validation

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Budget (2 × behaviors) | ≤10 | 9 | ✓ PASS |
| Quality Gates (G1–G9) | All PASS | All PASS | ✓ PASS |
| AC Coverage | 5 GWT + MCP | 6/6 | ✓ PASS |
| Port-Boundary Compliance | No internal tests | 0 internal | ✓ PASS |
| Testing Theater (Blocker patterns) | 0 | 0 | ✓ PASS |

### Test Quality Findings

**Port-to-Port Discipline**: All tests invoke `mergeTesslCapabilityRows()` (driving port), inspect observable state (source order, status, checks_run nullity). No mocking. No internal class testing.

**Oracle Soundness**: Assertions trace to design:
- Order verified against `TESSL_CAPABILITY_SOURCES` constant
- Sentinel status hardcoded to `"not_available_yet"` per AC
- Checks_run/duration_ms verified as `null` per AC line 25
- DB rows verified to replace sentinels via direct `.find()` + property inspection

**External Validity Gate**: Integration test confirms `mergeTesslCapabilityRows(selected.scanners)` is wired into `Tripwire.dc.html` template. Feature is reachable from production entry point.

### Adversarial Refutation (Falsification Posture)

**Attempted refutation 1 — Call-site missing**: Delete `mergeTesslCapabilityRows` from HTML. Result: Integration test regex match fails. Survive. ✓

**Attempted refutation 2 — MCP false-positive**: Pass MCP-only input. Result: Test verifies no Tessl rows injected; output length === input length. Guard is necessary and tested. Survive. ✓

**Attempted refutation 3 — DB priority broken**: Flip the merge logic to prefer sentinels over DB. Result: GWT-48.4 fails (expects `evalMerged.status === 'blocked'`, gets `'not_available_yet'`). Survive. ✓

### Code Smell Cascade (L1–L3)

**L1 Readability**: No dead code, no how-comments, variables explicit. ✓ Clean.

**L2 Complexity**: Functions ≤11 lines, no nested depth >2, no duplication. ✓ Clean.

**L3 Responsibilities**: Single-purpose functions (sentinel factory, row collector, insert position). ✓ Clean.

Cascade stopped at L1 (no issues escalating to L2/L3).

### Implementation Bias

- ✓ No YAGNI violations (only design-specified features shipped)
- ✓ No premature abstraction (utilities are the right grain)
- ✓ No assumed problems (all code traces to AC)
- ✓ No multi-concern mixing (sentinel creation ≠ merge logic ≠ insert position)

### Conventional Comments

**Praise**:
- Clear GWT story structure; each test reads as an acceptance scenario
- Lean utilities (placeholder factory, row collector, insert logic) are appropriately granular
- Sentinel design is sound: DB rows win over sentinels (correct priority for forward-compat)
- Integration gate catches wiring bugs at the dashboard template level

**Suggestions (non-blocking)**:
- Test constants are well-grouped; no change needed
- Order metadata on `TESSL_CAPABILITY_SOURCES` not required; array constant is simpler

### Blocking Issues

None.

### Recommended Action

✅ **APPROVED** — Ready for PR merge. All quality gates pass. No defects found.
