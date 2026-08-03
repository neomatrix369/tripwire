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
- [x] Branch created (`slice/6-orchestrator-characterization`)
- [x] Task file opened
- [x] Prior session recovery checked — slice 4 🔴 Remotion blocked; PR #17 merged; continuing Could slice

## TDD Execution
Backend inside-out characterization: assert current behaviour; do not “fix” product while greening.
VERIFY+COVERAGE: `cd cli && npm test`.

Injectable seams (defaults preserve production):
- `runScan({ ensureSchemaFn, getSupabaseFn, spawnFn })`
- `spawnScanSandbox({ spawnImpl })`

## After-Checks [GATE]
- [x] Tests committed with `test(slice-06): ...`
- [x] Coverage on touched modules — cli suite 22/22
- [x] Acceptance criteria met
- [x] Docs — gate-evidence/slice-6.json

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1–14 | N/A for Could characterization unless API docs change | — |

## Gate Status
✅ PASSED — PR #18 merged

## What Changed
| File | Type | Reason |
|------|------|--------|
| cli/src/orchestrator.js | seam | optional DI for characterization |
| cli/src/modalClient.js | seam | optional spawnImpl |
| cli/test/orchestrator-characterization.test.js | test | skip/force/spawn argv locks |
| docs/plan/gate-evidence/slice-6.json | evidence | slice 6 gate |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | ~15 min |
| Blockers encountered | — |
| Next-session notes | `/create-pr` then `/merge-pr-to-main`; slice 4 still 🔴 |
