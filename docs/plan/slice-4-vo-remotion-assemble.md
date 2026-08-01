# Slice 4: VO + Remotion Assemble (GWT-3)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-4-vo-remotion-assemble
- Files: sibling Remotion project `claude-remotion-kickstart/public/projects/tripwire/` (+ VO assets); evidence note under `docs/plan/gate-evidence/slice-4.json`
- Exit criteria: Detection + Sandbox ~90s assembly exists; no Drift/Phase-5 claims; gate evidence links to rendered/output path.
- Commit pattern: `docs(slice-4): GWT-3 demo capture evidence` (tripwire repo) + commits in Remotion repo as needed

## Branch
`slice/4-vo-remotion-assemble`

## Spec (GWT / User Story)
**Given** GWT-1 and GWT-2 pass on a dress-rehearsal Live path
**When** VO + Remotion assembly run for Detection + Sandbox
**Then** video has no Drift/Phase-5 claims and both must-show beats are filmable from real UI

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Task file opened
- [ ] Prior session recovery checked (if resuming)
- [ ] Slices 2 and 3 ✅ (or explicit waiver logged in DECISIONS.md)

## TDD Execution
Spike-like verify/assemble: checklist against demo script; no production Tripwire code required unless capture reveals a bug (then file follow-up).
VERIFY: render or export path exists; script wording audit vs GWT-3.

## After-Checks [GATE]
- [ ] Evidence committed in tripwire `docs/plan/gate-evidence/slice-4.json`
- [ ] Remotion/VO artifacts updated in sibling repo
- [ ] Specification coverage: GWT-3 satisfied
- [ ] Acceptance criteria met
- [ ] Docs cross-links updated

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | link to demo if public |
| 13 | Related links cross-referenced | Remotion path + gate-evidence |
| 14 | No orphaned file references | — |
| Others | N/A | video outside product runtime |

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
| Next-session notes | May need extra pomo if VO record from scratch — split then |
