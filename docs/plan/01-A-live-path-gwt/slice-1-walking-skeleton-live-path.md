# Slice 1: Walking Skeleton — Live Demo Path

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-1-walking-skeleton-live-path
- Files: `cli/`, `sandbox/`, `fixtures/skills/vuln-prompt-injection-notes`, `fixtures/mcp/vuln-command-injection-server`, `prototypes/dc-dashboard/`, `docs/plan/gate-evidence/`
- Exit criteria: Operator can scan must-show #1+#2 and see non-mock Live Detection + Sandbox evidence on camera-ready UI; evidence JSON written.
- Commit pattern: `feat(slice-1): walking skeleton live demo path evidence`

## Branch
`slice/1-walking-skeleton-live-path`

## Spec (GWT / User Story)
**Given** Supabase + Modal credentials are configured and must-show fixtures exist on disk
**When** operator runs `tripwire scan` on `vuln-prompt-injection-notes` and `vuln-command-injection-server`, then opens Live dashboard
**Then** both items show non-grey heatmap status, skill has file/line drill-down, MCP lists affected tool name(s), sandbox evidence panel is populated from Live (not Mock-only)

## Design Context
| Field | Value |
|---|---|
| Component library | Existing Data Commons HTML (`Tripwire.dc.html`) — no redesign |
| Design system | none — ship as-is |
| Palette | Existing heatmap red/amber/green/grey/error |
| Typography | Existing dashboard fonts |
| Accessibility target | unset for A (camera-ready) |
| Responsive strategy | desktop-first (demo capture) |
| Colour mode | existing dashboard |
| Visual hierarchy driver | data-visualisation |
| Aesthetic register | research-dashboard / utility |
| Style reference | none — freeze UI |

## Before-Checks [GATE]
- [x] Branch created (`slice/1-walking-skeleton-live-path`)
- [x] Task file opened
- [x] Prior session recovery checked (if resuming) — N/A fresh

## TDD Execution
Outside-in: capture/verify acceptance evidence first; add automated tests in slices 2–3.
VERIFY+COVERAGE: run existing `cli` + `sandbox` + `prototypes/dc-dashboard` unit suites; write `docs/plan/gate-evidence/slice-1.json` with dated command outputs / screenshots paths.

On PASS: `gate_cache_write "fast" "$(git rev-parse HEAD)"` when applicable.

## After-Checks [GATE]
- [x] Code committed with docs(slice-01) evidence commit
- [x] Tests pass with coverage — cli 18 pass; dashboard 36 pass / 1 skip; sandbox 64 pass
- [x] Specification coverage confirmed for this GWT — Live probe pass_gwt1/pass_gwt2 true
- [x] Branch coverage target per project defaults where code changed — N/A no prod code change
- [x] Mutation testing N/A if no production code change
- [x] Acceptance criteria met (data-plane VERIFIED; UI camera confirm deferred to slice 4)
- [x] Docs updated — `docs/plan/gate-evidence/slice-1.json`

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | N/A — no setup change |
| 2 | Inline comments added where non-obvious | N/A — no code |
| 3 | Function signatures documented | N/A |
| 4 | Error paths documented | N/A — clean scan |
| 5 | CHANGELOG entry written | N/A — evidence-only |
| 6 | Architecture doc updated | N/A |
| 7 | API doc updated | N/A |
| 8 | Config/env vars documented | N/A |
| 9 | Examples added or updated | scan cmds in gate-evidence |
| 10 | Deprecated features marked | N/A |
| 11 | Migration guide written | N/A |
| 12 | Troubleshooting section added | N/A |
| 13 | Related links cross-referenced | gate-evidence ↔ TRAIL |
| 14 | No orphaned file references | OK |

## Gate Status
✅ PASSED — merged via PR #14

## What Changed
| File | Type | Reason |
|------|------|--------|
| docs/plan/gate-evidence/slice-1.json | evidence | Walking skeleton Live probe |
| docs/plan/* | plan | status updates |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 2 (~50 min) [Walking Skeleton] |
| Execution time | ~scan 131s + probe |
| Blockers encountered | Auto-review blocked verbose Supabase dump; used boolean probe |
| Next-session notes | Commit evidence; then slices 2–3; confirm Live UI on camera in slice 4 |
