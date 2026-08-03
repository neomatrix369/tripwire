# Slice 3: GWT-2 Sandbox Evidence Acceptance Test

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-3-gwt2-sandbox-evidence-acceptance
- Files: `prototypes/dc-dashboard/test/`, `tripwire-live.js` (mapping only if bug found)
- Exit criteria: Automated test encodes GWT-2; Live-mapped item includes usable sandbox identity + evidence fields.
- Commit pattern: `test(slice-3): GWT-2 sandbox evidence acceptance`

## Branch
`slice/3-gwt2-sandbox-evidence-acceptance`

## Spec (GWT / User Story)
**Given** a completed sandbox scan payload for the MCP must-show item
**When** Live loader maps the latest `scan_run` into the UI item
**Then** sandbox evidence fields (id / timing / policy or egress phase as exposed today) are present and suitable for on-camera Sandbox beat — not empty when Live data is complete

## Before-Checks [GATE]
- [x] Branch created (`slice/3-gwt2-sandbox-evidence-acceptance`)
- [x] Task file opened
- [x] Prior session recovery checked — slice 1 ✅ (#14), slice 2 ✅ (#15)
- [x] Slice 1 evidence available (`docs/plan/gate-evidence/slice-1.json`)

## TDD Execution
Outside-in acceptance/unit mapping tests → GREEN → refactor.
VERIFY+COVERAGE: `cd prototypes/dc-dashboard && npm test`.

## After-Checks [GATE]
- [x] Code committed with `test(slice-03): ...`
- [x] Tests pass — 38 pass / 1 skip
- [x] Specification coverage: GWT-2 clauses have ≥1 test
- [x] Branch coverage target on touched modules — N/A test-only
- [x] Mutation testing N/A — characterization/acceptance mapping only
- [x] Acceptance criteria met
- [x] Docs updated — gate-evidence/slice-3.json

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1–14 | See slice-2 pattern | N/A unless behaviour change |

## Gate Status
✅ PASSED — PR #16 merged

## What Changed
| File | Type | Reason |
|------|------|--------|
| prototypes/dc-dashboard/test/tripwire-live.test.js | test | GWT-2 must-show MCP sandbox acceptance |
| docs/plan/gate-evidence/slice-3.json | evidence | slice 3 gate |
| docs/plan/TRAIL.md / PROGRESS.md | plan | slice 2 ✅ · slice 3 🔀 |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | ~5 min |
| Blockers encountered | — |
| Next-session notes | `/merge-pr-to-main` after approval; then slice 4 |
