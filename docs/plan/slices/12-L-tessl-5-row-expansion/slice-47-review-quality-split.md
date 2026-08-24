# Slice 47 — Tessl: Review (Quality) Split + `tesslQuality` Scope Fix (Row 2)

**Wave**: 12-L
**MoSCoW**: Must
**Depends on**: 45, 46
**Status**: 📋 PLANNED
**Read time**: ~4 min

## Context

The current single `"Tessl"` row is renamed to `"Tessl: Review (Quality)"`. The `tesslQuality` badge binding in the dashboard, currently matching any row with `scanner_source == "Tessl"`, is scoped to `"Tessl: Review (Quality)"` only.

This is the highest-value single change: it establishes the row naming contract that all other slices extend, and it makes the dashboard correctly separate Lint (Row 1) from Review (Row 2).

Design reference: `docs/design/tessl-5-row-expansion.md § (a), (d), § Shared Review Mechanic`

## Acceptance Criteria (GWT)

### Scenario 1 — Existing quality review row renamed

**Given** a scan_run triggers the Tessl group runner
**When** the quality review (`tessl review run`) completes
**Then** the `scan_run_scanners` row has `scanner_source = "Tessl: Review (Quality)"`
**And** `tessl_run_id` is populated with the Tessl-side run ID (from `tessl review view --last --json`)
**And** `tessl_run_id_at` is set to the time of capture

### Scenario 2 — `tesslQuality` badge scoped correctly

**Given** a scan_run has both a `Tessl: Lint` row and a `Tessl: Review (Quality)` row
**When** the dashboard renders the scanner outputs list
**Then** the quality score badge (`Q 59` style) appears only on the `Tessl: Review (Quality)` row
**And** the Lint row shows no quality badge

### Scenario 3 — `needs_setup` when TESSL_TOKEN absent

**Given** TESSL_TOKEN is absent from the Modal sandbox
**When** the Tessl runner executes
**Then** the `Tessl: Review (Quality)` row has `status = "needs_setup"`

### Scenario 4 — Shared review mechanic parameterised

**Given** both Quality and Security review share the same underlying adapter function
**When** the Quality variant is invoked
**Then** the parameterised function is called with `judge_type="quality"`
**And** the result is written to the `"Tessl: Review (Quality)"` row only

## Files to touch

- `sandbox/scanners.py` — rename `scanner_source` from `"Tessl"` to `"Tessl: Review (Quality)"`; extract `_run_tessl_review(judge_type, ...)` shared function; capture `tessl_run_id` from `tessl review view --last --json` after async completion
- `prototypes/dc-dashboard/Tripwire.dc.html` — scope `tesslQuality` binding to `"Tessl: Review (Quality)"` (line ~1686)
- Any existing tests referencing `scanner_source == "Tessl"` — update to new string

## Gate evidence fields

`coverage_pct`: target ≥ existing Tessl test coverage
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: update design doc + user-guide if scanner name appears in user-visible docs
