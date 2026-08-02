# Progress
> Last updated: 2026-08-02

## Execution order (open work)

| Order | # | Slice | MoSCoW | Status | Why here |
|------:|---|-------|--------|--------|----------|
| 1 | **17** | [user-guide-onboarding](slice-17-user-guide-onboarding.md) | Must | 📋 | **Next** — bootstrap before coverage |
| — | 7 | [coverage-audit-matrix](slice-7-coverage-audit-matrix.md) | Must | ✅ | Closed — Gate A+B on main (#26/#27) |
| 3 | 8 | [scanner-skill-parse-fixtures](slice-8-scanner-skill-parse-fixtures.md) | Must | 📋 | Coverage wave starts |
| 4 | 11 | [python-ship-path-coverage-95](slice-11-python-ship-path-coverage-95.md) | Must | 📋 | After 8 (+9/10 Should) |
| 5 | 12 | [cli-coverage-gate-95](slice-12-cli-coverage-gate-95.md) | Must | 📋 | Parallel-ok with 11/13 |
| 6 | 13 | [live-acl-coverage-gate-95](slice-13-live-acl-coverage-gate-95.md) | Must | 📋 | Parallel-ok with 11/12 |
| — | 9 → 10 → 14 → 15 | scanner/characterization/docs sync/claim audit | Should | 📋 | After or beside Must coverage |
| — | 4, 16 | Remotion / demo prose | Won't (A) | 📦 | Demo/hackathon over — reinstate if needed |

**Critical path:** `17 → 8 → 11 → 12 → 13` (slice 7 ✅)

## Quick Status
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](slice-1-walking-skeleton-live-path.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~50 min |
| 2 | [slice-2-gwt1-detection-acceptance](slice-2-gwt1-detection-acceptance.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~25 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](slice-3-gwt2-sandbox-evidence-acceptance.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 4 | [slice-4-vo-remotion-assemble](slice-4-vo-remotion-assemble.md) | Won't (A) | 📦 | 2026-08-02 | 2026-08-02 | ~25 min |
| 5 | [slice-5-gate-evidence-docs-sync](slice-5-gate-evidence-docs-sync.md) | Should | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 6 | [slice-6-orchestrator-characterization](slice-6-orchestrator-characterization.md) | Could | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 7 | [slice-7-coverage-audit-matrix](slice-7-coverage-audit-matrix.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| **17** | [slice-17-user-guide-onboarding](slice-17-user-guide-onboarding.md) | Must | 📋 | — | — | ~50 min |
| 8 | [slice-8-scanner-skill-parse-fixtures](slice-8-scanner-skill-parse-fixtures.md) | Must | 📋 | — | — | ~25 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](slice-9-scanner-snyk-tessl-parse-fixtures.md) | Should | 📋 | — | — | ~25 min |
| 10 | [slice-10-scan-item-inner-characterization](slice-10-scan-item-inner-characterization.md) | Should | 📋 | — | — | ~25 min |
| 11 | [slice-11-python-ship-path-coverage-95](slice-11-python-ship-path-coverage-95.md) | Must | 📋 | — | — | ~50 min |
| 12 | [slice-12-cli-coverage-gate-95](slice-12-cli-coverage-gate-95.md) | Must | 📋 | — | — | ~25 min |
| 13 | [slice-13-live-acl-coverage-gate-95](slice-13-live-acl-coverage-gate-95.md) | Must | 📋 | — | — | ~25 min |
| 14 | [slice-14-coverage-status-docs-sync](slice-14-coverage-status-docs-sync.md) | Should | 📋 | — | — | ~25 min |
| 15 | [slice-15-horizon-a-claim-audit](slice-15-horizon-a-claim-audit.md) | Should | 📋 | — | — | ~25 min |
| 16 | [slice-16-docs-claim-remediations](slice-16-docs-claim-remediations.md) | Won't (A) | 📦 | — | 2026-08-02 | ~25 min |

**Status Legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 DEFERRED`

**Gate close:** ✅ only per [GATE_CONTRACT.md](GATE_CONTRACT.md) — all After-Checks + evidence `PASS` + review + trackers. `🔀` = checks green on branch, not yet ✅.

## Blockers
| Slice | Blocker | Status |
|-------|---------|--------|
| — | (none open) | — |
| 4 (historical) | Remotion sibling + VO assets missing | 📦 closed with demo/hackathon deferral — reinstate slice 4 if film day returns |

## Forward Roadmap
- **Must critical path:** **17** → 8 → 11 → 12 → 13 (7 ✅)
- **Should:** 9 → 10 → 14 → 15 (prefer 15 after 17 so claim audit sees onboarding docs)
- **Deferred / Won't (A):** 4 (VO/Remotion), 16 (demo/film-day prose) — reinstate only if a new demo need arises
- Next execute: **17** (user-guide Phase 1) → **8** → coverage floors **11–13**
- Slice 17 = RPF-style prereqs/env procurement; Phase 2 guides = later slice (18+)
- Gate close: [GATE_CONTRACT.md](GATE_CONTRACT.md)
- After Must coverage wave: ask 1+C vs continue Should claim audit (15) if not done
- Won't for A: Drift, Phase 4/5, redesign, blast-radius, instruction→install→scan; Live E2E CI Must; support.js 95%; demo video / hackathon film day

## Interrupt Recovery
1. Read **Execution order** — next open Must
2. Open **TRAIL.md** + **[GATE_CONTRACT.md](GATE_CONTRACT.md)**
3. Open current slice file from table
4. Resume from the **first unchecked** Before-Check or After-Check (do not skip)
5. Before ✅: confirm Closing rule in GATE_CONTRACT (all checks / waivers, evidence PASS, review, merge)
6. Then: status ✅, completed date, advance Execution order; never ✅ from 🔀 without merge

## Skill Execution Log
| Date | Branch | Skill | Slice | Outcome | Notes |
|------|--------|-------|-------|---------|-------|
| 2026-08-01 | slice/1-walking-skeleton-live-path | nw-execute (adapted) | 1 | ✅ PASSED (PR #14) | Live scan + boolean probe; gate-evidence written |
| 2026-08-01 | slice/2-gwt1-detection-acceptance | slice-workflow | 2 | ✅ PASSED (PR #15) | GWT-1 acceptance test |
| 2026-08-02 | slice/3-gwt2-sandbox-evidence-acceptance | slice-workflow | 3 | ✅ PASSED (PR #16) | GWT-2 sandbox evidence acceptance |
| 2026-08-02 | slice/4-vo-remotion-assemble | slice-workflow | 4 | 🔴 BLOCKED (PR #17) | Remotion sibling + VO assets missing |
| 2026-08-02 | main / plan | plan iteration | 4, 16 | 📦 DEFERRED | Demo/hackathon over; reinstate if needed |
| 2026-08-02 | slice/6-orchestrator-characterization | slice-workflow | 6 | ✅ PASSED (PR #18) | skip/force spawn characterization |
| 2026-08-02 | slice/5-gate-evidence-docs-sync | slice-workflow | 5 | ✅ PASSED (PR #19) | build-day 3-lite sync; slice 4 waived |
| 2026-08-02 | plan/coverage-slices-7-14 | enhanced-flow-planner Add | 7–14 | 📋 stubs written | ship-path ~95%; delta-only; internal-docs context pack |
| 2026-08-02 | slice/7-coverage-audit-matrix | slice-workflow | 7 | 🔀 Gate A+B | trust strip + coverage-audit.md; stubs 15–16 added; PR #26 |
| 2026-08-02 | main | GATE_CONTRACT + sync-docs | 7 | ✅ PASSED | After-Checks on main; PRs #26/#27; evidence PASS |
| 2026-08-02 | slice/7-coverage-audit-matrix | enhanced-flow-planner Add | 15–16 | 📋 stubs written | claim audit + docs remediations |
| 2026-08-02 | main / plan | docs onboarding plan | 17 | 📋 stub + priority | Critical path 7→17→8→11–13 |
| 2026-08-02 | main / plan | GATE_CONTRACT | all | 📋 policy | Hard close rule + strengthened After-Checks 8–15/17 |
