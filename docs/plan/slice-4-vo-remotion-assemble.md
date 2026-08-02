# Slice 4: VO + Remotion Assemble (GWT-3)

> Scenario: Brownfield | MoSCoW: Could (demo/hackathon — demoted 2026-08-02)

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
- [x] Branch created (`slice/4-vo-remotion-assemble`)
- [x] Task file opened
- [x] Prior session recovery checked — slices 1–3 ✅ (PRs #14–#16)
- [x] Slices 2 and 3 ✅
- [ ] Remotion sibling repo available at known path
- [ ] VO audio + Whisper transcript available

## TDD Execution
Spike-like verify/assemble: checklist against demo script; no production Tripwire code required unless capture reveals a bug (then file follow-up).
VERIFY: render or export path exists; script wording audit vs GWT-3.

### In-repo wording audit (2026-08-02) — PASS
Authority: `internal-docs/01_demo_video/00-tripwire-demo-script.md` + `prompt-2-remotion-video-assembly.md`

| Check | Result |
|-------|--------|
| Locked beats = Cold open → Detection → Sandbox → Close (~90s) | ✅ |
| Must-show Detection (#1 skill + #2 MCP) + Sandbox (#2) | ✅ |
| No Drift / posture segment in Remotion critical path | ✅ script forbids |
| No Phase 5 / reconciler claims as shipped | ✅ optional disagreement VO only |
| GWT-1/2 Live path already verified (slices 1–3) | ✅ |

### Blocker — Remotion / VO workspace missing
Searched common sibling paths under `ai-ml-dl-stuff/` and `gh` repos for `neomatrix369` matching remotion/kickstart — **not found**.
`internal-docs/01_demo_video/` has prompts + demo script only (no `.mp3`/`.wav`/`.mp4`/transcript JSON).

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
🔴 BLOCKED — Remotion sibling + VO assets not located

## What Changed
| File | Type | Reason |
|------|------|--------|
| docs/plan/PROGRESS.md / TRAIL.md | plan | slice 3 ✅ · slice 4 🔴 |
| docs/plan/gate-evidence/slice-4.json | evidence | blocked + wording audit |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | ~10 min (audit + blocker) |
| Blockers encountered | Remotion path / VO assets |
| Next-session notes | Unblock with clone path or URL; then Prompt 1 → Prompt 2 assemble |
