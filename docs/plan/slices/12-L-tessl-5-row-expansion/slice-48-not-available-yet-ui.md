# Slice 48 — "Not Available Yet" Placeholder Rows (Rows 3–5)

**Wave**: 12-L  
**MoSCoW**: Must  
**Depends on**: 47  
**Status**: 📋 PLANNED  
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

**Given** a future implementation inserts a `"Tessl: Scenario Generation"` row for a scan_run  
**When** the dashboard renders  
**Then** the sentinel placeholder for Scenario Generation is replaced by the real row (with its actual status pill)

## Files to touch

- `prototypes/dc-dashboard/Tripwire.dc.html` — add `TESSL_CAPABILITY_SOURCES` constant (ordered list of 5 strings); extend `scannersView` map to merge DB rows with sentinel objects for missing Tessl sources; add `status === 'not_available_yet'` style branch

## Gate evidence fields

`coverage_pct`: N/A (dashboard JS; no Python tests)  
`complexity_tool`: N/A  
`doc_audit`: design doc § (d) count formula and "Not Available Yet" rules — mark as implemented
