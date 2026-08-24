# Slice 51 — Tessl: Review (Security) Adapter (Row 5)

**Wave**: 12-L
**MoSCoW**: Could
**Depends on**: 47
**Status**: 📋 PLANNED
**Read time**: ~3 min

## Context

Implements `tessl review run security <path> --workspace <ws>` as a separate row from Quality Review. Shares the `_run_tessl_review(judge_type, ...)` parameterised function introduced in slice 47. Populates `upstream_run_ids.review_quality` from in-process `_TesslIdContext` (seeded by slice 47) so the UI can show cross-linked findings.

Design reference: `docs/design/tessl-5-row-expansion.md § (a) Shared Review Mechanic, § (c) 7(a), § ID carry-forward contract`

**ID carry-forward**: Security runs after Eval in the pipeline order. At step start, `_attach_upstream_run_ids(row, ctx, "review_quality")` snapshots Quality's ID from `ctx` (not a DB join). After Security completes, `_stamp_tessl_run_id` persists Security's own review run ID.

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

### Scenario 3 — upstream_run_ids links to Quality Review via ctx

**Given** `ctx["review_quality"] = "rev_abc123"` from the same `run_tessl()` invocation
**When** Security Review starts
**Then** `_attach_upstream_run_ids(row, ctx, "review_quality")` writes `upstream_run_ids = {"review_quality": "rev_abc123"}` **before** `review run security`
**And** after Security completes, `_stamp_tessl_run_id` writes Security's own `tessl_run_id`
**And** the dashboard can display Quality findings alongside Security findings for human prioritisation

### Scenario 4 — Security review proceeds without prior Quality Review ID

**Given** Quality Review did not produce a run ID (`ctx["review_quality"]` is null)
**When** Security Review runs
**Then** Security Review proceeds without the cross-read
**And** `upstream_run_ids = {"review_quality": null}` is written before invocation

## Files to touch

- `sandbox/scanners.py` — add security review step using `_run_tessl_review(judge_type="security", …)`; `_attach_upstream_run_ids(row, ctx, "review_quality")` before invoke; `_stamp_tessl_run_id` after success
- `prototypes/dc-dashboard/Tripwire.dc.html` — UI: show Quality findings alongside Security findings when `upstream_run_ids.review_quality` is populated (UI-level traceability, not CLI behavior)

## Gate evidence fields

`coverage_pct`: target ≥ 80% for security review adapter code
`complexity_tool`: ruff/radon on `sandbox/scanners.py`
`doc_audit`: design doc § (c) 7(a) — mark as implemented
