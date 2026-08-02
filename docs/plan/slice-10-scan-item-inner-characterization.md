# Slice 10: scan_item_inner Characterization (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-10-scan-item-inner-characterization
- Files: `sandbox/scan_app.py`, `sandbox/test_scan_app.py` (extend) or new `test_scan_item_inner.py`
- Exit criteria: Characterization locks `_scan_item_inner` scanner start/done + fail marks with mocked Supabase + stubbed `run_all_scanners`.
- Commit pattern: `test(slice-10): scan_item_inner characterization`

## Branch
`slice/10-scan-item-inner-characterization`

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md` (sandbox → Supabase writes)
- Build gates: `internal-docs/00_build/build-day-decisions.md`
- Audit: `docs/plan/coverage-audit.md`
- Code: `sandbox/scan_app.py`

## Spec (GWT / User Story)
**Given** mocked Supabase client and stubbed `run_all_scanners`
**When** `_scan_item_inner` runs success and scanner-failure paths
**Then** scanner row updates / fail marks match today’s contract (including PGRST204-safe update usage already implemented)

## Out of scope (already exists)
- Unit tests for `_safe_insert` / `_safe_update` / `_is_column_error` / `_to_runtime_error` in `test_scan_app.py`
- `_acquire_target` suite (`test_acquire_target.py`)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 7 available
- [ ] Confirmed `scan_item` / `_scan_item_inner` still have no direct tests

## TDD Execution
Characterization: lock current behaviour; do not “fix” product while greening.
VERIFY: `pytest sandbox/ -q --tb=short`

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage: start/done/fail paths for inner scan
- [ ] Gate evidence `slice-10.json` at PASS

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
