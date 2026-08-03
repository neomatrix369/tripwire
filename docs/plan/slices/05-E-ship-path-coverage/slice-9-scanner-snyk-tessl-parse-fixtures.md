# Slice 9: Snyk / Tessl Parse Fixtures (Delta)

> Scenario: Brownfield | MoSCoW: Should

## Slice Workflow Bundle
- Slice name: slice-9-scanner-snyk-tessl-parse-fixtures
- Files: `sandbox/scanners.py`, `sandbox/tests/test_*.py`, fixture JSON
- Exit criteria: Real `run_snyk` / `run_tessl` / `_collapse_severity` / `_tessl_quality_score` / `_snyk_cmd` paths via stubbed subprocess; characterization-safe.
- Commit pattern: `test(slice-9): snyk tessl parse fixtures`

## Branch
`slice/9-scanner-snyk-tessl-parse-fixtures`

## Context references (mandatory)
- Product SoT: private references
- Adapter research: private references
- Public mirror: `docs/research/adapters/scanner-output-adapters.md`
- Audit: `docs/plan/coverage-audit.md`
- Code: `sandbox/scanners.py`

## Spec (GWT / User Story)
**Given** recorded Snyk and Tessl outputs (and edge/malformed cases)
**When** adapters run with subprocess stubbed
**Then** status rows, scores, and severity collapse match current behaviour; research mismatches logged

## Out of scope (already exists)
- Status tests that **patch** `run_snyk` / `run_tessl` for `run_all_scanners` overall_status
- Live Snyk/Tessl CLI or Modal

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slice 7 available
- [ ] Adapter research opened
- [ ] Confirmed Snyk/Tessl bodies still uncovered

## TDD Execution
Fixture-driven characterization → GREEN → refactor.
VERIFY: `pytest sandbox/tests/ -q --tb=short`

## After-Checks [GATE]
- [ ] `pytest sandbox/tests/ -q --tb=short` exit 0
- [ ] Fixture tests cover Snyk parse, Tessl parse, and at least one collapse/edge case (paths in evidence)
- [ ] Coverage on touched Snyk/Tessl parse paths: baseline → after % in `gate-evidence/slice-9.json`
- [ ] `docs/plan/gate-evidence/slice-9.json` has `"verdict": "PASS"` + `commands[]`
- [ ] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
