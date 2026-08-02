# Slice 14: Coverage Status + Docs Sync (Delta)

> Scenario: Brownfield | MoSCoW: Should

## Slice Workflow Bundle
- Slice name: slice-14-coverage-status-docs-sync
- Files: `docs/STATUS.md`, `docs/plan/PROGRESS.md`, `docs/plan/DECISIONS.md`, `CONTRIBUTING.md` (coverage floors), optional `internal-docs/00_build/build-day-decisions.md` (local)
- Exit criteria: STATUS VERIFIED cites new suites; coverage floors documented; no redo of slice-5 scope.
- Commit pattern: `docs(slice-14): sync status after coverage uplift`

## Branch
`slice/14-coverage-status-docs-sync`

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md`
- Build gates: `internal-docs/00_build/build-day-decisions.md`
- Adapter research sync if field names verified: `internal-docs/00_build/research/` ↔ `docs/research/adapters/`
- Evidence: `docs/STATUS.md`, `docs/plan/coverage-audit.md`

## Spec (GWT / User Story)
**Given** slices 11–13 PASSED with measured ≥95% ship-path gates
**When** docs are synced
**Then** STATUS evidence labels cite the new suites/commands; CONTRIBUTING/CI comments state floors; build-day boxes stay honest

## Out of scope (already exists)
- Slice 5 gate-evidence backfill for slices 1–6
- Unblocking Remotion/slice 4
- Overmind/Ossprey badge strip, Guard→Future in ARCHITECTURE, Nightly
  mutmut/Chalk non-gating one-liner — owned by **slice 7** Gate A (regression-
  check only here: grep still clean)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slices 11, 12, 13 ✅
- [ ] coverage-audit.md updated with final numbers

## TDD Execution
Docs-only.

## After-Checks [GATE]
- [ ] STATUS/PROGRESS/DECISIONS updated
- [ ] Regression: no Overmind/Ossprey public badges; Nightly non-gating still documented
- [ ] Acceptance criteria met
- [ ] Gate evidence `slice-14.json` at PASS

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
