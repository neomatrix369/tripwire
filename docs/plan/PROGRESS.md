# Progress
> Last updated: 2026-08-03

## Slice groups (execution sequence)

| Wave | Folder | Group | Slices | Outcome |
|-----:|--------|-------|--------|---------|
| 1 | [`01-A-…`](01-A-live-path-gwt/) | **A — Live path + GWT** | 1 → 2 → 3 · 4 | ✅ · 4 📦 |
| 2 | [`02-B-…`](02-B-characterization-evidence/) | **B — Characterization + evidence sync** | 6 → 5 | ✅ |
| 3 | [`03-C-…`](03-C-trust-coverage-audit/) | **C — Trust + coverage audit** | 7 | ✅ |
| 4 | [`04-D-…`](04-D-operator-onboarding/) | **D — Operator onboarding** | **17** | ✅ |
| 5 | [`05-E-…`](05-E-ship-path-coverage/) | **E — Ship-path coverage** | 8 → 11 → 12 → 13 ✅ → 14 (**9+10 SUBSUMED INTO 11**) | ✅ Musts · close-path |
| 6 | [`06-F-…`](06-F-claim-audit/) | **F — Claim audit** | 15 (after 14) · 16 | 📋 · 16 📦 |

**Open critical path:** 14 must pass first, then 15

## Execution order (open work)

| Order | Wave | # | Slice | MoSCoW | Status |
|------:|-----:|---|-------|--------|--------|
| — | E | 14 | coverage sync | Must | 📋 |
| — | F | 15 | claim audit (16 📦) | Must | 📋 |

## Quick Status (by group)

