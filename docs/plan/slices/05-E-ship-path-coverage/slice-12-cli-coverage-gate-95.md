# Slice 12: CLI Coverage Gate ≥95% (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-12-cli-coverage-gate-95
- Files: `cli/package.json`, `cli/test/*`, `.github/workflows/ci.yml` (cli-tests job)
- Exit criteria: Coverage tool (e.g. `c8`) on `cli/src/**`; CI gate ≥95%; tests added only for uncovered ship paths.
- Commit pattern: `ci(slice-12): cli coverage gate 95`

## Branch
`slice/12-cli-coverage-gate-95`

## Context references (mandatory)
- Audit: `docs/plan/coverage-audit.md`
- Spec Done-when Phase 1 CLI: `private source`
- Existing tests: `cli/test/*` (incl. slice 6 characterization)

## Spec (GWT / User Story)
**Given** existing CLI unit/characterization suite and no coverage gate
**When** coverage is instrumented on `cli/src`
**Then** CI fails below 95%; any holes filled with high-level tests first

## Out of scope (already exists)
- Replacing discovery/hash/ensureSchema/orchestrator characterization suites
- Live Modal integration tests as CI Must

## Before-Checks [GATE]
- [x] Branch created
- [x] Slice 6 ✅ (characterization seams available)
- [x] Confirm no c8/nyc gate in cli package.json

## TDD Execution
Add instrumentation → measure → fill uncovered modules → gate 80 then 95 (or direct 95 if already close).
VERIFY: `cd cli && npm test` (with coverage script)

## After-Checks [GATE]
- [x] `cd cli && npm test` (coverage script) exit 0; measured ≥95% on `cli/src` recorded in evidence
- [x] CI `cli-tests` job fails below 95% (workflow snippet or job name in evidence)
- [x] No new holes closed only with `/* c8 ignore */` without DECISIONS justification
- [x] `docs/plan/gate-evidence/slice-12.json` has `"verdict": "PASS"` + `commands[]`
- [x] PROGRESS/TRAIL updated; ✅ only after merge

## Gate Status
✅ PASSED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
