# Slice 11: Python Ship-Path Coverage ≥95%

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-11-python-ship-path-coverage-95
- Files: `pyproject.toml`, `.github/workflows/ci.yml`, `sandbox/` (tests only if residual holes), omit `guard` from ship-path coverage source
- Exit criteria: Ship-path sandbox measured ≥95% (branch where configured); CI `fail_under=95`; `guard/` excluded from denominator; residual &lt;5% only via justified reviewed excludes.
- Commit pattern: `ci(slice-11): python ship-path coverage 95`

## Branch
`slice/11-python-ship-path-coverage-95`

## Context references (mandatory)
- Audit: `docs/plan/coverage-audit.md`
- Spec / build-day: `internal-docs/00_build/` (Phase 4 Guard = out of bar)
- Config: `pyproject.toml`, `.github/workflows/ci.yml`

## Spec (GWT / User Story)
**Given** slice 8 and slices 9/10 subsumed into this slice (DECISIONS)
**When** coverage is measured on ship-path sandbox only
**Then** ≥95% and CI enforces it; guard is not in the fail_under denominator

## Out of scope
- Guard Phase 4 tests
- Node/CLI/dashboard coverage (slices 12–13)
- Bulk `pragma: no cover` on scanners

## Before-Checks [GATE]
- [x] Branch created
- [x] Slice 8 complete (coverage fixtures + parse coverage baseline)
- [ ] Slices 9, 10 completed inside this slice (waived: DECISIONS 2026-08-03, now treated as 9/10 SUBSUMED by 11)
- [x] Baseline coverage re-measured after 8–10

## TDD Execution
[Walking Skeleton — 2 Pomos] Measure → fill residual holes with high-level tests → raise floor stepwise if needed (70→90→95) in this slice’s commits → final fail_under=95.

VERIFY: `pytest sandbox/ --cov=sandbox --cov-fail-under=95` (guard omitted from source)

## After-Checks [GATE]
- [x] `pytest sandbox/ --cov=sandbox --cov-fail-under=95` exit 0 (exact % in evidence)
- [x] `fail_under = 95` (or equivalent) in `pyproject.toml` and CI workflow for ship-path job
- [x] `guard/` omitted from ship-path coverage source / denominator (grep or config snippet in evidence)
- [x] Residual excludes &lt;5% only if listed + justified in evidence or DECISIONS
- [x] `docs/plan/gate-evidence/slice-11.json` has `"verdict": "PASS"` + `commands[]`
- [x] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
✅ PASSED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 2 (~50 min) [Walking Skeleton] |
