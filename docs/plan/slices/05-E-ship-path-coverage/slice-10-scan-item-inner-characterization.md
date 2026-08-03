# Slice 10: scan_item_inner Characterization (Delta)

> Scenario: Brownfield | MoSCoW: Should

## Slice Workflow Bundle
- Slice name: slice-10-scan-item-inner-characterization
- Files: `sandbox/scan_app.py`, `sandbox/tests/test_scan_app.py` (extend) or new `test_scan_item_inner.py`
- Exit criteria: Characterization locks `_scan_item_inner` scanner start/done + fail marks with mocked Supabase + stubbed `run_all_scanners`.
- Commit pattern: `test(slice-10): scan_item_inner characterization`

## Branch
`slice/10-scan-item-inner-characterization`

## Context references (mandatory)
- Product SoT: private references (sandbox → Supabase writes)
- Build gates: private references
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
VERIFY: `pytest sandbox/tests/ -q --tb=short`

## After-Checks [GATE]
- [ ] Complexity evidence: policy is `reporting`; repository-native tool and source scope are named; local report and reviewer-summary locations are recorded; any CI PR update replaces a stable marker idempotently. Tool, threshold, and CI integration: TBD — verify from existing quality tooling.
- [ ] Specification coverage: every GWT clause has ≥1 test (BDD/GWT-first, §2); essential error paths covered (90–100% of clauses)
- [ ] Branch coverage: 100% target; tool configured with fail_under=100; exclusions documented (§12 — test-writing-craft-quality.mdc)
- [ ] Mutation testing run if slice is feature-complete: survival budget met (§23)
- [ ] `pytest sandbox/tests/ -q --tb=short` exit 0
- [ ] Direct tests exercise `_scan_item_inner` (or sealed equivalent) start, done, and fail paths (names in evidence)
- [ ] Characterization locks current behaviour — no silent product “fixes” without DECISIONS row
- [ ] `docs/plan/gate-evidence/slice-10.json` has `"verdict": "PASS"` + `commands[]`
- [ ] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
