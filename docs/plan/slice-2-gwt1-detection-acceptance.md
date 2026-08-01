# Slice 2: GWT-1 Detection Acceptance Test

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-2-gwt1-detection-acceptance
- Files: `prototypes/dc-dashboard/test/` and/or `slow-tests/` (E2E), fixture paths under `fixtures/`
- Exit criteria: Automated test encodes GWT-1; fails if heatmap/drill/tool-name mapping regresses for must-show shapes.
- Commit pattern: `test(slice-2): GWT-1 detection acceptance`

## Branch
`slice/2-gwt1-detection-acceptance`

## Spec (GWT / User Story)
**Given** shortlist skill and MCP finding payloads shaped like Live scan results for #1+#2
**When** dashboard Live mapping / drill-down helpers process those payloads
**Then** heatmap status is non-grey for both; skill exposes file/line finding; MCP exposes affected tool name(s) (`entity_name` / `related_tool_names`)

## Before-Checks [GATE]
- [x] Branch created (`slice/2-gwt1-detection-acceptance`)
- [x] Task file opened
- [x] Prior session recovery checked (if resuming) — slice 1 ✅ via PR #14
- [x] Slice 1 evidence available (`docs/plan/gate-evidence/slice-1.json`)

## TDD Execution
UI/Feature outside-in: write failing acceptance/unit mapping tests first → GREEN → refactor.
Prefer fast unit tests against `tripwire-live.js` / status helpers with recorded shapes; full Modal E2E stays in slow path if needed.

VERIFY+COVERAGE: `cd prototypes/dc-dashboard && npm test` (and slow suite if added).

## After-Checks [GATE]
- [x] Code committed with `test(slice-02): ...`
- [x] Tests pass — 37 pass / 1 skip
- [x] Specification coverage: GWT-1 clauses have ≥1 test
- [x] Branch coverage target on touched modules — N/A test-only
- [x] Mutation testing N/A — characterization/acceptance mapping only
- [x] Acceptance criteria met
- [x] Docs updated — gate-evidence/slice-2.json

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | N/A |
| 2 | Inline comments added where non-obvious | — |
| 3 | Function signatures documented | N/A |
| 4 | Error paths documented | N/A |
| 5 | CHANGELOG entry written | N/A for test-only |
| 6–14 | Remainder | N/A unless public API changes |

## Gate Status
🔀 ON BRANCH — VERIFIED; awaiting PR merge

## What Changed
| File | Type | Reason |
|------|------|--------|
| prototypes/dc-dashboard/test/tripwire-live.test.js | test | GWT-1 must-show acceptance |
| docs/plan/gate-evidence/slice-2.json | evidence | slice 2 gate |
| docs/plan/TRAIL.md / PROGRESS.md | plan | slice 1 ✅ · slice 2 🔨 |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | ~5 min |
| Blockers encountered | — |
| Next-session notes | `/clean-commit` then slice 3 |
