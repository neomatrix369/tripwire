# Slice 51 — Tessl: Review (Security) Adapter (Row 5)

**Wave**: 12-L
**MoSCoW**: Could
**Depends on**: 47
**Status**: 📋 PLANNED
**Read time**: ~3 min

## Context

Implements `tessl review run security <path> --workspace <ws>` as a separate row from Quality Review. Shares the `_run_tessl_review(judge_type, ...)` parameterised function introduced in slice 47. Populates `upstream_run_ids.review_quality` from the Quality Review row so the UI can show cross-linked findings.

Design reference: `docs/design/tessl-5-row-expansion.md § (a) Shared Review Mechanic, § (c) 7(a)`

## Acceptance Criteria (GWT)

### Scenario 1 — Security review row written separately from Quality

**Given** a scan_run has a completed `Tessl: Review (Quality)` row
**When** the Tessl runner executes the Security Review step
**Then** a separate `scan_run_scanners` row with `scanner_source = "Tessl: Review (Security)"` is written
**And** the Quality Review row is unchanged

### Scenario 2 — Shared adapter parameterised correctly

**Given** `_run_tessl_review(judge_type="security", ...)` is called
**When** the underlying CLI invocation runs
**Then** the command is `tessl review run security <path> --workspace <ws>`
**And** the result is written to the Security row only

### Scenario 3 — upstream_run_ids links to Quality Review

**Given** Quality Review's `tessl_run_id = "rev_abc123"`
**When** Security Review starts
**Then** `upstream_run_ids = {"review_quality": "rev_abc123"}` is written to the Security row
**And** the dashboard can display Quality findings alongside Security findings for human prioritisation

### Scenario 4 — Security review proceeds without prior Quality Review

**Given** Quality Review has not yet completed (no `tessl_run_id`)
**When** Security Review runs
**Then** Security Review proceeds without the cross-read
**And** `upstream_run_ids = {"review_quality": null}` is written

## Files to touch

- `sandbox/scanners.py` — add security review step using `_run_tessl_review(judge_type="security", ...)`
- `prototypes/dc-dashboard/Tripwire.dc.html` — UI: show Quality findings alongside Security findings when `upstream_run_ids.review_quality` is populated (UI-level traceability, not CLI behavior)

## Gate evidence fields

`coverage_pct`: target ≥ 80% for security review adapter code
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (c) 7(a) — mark as implemented
