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
- [ ] Branch created
- [ ] Task file opened
- [ ] Prior session recovery checked (if resuming)
- [ ] Slice 1 evidence or golden payload available

## TDD Execution
Outside-in acceptance/unit mapping tests → GREEN → refactor.  
VERIFY+COVERAGE: `cd prototypes/dc-dashboard && npm test`.

## After-Checks [GATE]
- [ ] Code committed with `test(slice-3): ...`
- [ ] Tests pass with coverage
- [ ] Specification coverage: GWT-2 clauses have ≥1 test
- [ ] Branch coverage target on touched modules
- [ ] Mutation testing if logic changed
- [ ] Acceptance criteria met
- [ ] Docs updated

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1–14 | See slice-2 pattern | N/A unless behaviour change |

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
