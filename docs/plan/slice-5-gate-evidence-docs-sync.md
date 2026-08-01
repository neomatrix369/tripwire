# Slice 5: Gate Evidence + Docs Sync

> Scenario: Brownfield | MoSCoW: Should

## Slice Workflow Bundle
- Slice name: slice-5-gate-evidence-docs-sync
- Files: `docs/plan/gate-evidence/`, `docs/plan/PROGRESS.md`, `internal-docs/00_build/build-day-decisions.md` (gitignored local), public notes if any
- Exit criteria: slice-1..4 gate-evidence JSON present; build-day Phase/3-lite boxes match verified reality; PROGRESS/TRAIL statuses updated.
- Commit pattern: `docs(slice-5): sync gate evidence and build-day checkboxes`

## Branch
`slice/5-gate-evidence-docs-sync`

## Spec (GWT / User Story)
**Given** slices 1–4 have passed with evidence
**When** operator syncs planning + build-day checklists
**Then** `docs/plan/gate-evidence/slice-N.json` exist for Must slices and build-day 3-lite Done reflects verified state (no stale ☐ contradicting ship evidence)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Task file opened
- [ ] Slices 1–4 complete or deferred with reason

## TDD Execution
Docs-only; verify links resolve; no production TDD.

## After-Checks [GATE]
- [ ] Docs committed
- [ ] TRAIL/PROGRESS statuses accurate
- [ ] Acceptance criteria met
- [ ] Doc audit complete

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | if ship claims change |
| 13 | Related links cross-referenced | — |
| 14 | No orphaned file references | — |
| Others | as applicable | — |

## Gate Status
📋 PLANNED

## What Changed
| File | Type | Reason |
|------|------|--------|
| — | — | — |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | — |
| Blockers encountered | — |
| Next-session notes | — |
