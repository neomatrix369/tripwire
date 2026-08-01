# Slice 6: Orchestrator / Modal Characterization Tests

> Scenario: Brownfield | MoSCoW: Could

## Slice Workflow Bundle
- Slice name: slice-6-orchestrator-characterization
- Files: `cli/src/orchestrator.js`, `cli/src/modalClient.js`, `cli/test/`
- Exit criteria: Characterization tests lock current spawn/idempotency behaviour for known inputs without requiring live Modal in unit path (mock child_process / stubs).
- Commit pattern: `test(slice-6): orchestrator modal characterization`

## Branch
`slice/6-orchestrator-characterization`

## Spec (GWT / User Story)
**Given** a discovered target and mocked Supabase + spawn  
**When** `runScan` runs with and without `--force` against unchanged content hash  
**Then** unchanged content skips spawn when not forced; forced path invokes sandbox spawn with expected args shape

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Task file opened
- [ ] Prior session recovery checked (if resuming)

## TDD Execution
Backend inside-out characterization: assert current behaviour; do not “fix” product while greening.  
VERIFY+COVERAGE: `cd cli && npm test`.

## After-Checks [GATE]
- [ ] Tests committed
- [ ] Coverage on touched modules
- [ ] Acceptance criteria met
- [ ] Docs N/A

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1–14 | N/A for Could characterization unless API docs change | — |

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