### A — Live path + GWT
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](01-A-live-path-gwt/slice-1-walking-skeleton-live-path.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~50 min |
| 2 | [slice-2-gwt1-detection-acceptance](01-A-live-path-gwt/slice-2-gwt1-detection-acceptance.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~25 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](01-A-live-path-gwt/slice-3-gwt2-sandbox-evidence-acceptance.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 4 | [slice-4-vo-remotion-assemble](01-A-live-path-gwt/slice-4-vo-remotion-assemble.md) | Won't (A) | 📦 | 2026-08-02 | 2026-08-02 | ~25 min |

### B — Characterization + evidence sync
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 6 | [slice-6-orchestrator-characterization](02-B-characterization-evidence/slice-6-orchestrator-characterization.md) | Could | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 5 | [slice-5-gate-evidence-docs-sync](02-B-characterization-evidence/slice-5-gate-evidence-docs-sync.md) | Should | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |

### C — Trust + coverage audit
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 7 | [slice-7-coverage-audit-matrix](03-C-trust-coverage-audit/slice-7-coverage-audit-matrix.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |

### D — Operator onboarding
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| **17** | [slice-17-user-guide-onboarding](04-D-operator-onboarding/slice-17-user-guide-onboarding.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~50 min |

### E — Ship-path coverage
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 8 | [slice-8-scanner-skill-parse-fixtures](05-E-ship-path-coverage/slice-8-scanner-skill-parse-fixtures.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](05-E-ship-path-coverage/slice-9-scanner-snyk-tessl-parse-fixtures.md) | Should | 📦 | 2026-08-02 | — | ~25 min |
| 10 | [slice-10-scan-item-inner-characterization](05-E-ship-path-coverage/slice-10-scan-item-inner-characterization.md) | Should | 📦 | 2026-08-02 | — | ~25 min |
| 11 | [slice-11-python-ship-path-coverage-95](05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~50 min |
| 12 | [slice-12-cli-coverage-gate-95](05-E-ship-path-coverage/slice-12-cli-coverage-gate-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 13 | [slice-13-live-acl-coverage-gate-95](05-E-ship-path-coverage/slice-13-live-acl-coverage-gate-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 14 | [slice-14-coverage-status-docs-sync](05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md) | Must | 📋 | — | — | ~25 min |

### F — Claim audit
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 15 | [slice-15-horizon-a-claim-audit](06-F-claim-audit/slice-15-horizon-a-claim-audit.md) | Must | 📋 (dependency:14) | — | — | ~25 min |
| 16 | [slice-16-docs-claim-remediations](06-F-claim-audit/slice-16-docs-claim-remediations.md) | Won't (A) | 📦 | — | 2026-08-02 | ~25 min |

**Status Legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 DEFERRED`

**Gate close:** ✅ only per [GATE_CONTRACT.md](GATE_CONTRACT.md) — all After-Checks + evidence `PASS` + review + trackers. `🔀` = checks green on branch, not yet ✅.

## Blockers
| Slice | Blocker | Status |
|-------|---------|--------|
| — | (none open) | — |
| 4 (historical) | Remotion sibling + VO assets missing | 📦 closed with demo/hackathon deferral — reinstate slice 4 if film day returns |

## Forward Roadmap
- Waves **A–D** done. Next: **E** Musts 8 → 11–13 → 14 then **F (15)**
- E Must 14 follows the close-path after 13 (with 9+10 SUBSUMED into 11)
- Claim-audit slice 15 is blocked until slice 14 is passed (coverage sync + final matrix)
- Dependency: close-path `slice-14 -> slice-15` (slice 15 depends on slice 14)
- **Deferred / Won't (A):** 4 (in A), 16 (in F) — reinstate only if a new demo need arises
- Slice 17 ✅ = RPF-style prereqs/env procurement; Phase 2 guides = later slice (18+)
- Gate close: [GATE_CONTRACT.md](GATE_CONTRACT.md)
- After E Musts: ask 1+C vs continue F claim audit
- Won't for A: Drift, Phase 4/5, redesign, blast-radius, instruction→install→scan; Live E2E CI Must; support.js 95%; demo video / hackathon film day

## Interrupt Recovery
1. Read **Slice groups** — find first open wave, then **Execution order**
2. Open **TRAIL.md** + **[GATE_CONTRACT.md](GATE_CONTRACT.md)**
3. Open current slice file from that group
4. Resume from the **first unchecked** Before-Check or After-Check (do not skip)
5. Before ✅: confirm Closing rule in GATE_CONTRACT (all checks / waivers, evidence PASS, review, merge)
6. Then: status ✅, completed date, advance Execution order; never ✅ from 🔀 without merge

## Skill Execution Log
| Date | Branch | Skill | Slice | Outcome | Notes |
|------|--------|-------|-------|---------|-------|
| 2026-08-01 | slice/1-walking-skeleton-live-path | nw-execute (adapted) | 1 | ✅ PASSED (PR #14) | Wave A — Live scan + boolean probe |
| 2026-08-01 | slice/2-gwt1-detection-acceptance | slice-workflow | 2 | ✅ PASSED (PR #15) | Wave A — GWT-1 |
| 2026-08-02 | slice/3-gwt2-sandbox-evidence-acceptance | slice-workflow | 3 | ✅ PASSED (PR #16) | Wave A — GWT-2 |
| 2026-08-02 | slice/4-vo-remotion-assemble | slice-workflow | 4 | 🔴→📦 | Wave A — Remotion blocked; later deferred |
| 2026-08-02 | slice/6-orchestrator-characterization | slice-workflow | 6 | ✅ PASSED (PR #18) | Wave B — before slice 5 |
| 2026-08-02 | slice/5-gate-evidence-docs-sync | slice-workflow | 5 | ✅ PASSED (PR #19) | Wave B — slice 4 waived |
| 2026-08-02 | plan/coverage-slices-7-14 | enhanced-flow-planner Add | 7–14 | 📋 stubs | Wave C/E planned |
| 2026-08-02 | slice/7-coverage-audit-matrix | slice-workflow | 7 | ✅ PASSED (#26/#27) | Wave C — trust strip + audit |
| 2026-08-02 | main / plan | enhanced-flow-planner Add | 15–16 | 📋/📦 | Wave F; 16 deferred with demo close |
| 2026-08-02 | main / plan | docs onboarding | 17 | 📋 | Wave D — next Must |
| 2026-08-02 | slice/17-user-guide-onboarding | slice-workflow | 17 | ✅ PASSED | Wave D — user-guide Phase 1 |
| 2026-08-02 | slice/8-scanner-skill-parse-fixtures | slice-workflow | 8 | ✅ PASSED | Wave E — skill parse fixtures |
| 2026-08-02 | slice/11-python-ship-path-coverage-95 | slice-workflow | 11 | ✅ PASSED | Wave E — sandbox ≥95% |
| 2026-08-02 | slice/12-cli-coverage-gate-95 | slice-workflow | 12 | ✅ PASSED | Wave E — CLI c8 ≥95% lines |
| 2026-08-02 | slice/13-live-acl-coverage-gate-95 | slice-workflow | 13 | ✅ PASSED | Wave E — Live ACL c8 ≥95% lines |
| 2026-08-02 | main / plan | GATE_CONTRACT | all | 📋 policy | Hard close rule |
| 2026-08-02 | docs/gate-contract-onboarding-priority | sync-docs + clean-commit | 7, plan | pushed | Groups + close slice 7 on trackers |
