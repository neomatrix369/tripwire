# Progress
> Last updated: 2026-08-25

## Slice groups (execution sequence)

| Wave | Folder | Group | Slices | Outcome |
|-----:|--------|-------|--------|---------|
| 12 | [`12-L-…`](slices/12-L-tessl-5-row-expansion/) | **L — Tessl 5-row expansion** | 45 ✅ · 46 ✅ · 47 ✅ · 48 ✅ · 49 ✅ · 50 ✅ · **51** 🔀 · 52 📋 | 45–50 ✅ · **51** 🔀 |
| 13 | [`13-M-…`](slices/13-M-llm-usage-tracking/) | **M — LLM usage / cost observability** | **53** | 📋 plan-only (ADR-0016 follow-on; not J/L/G) |
| 11 | [`11-K-…`](slices/11-K-docs-ux-plain-language/) | **K — Docs UX plain language + compaction** | **44** | 🔀 |
| 10 | [`10-J-…`](slices/10-J-dashboard-data-quality/) | **J — Dashboard Data Quality Fixes** | 42 | A1–A13 ✅ |
| 9 | [`09-I-…`](slices/09-I-landing-intro-restyle/) | **I — Landing Intro + Visual Refresh** | 41 ✅ · 43 | 41 ✅ · 43 ✅ |
| 1 | [`01-A-…`](slices/01-A-live-path-gwt/) | **A — Live path + GWT** | 1 → 2 → 3 · 4 | ✅ · 4 📦 |
| 2 | [`02-B-…`](slices/02-B-characterization-evidence/) | **B — Characterization + evidence sync** | 6 → 5 | ✅ |
| 3 | [`03-C-…`](slices/03-C-trust-coverage-audit/) | **C — Trust + coverage audit** | 7 | ✅ |
| 4 | [`04-D-…`](slices/04-D-operator-onboarding/) | **D — Task-based onboarding + documentation UX** | **17** | ✅ |
| 5 | [`05-E-…`](slices/05-E-ship-path-coverage/) | **E — Ship-path coverage** | 8 → 11 → 12 → 13 ✅ → 14 (**9+10 SUBSUMED INTO 11**) | ✅ Musts · close-path |
| 6 | [`06-F-…`](slices/06-F-claim-audit/) | **F — Claim audit** | 15 · 16 | 📦 |
| 7 | [`07-G-…`](slices/07-G-atdd-closure/) | **G — ATDD closure** | 18, 19, 20, 21, 22 (independent gates) | 📋 parked |
| 8 | [`08-H-…`](slices/08-H-frontline-agent-hooks/) | **H — Frontline agent hooks** | 23→32 Must · 33–38 Should · 39 Could | 📋 plan-only |

**Slice 40 ✅ PASSED (2026-08-17):** `tripwire scan --type <skill|mcp>` filter — 110 tests green, code review approved, quality gates pass. Branch: `slice/40-scan-type-filter`. **Next priority:** Wave H Musts 23→32.

## Execution order (open work)

| Order | Wave | # | Slice | MoSCoW | Status |
|------:|-----:|---|-------|--------|--------|
| 0 (docs) | K | **44** | **Docs UX plain language + compaction** | Must | 🔀 ON BRANCH · [#99](https://github.com/neomatrix369/tripwire/pull/99) · GWT-44.1–44.8 · documentarist APPROVED WITH FOLLOW-ON (DIVIO targets pending) · `slice/44-docs-ux-plain-language` |
| 0 (active) | L | **51** | **Tessl: Review (Security) (Row 5)** | Could | 🔀 ON BRANCH · `slice/51-review-security` · nw-review APPROVED |
| 0 (delta) | J | 42 | Dashboard Data Quality — Tessl quality UX + tooltips + plain labels (A9–A13) | Must | ✅ PASSED · [#98](https://github.com/neomatrix369/tripwire/pull/98) |
| 1 | G | 18 | CLI Operator Evidence Contracts | Must | 📋 PLANNED |
| 2 | G | 19 | Sandbox Persistence State Contract | Must | 📋 PLANNED |
| 3 | G | 20 | Scanner Subprocess Adapter Contract | Must | 📋 PLANNED |
| 4 | G | 21 | Dashboard Latest-State Accuracy | Must | 📋 PLANNED |
| 5 | G | 22 | Dashboard Realtime Recovery | Must | 📋 PLANNED |
| 0 (active, 2026-08-15) | H | H0 | Agent Guard governance docs (ADR-0017 + trackers) | Must | 🔨 IN PROGRESS |

**Wave H addendum (2026-08-15):** the hackathon stream (branch
`tripwire-frontline-hack`) runs ahead of Wave G. `setup-agent-hooks` lands in
`cli/bin/tripwire.js`, the same file slice 18 refactors — one active slice per
shared code area: slice 18 does not start until the H-wave subcommand lands
(or is explicitly rebased onto slice 18).
| 1 | H1 | 23 | Config + Handler Scripts | Must | 📋 PLANNED |
| 2 | H1 | 24 | `tripwire setup-agent-hooks` | Must | 📋 PLANNED |
| 3 | H1 | 25 | Live Enforce Smoke | Must | 📋 PLANNED |
| 4 | H2 | 26 | API Introspect + Dual Output Contract (delta: Quality column) | Must | 📋 PLANNED |
| 5 | H2 | 27 | `/tw-enable` + `/tw-disable` | Must | 📋 PLANNED |
| 6 | H2 | 28 | `/tw-verify` (delta: Quality `N/100` + blocked footer) | Must | 📋 PLANNED |
| 7 | H2 | 29 | `/tw-scan` | Must | 📋 PLANNED |
| 8 | H2 | 30 | `/tw-self-check` | Must | 📋 PLANNED |
| 9 | H3 | 31 | Demo Artifacts | Must | 📋 PLANNED |
| 10 | H3 | 32 | Phase 1 Regression Verification (HARD GATE) | Must | 📋 PLANNED |
| 11 | H4 | 33 | DepShield Install | Should | 📋 PLANNED |
| 12 | H4 | 34 | DepShield Dispatch | Should | 📋 PLANNED |
| 13 | H5 | 35 | Ossprey Access Provisioning | Should | 🔴 BLOCKED |
| 14 | H5 | 36 | Ossprey Dispatch | Should | 📋 PLANNED |
| 15 | H6 | 37 | CLI Monitoring | Should | 📋 PLANNED |
| 16 | H6 | 38 | Full-Chain Validation | Should | 📋 PLANNED |
| 17 | H6 | 39 | FE/BE Rearchitecture | Could | 📦 DEFERRED |
| **0 (next)** | H-ss | **40** | **`tripwire scan --type <skill\|mcp>` filter** | **Must** | 📋 PLANNED |
| — | G | 18–22 | ATDD closure (parked) | Must | 📋 PLANNED |
| — | L | 45 | DB Schema Migration (14-state enum + 4 columns) | Must | ✅ PASSED · [#103](https://github.com/neomatrix369/tripwire/pull/103) |
| — | L | 46 | Tessl: Lint Adapter (Row 1) | Must | ✅ PASSED · [#105](https://github.com/neomatrix369/tripwire/pull/105) |
| — | L | 47 | Tessl: Review (Quality) Split (Row 2) | Must | ✅ PASSED · [#109](https://github.com/neomatrix369/tripwire/pull/109) |
| — | L | 48 | "Not Available Yet" Placeholder Rows (Rows 3–5) | Must | 🔨 IN PROGRESS · after-checks green · awaiting commit/PR · `slice/48-not-available-yet-ui` |
| — | L | 49 | Tessl: Scenario Generation + Resume Checkpoint (Row 3) | Should | 📋 PLANNED |
| — | L | 50 | Tessl: Eval + Auto-Chain (Row 4) | Should | ✅ PASSED · [#113](https://github.com/neomatrix369/tripwire/pull/113) |
| — | L | 51 | Tessl: Review (Security) (Row 5) | Could | 🔀 ON BRANCH |
| — | L | 52 | ID Lineage Cross-Reads + UI Side-by-Side | Could | 📋 PLANNED |
| — | M | **53** | **LLM Usage Tracking + UI Cost Surfacing** | Should | 📋 PLANNED · Wave **13-M** · design: [`docs/design/llm-usage-tracking.md`](../design/llm-usage-tracking.md) · branch docs: `docs/53-llm-usage-tracking-plan` |

## Quick Status (by group)

### A — Live path + GWT
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](slices/01-A-live-path-gwt/slice-1-walking-skeleton-live-path.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~50 min |
| 2 | [slice-2-gwt1-detection-acceptance](slices/01-A-live-path-gwt/slice-2-gwt1-detection-acceptance.md) | Must | ✅ | 2026-08-01 | 2026-08-01 | ~25 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](slices/01-A-live-path-gwt/slice-3-gwt2-sandbox-evidence-acceptance.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 4 | [slice-4-vo-remotion-assemble](slices/01-A-live-path-gwt/slice-4-vo-remotion-assemble.md) | Won't (A) | 📦 closed | 2026-08-02 | 2026-08-02 | ~25 min |

### B — Characterization + evidence sync
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 6 | [slice-6-orchestrator-characterization](slices/02-B-characterization-evidence/slice-6-orchestrator-characterization.md) | Could | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 5 | [slice-5-gate-evidence-docs-sync](slices/02-B-characterization-evidence/slice-5-gate-evidence-docs-sync.md) | Should | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |

### C — Trust + coverage audit
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 7 | [slice-7-coverage-audit-matrix](slices/03-C-trust-coverage-audit/slice-7-coverage-audit-matrix.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |

### D — Task-based onboarding
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| **17** | [slice-17-user-guide-onboarding](slices/04-D-operator-onboarding/slice-17-user-guide-onboarding.md) | Must | ✅ | 2026-08-02 | 2026-08-04 | ~75 min |

### E — Ship-path coverage
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 8 | [slice-8-scanner-skill-parse-fixtures](slices/05-E-ship-path-coverage/slice-8-scanner-skill-parse-fixtures.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](slices/05-E-ship-path-coverage/slice-9-scanner-snyk-tessl-parse-fixtures.md) | Should | 📦 closed (subsumed by 11) | 2026-08-02 | — | ~25 min |
| 10 | [slice-10-scan-item-inner-characterization](slices/05-E-ship-path-coverage/slice-10-scan-item-inner-characterization.md) | Should | 📦 closed (subsumed by 11) | 2026-08-02 | — | ~25 min |
| 11 | [slice-11-python-ship-path-coverage-95](slices/05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~50 min |
| 12 | [slice-12-cli-coverage-gate-95](slices/05-E-ship-path-coverage/slice-12-cli-coverage-gate-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 13 | [slice-13-live-acl-coverage-gate-95](slices/05-E-ship-path-coverage/slice-13-live-acl-coverage-gate-95.md) | Must | ✅ | 2026-08-02 | 2026-08-02 | ~25 min |
| 14 | [slice-14-coverage-status-docs-sync](slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md) | Must | ✅ | 2026-08-03 | 2026-08-03 | ~25 min |

### F — Claim audit
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 15 | [slice-15-horizon-a-claim-audit](slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md) | Must | 📦 closed | — | — | ~25 min |
| 16 | [slice-16-docs-claim-remediations](slices/06-F-claim-audit/slice-16-docs-claim-remediations.md) | Won't (A) | 📦 closed | — | 2026-08-02 | ~25 min |

### G — ATDD closure
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 18 | [slice-18-cli-operator-evidence](slices/07-G-atdd-closure/slice-18-cli-operator-evidence.md) | Must | 📋 PLANNED (parked) | — | — | ~50 min |
| 19 | [slice-19-sandbox-persistence-contract](slices/07-G-atdd-closure/slice-19-sandbox-persistence-contract.md) | Must | 📋 PLANNED (parked) | — | — | ~50 min |
| 20 | [slice-20-scanner-subprocess-contract](slices/07-G-atdd-closure/slice-20-scanner-subprocess-contract.md) | Must | 📋 PLANNED (parked) | — | — | ~50 min |
| 21 | [slice-21-dashboard-reliability](slices/07-G-atdd-closure/slice-21-dashboard-reliability.md) | Must | 📋 PLANNED (parked) | — | — | ~40 min |
| 22 | [slice-22-dashboard-realtime-recovery](slices/07-G-atdd-closure/slice-22-dashboard-realtime-recovery.md) | Must | 📋 PLANNED (parked) | — | — | ~40 min |

### H — Frontline agent hooks
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 23 | [slice-23-config-handler-scripts](slices/08-H-frontline-agent-hooks/slice-23-config-handler-scripts.md) | Must | 📋 PLANNED | — | — | ~40 min |
| 24 | [slice-24-setup-agent-hooks](slices/08-H-frontline-agent-hooks/slice-24-setup-agent-hooks.md) | Must | 📋 PLANNED | — | — | ~40 min |
| 25 | [slice-25-live-enforce-smoke](slices/08-H-frontline-agent-hooks/slice-25-live-enforce-smoke.md) | Must | 📋 PLANNED | — | — | ~30 min |
| 26 | [slice-26-api-output-contract](slices/08-H-frontline-agent-hooks/slice-26-api-output-contract.md) | Must | 📋 PLANNED | — | — | ~40 min |
| 27 | [slice-27-tw-enable-disable](slices/08-H-frontline-agent-hooks/slice-27-tw-enable-disable.md) | Must | 📋 PLANNED | — | — | ~25 min |
| 28 | [slice-28-tw-verify](slices/08-H-frontline-agent-hooks/slice-28-tw-verify.md) | Must | 🔀 ON BRANCH | 2026-08-25 | — | ~50 min (delta: Quality + footer) |
| 29 | [slice-29-tw-scan](slices/08-H-frontline-agent-hooks/slice-29-tw-scan.md) | Must | 📋 PLANNED | — | — | ~40 min |
| 30 | [slice-30-tw-self-check](slices/08-H-frontline-agent-hooks/slice-30-tw-self-check.md) | Must | 📋 PLANNED | — | — | ~30 min |
| 31 | [slice-31-demo-artifacts](slices/08-H-frontline-agent-hooks/slice-31-demo-artifacts.md) | Must | 📋 PLANNED | — | — | ~40 min |
| 32 | [slice-32-phase1-regression](slices/08-H-frontline-agent-hooks/slice-32-phase1-regression.md) | Must | 📋 PLANNED | — | — | ~50 min |
| 33 | [slice-33-depshield-install](slices/08-H-frontline-agent-hooks/slice-33-depshield-install.md) | Should | 📋 PLANNED | — | — | ~30 min |
| 34 | [slice-34-depshield-dispatch](slices/08-H-frontline-agent-hooks/slice-34-depshield-dispatch.md) | Should | 📋 PLANNED | — | — | ~40 min |
| 35 | [slice-35-ossprey-access](slices/08-H-frontline-agent-hooks/slice-35-ossprey-access.md) | Should | 🔴 BLOCKED | — | — | ~20 min |
| 36 | [slice-36-ossprey-dispatch](slices/08-H-frontline-agent-hooks/slice-36-ossprey-dispatch.md) | Should | 📋 PLANNED | — | — | ~40 min |
| 37 | [slice-37-cli-monitoring](slices/08-H-frontline-agent-hooks/slice-37-cli-monitoring.md) | Should | 📋 PLANNED | — | — | ~30 min |
| 38 | [slice-38-full-chain-validation](slices/08-H-frontline-agent-hooks/slice-38-full-chain-validation.md) | Should | 📋 PLANNED | — | — | ~50 min |
| 39 | [slice-39-fe-be-rearchitecture](slices/08-H-frontline-agent-hooks/slice-39-fe-be-rearchitecture.md) | Could | 📦 DEFERRED | — | — | — |

### H — Claude Code Agent Guard integration (hackathon)
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
| --- | --- | --- | --- | --- | --- | --- |
| H0 | Governance docs — [ADR-0017](../adr/0017-claude-code-agent-guard-integration.md) + DECISIONS/STATUS/TRAIL/PROGRESS rows | Must | 🔨 | 2026-08-15 | — | ~25 min |
| H1–H7 | Handler + guard T1/T2 + `guard/status.py` → hook wiring (spike first) → `setup-agent-hooks` → install → five `/tw-*` skills → demo artifacts → Phase-1 gate | Must | 📋 | — | — | — |

Wave folder `slices/08-H-agent-guard-integration/` pending; spec is the
hackathon working plan ("Tripwire × Claude Code Integration — Implementation
Plan", 2026-08-15). Governance blocks *merge*, not prototyping.

### I — Landing Intro + Visual Refresh
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 41 | [slice-41-landing-intro-dashboard-restyle](slices/09-I-landing-intro-restyle/slice-41-landing-intro-dashboard-restyle.md) | Must | ✅ PASSED | 2026-08-19 | 2026-08-19 | — |
| 43 | [slice-43-foldergate-tripwire-visual-blend](slices/09-I-landing-intro-restyle/slice-43-foldergate-tripwire-visual-blend.md) | Must | ✅ PASSED | 2026-08-20 | 2026-08-20 | ~90 min |

### J — Dashboard Data Quality Fixes
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 42 | [slice-42-dashboard-data-quality-fixes](slices/10-J-dashboard-data-quality/slice-42-dashboard-data-quality-fixes.md) | Must | ✅ PASSED (A9–A13 · [#98](https://github.com/neomatrix369/tripwire/pull/98); A1–A8 #95) | 2026-08-19 | — | ~75 min delta |

### K — Docs UX plain language + compaction
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 44 | [slice-44-docs-ux-plain-language](slices/11-K-docs-ux-plain-language/slice-44-docs-ux-plain-language.md) | Must | 🔀 ON BRANCH | 2026-08-20 | — | ~50 min |

### L — Tessl 5-row expansion
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 45 | [slice-45-schema-migration](slices/12-L-tessl-5-row-expansion/slice-45-schema-migration.md) | Must | ✅ PASSED ([#103](https://github.com/neomatrix369/tripwire/pull/103)) | 2026-08-24 | 2026-08-24 | ~3 min |
| 46 | [slice-46-lint-adapter](slices/12-L-tessl-5-row-expansion/slice-46-lint-adapter.md) | Must | ✅ PASSED ([#105](https://github.com/neomatrix369/tripwire/pull/105)) | 2026-08-24 | 2026-08-24 | ~4 min |
| 47 | [slice-47-review-quality-split](slices/12-L-tessl-5-row-expansion/slice-47-review-quality-split.md) | Must | ✅ PASSED ([#109](https://github.com/neomatrix369/tripwire/pull/109)) | 2026-08-24 | 2026-08-24 | ~4 min |
| 48 | [slice-48-not-available-yet-ui](slices/12-L-tessl-5-row-expansion/slice-48-not-available-yet-ui.md) | Must | 🔨 IN PROGRESS | 2026-08-24 | — | ~3 min |
| 49 | [slice-49-scenario-generation](slices/12-L-tessl-5-row-expansion/slice-49-scenario-generation.md) | Should | ✅ PASSED ([#112](https://github.com/neomatrix369/tripwire/pull/112)) | 2026-08-24 | 2026-08-25 | ~6 min |
| 50 | [slice-50-eval-auto-chain](slices/12-L-tessl-5-row-expansion/slice-50-eval-auto-chain.md) | Should | ✅ PASSED ([#113](https://github.com/neomatrix369/tripwire/pull/113)) | 2026-08-25 | 2026-08-25 | ~5 min |
| 51 | [slice-51-review-security](slices/12-L-tessl-5-row-expansion/slice-51-review-security.md) | Could | 🔀 ON BRANCH | 2026-08-25 | — | ~3 min |
| 52 | [slice-52-id-lineage-wiring](slices/12-L-tessl-5-row-expansion/slice-52-id-lineage-wiring.md) | Could | 📋 PLANNED | — | — | ~5 min |

### M — LLM usage / cost observability
| # | Slice | MoSCoW | Status | Started | Completed | Est. time |
|---|-------|--------|--------|---------|-----------|-----------|
| 53 | [slice-53-llm-usage-tracking](slices/13-M-llm-usage-tracking/slice-53-llm-usage-tracking.md) | Should | 📋 PLANNED (EFP-processed) | — | — | Phase1 ~120 min · Phase2 +~60 min |

**Group note:** ADR-0016 router follow-on. Not filed under J (dashboard quality ✅ closed), L (Tessl), or G (ATDD parked).

**Status legend**: [EMOJI_LEGEND.md](EMOJI_LEGEND.md)

**Gate close:** ✅ only per [GATE_CONTRACT.md](GATE_CONTRACT.md) — all After-Checks + evidence `PASS` + review + trackers. `🔀` = checks green on branch, not yet ✅.

## Blockers
| Slice | Blocker | Status |
|-------|---------|--------|
| 35 | Ossprey access OPEN — credentials not confirmed in DECISIONS | 🔴 BLOCKED |
| 4 (historical) | Remotion sibling + VO assets missing | 📦 closed with demo/hackathon deferral — reinstate slice 4 if film day returns |

## Forward Roadmap
- Wave **M** (slice 53) LLM usage / cost observability is **📋 plan-only** — ADR-0016 follow-on; execute when explicitly started (`slice/53-llm-usage-tracking`).
- Waves **A–C**, coverage Slice 14, and Slice 17 are merged and closed. Slice 15 is retained as a deferred claim-audit artifact, not active work.
- **Wave H (Frontline):** plan-only stubs 23–39 on branch `frontline-hackathon-london-2026-agent-hooks`. Execute Musts 23→32 with human tests after H1/H2 and HARD GATE at 32 before Should work.
- Wave G (18–22) remains planned but **parked** while Frontline H1–H3 is active unless explicitly resumed.
- Reopen Slice 15 only for a future live/demo release that needs its security and 3B evidence path.
- **Deferred / Won't (A):** 4 (in A); 15 and 16 (in F) — reinstate only if a new live/demo need arises
- Slice 39 FE/BE Could stays 📦 until pulled in after slice 38.
- Gate close: [GATE_CONTRACT.md](GATE_CONTRACT.md)
- Wave G is planned. Run its independent gates in the reviewable order 18, 19, 20, 21, 22; do not run overlapping source-file slices concurrently.
- Won't for A: Drift, Phase 4/5, redesign, blast-radius, instruction→install→scan; Live E2E CI Must; support.js 95%; demo video / hackathon film day
- **2026-08-15:** the "Phase 4" (Agent Guard) part of the line above is amended by ADR-0017 — Guard PreToolUse enforcement is reopened as **Wave H** (Frontline Hackathon London 2026, branch `tripwire-frontline-hack`); Drift and Phase 5 remain Won't (A). STATUS entries stay PROPOSED until the Phase-1 regression gate.
- Won't for A: Drift, redesign, blast-radius, instruction→install→scan; Live E2E CI Must; support.js 95%; demo video / hackathon film day. Agent Guard for Frontline = Wave H.

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
| 2026-08-15 | tripwire-frontline-hack | hackathon build (plan §9 step 0) | H0 | 🔨 | Wave H — ADR-0017 + DECISIONS/STATUS/TRAIL/PROGRESS governance rows |
| 2026-08-15 | frontline-hackathon-london-2026-agent-hooks | enhanced-flow-planner Add | 23–39 | 📋 stubs | Wave H Frontline plan-only; Wave G parked |
| 2026-08-16 | docs/skills-scanner-scan-complexity-study | enhanced-flow-planner + plan-modifier | skills_scanner 35 | 📋 stub | skills_scanner code study: scan() CC=55 → Slice 35 stub ported to `docs/plan/slices/slice-35-scan-complexity-decomposition.md` |
| 2026-08-17 | docs/slice-40-renumber-and-reframe | sync-docs + clean-commit | 40 | 📋 PLANNED | Renumber conflict (35 taken by H5 Ossprey); reframe as Tripwire-native (run_snyk CC=28, run_cisco_mcp_scanner CC=23); elevate to Must + highest priority. PR #86 |
| 2026-08-17 | docs/slice-40-reframe-type-filter | plan-modifier | 40 | 📋 PLANNED | Reframe slice 40 again: user-facing `--type <skill\|mcp>` filter on `tripwire scan` (not internal complexity refactor). UX decision: parameter on existing subcommand over new subcommand. |
| 2026-08-20 | plan (on slice/42 working tree) | enhanced-flow-planner Path B | 43 | 📋 PLANNED | Amend Wave I: FolderGate cream/tan × Tripwire HUD. Slice 41 stays ✅ (intro). |
| 2026-08-20 | slice/43-foldergate-tripwire-visual-blend | gate close prep | 43 | 🔀 ON BRANCH | PR #96; gate-evidence slice-43.json; trackers synced. |
| 2026-08-20 | main | merge PR #96 | 43 | ✅ PASSED | FolderGate × Tripwire visual blend on main. |
| 2026-08-20 | plan | enhanced-flow-planner augment | 42 | 📋 delta reopen | A9–A10 Tessl quality on cards + inner scan cues; no new slice. |
| 2026-08-20 | plan | enhanced-flow-planner pile-on | 42 | 📋 A11 | Risk hover tooltip (formula/range/meaning); still no new slice. |
| 2026-08-20 | plan | enhanced-flow-planner pile-on | 42 | 📋 A12 | Quality not on card top yet; require Tessl 0–100 hover with A9. |
| 2026-08-20 | docs/slice-42-reopen-a9-a11 | sync-docs | 42·43 | APPLIED | STATUS/ARCHITECTURE + trackers: 43 ✅; A9–A12 DECIDED. |
| 2026-08-20 | plan | enhanced-flow-planner pile-on | 42 | 📋 A13 | Operator-friendly labels (`Risk density`, not `risk_score`). |
| 2026-08-20 | slice/42-tessl-quality-card-surfacing | nw-review | 42 | APPROVED | software-crafter-reviewer A9–A13; After-Check ticked; PR #98. |
| 2026-08-20 | slice/42-tessl-quality-card-surfacing | sync-docs | 42 | APPLIED | STATUS/ARCHITECTURE/CHANGELOG/TRAIL: nw-review APPROVED + CSS score-tip truth; still 🔀 until merge. |
| 2026-08-20 | slice/42-tessl-quality-card-surfacing | sync-docs | 42 | APPLIED | Tip portal supersedes host-elevate absolute bubbles (overflow clip). |
| 2026-08-21 | plan | docs UX allocation audit | — | 📋 recorded | Setup vs Configure / MVP Live gaps noted; polish folded into slice 44. |
| 2026-08-21 | slice/44-docs-ux-plain-language | pile-on GWT-44.5–44.7 | 44 | 🔀 ON BRANCH | Setup vs Configure framing, MVP Live, Maintain hub, screenshots `R`/`Q`. |
| 2026-08-21 | slice/44-docs-ux-plain-language | pile-on GWT-44.8 | 44 | 🔀 ON BRANCH | Services inventory + journey/dependency Mermaid in ARCHITECTURE. |
| 2026-08-21 | plan | sync SSOT | 44 | APPLIED | TRAIL/PROGRESS/stub/gate-evidence + audit Cursor plan: GWT-44.5–44.8 on branch; PCTO plan cancelled. |
| 2026-08-21 | slice/44-docs-ux-plain-language | sync-docs | 44 | APPLIED | STATUS Wave K ON BRANCH + Wave J ✅ (#98); ARCHITECTURE/README entry links. |
| 2026-08-21 | slice/44-docs-ux-plain-language | documentarist pile-on | 44 | APPROVED WITH FOLLOW-ON | QUICKSTART/hub/screenshots OK; env-vars + prerequisites DIVIO rewrite DECIDED, targets pending; still 🔀. |
| 2026-08-21 | slice/44-docs-ux-plain-language | sync-docs | 44 | APPLIED | STATUS ON BRANCH/DECIDED aligned to APPROVED WITH FOLLOW-ON; user-guide targets untouched. |
| 2026-08-22 | slice/44-docs-ux-plain-language | sync-docs | 44 | APPLIED | PR #99 linked in STATUS/PROGRESS; gate-evidence SHA `0362d36`. |
| 2026-08-24 | slice/46-tessl-lint-adapter | verify-slice repair | 46 | 🔀 ON BRANCH | Dashboard name contract + design Coverage Gap 1 + trackers; live `tessl skill lint --help` probed. |
| 2026-08-24 | slice/46-tessl-lint-adapter | sync-docs | 46 | 🔀 ON BRANCH | Live persist VERIFIED(scan_run a36cad9f); TRAIL/gate-evidence PR #105. Still 🔀 until merge. |
| 2026-08-24 | plan | Tessl scenario/eval slice contract | 49–50 | 📋 PLANNED | Tessl CLI+docs probe: Gap B resolved; slices 49–50 aligned to generate→download→eval run pipeline; slice 52 lineage; TRAIL+design updated. |
| 2026-08-24 | plan | Tessl ID carry-forward contract | 47–52 | 📋 PLANNED | Design § ID carry-forward + slices 45–52: `_TesslIdContext`, `_attach_upstream_run_ids`, per-row stamp rules; slice 52 depends on 47/49/50/51 populating persisted JSON. |
| 2026-08-24 | slice/47-review-quality-split | slice-workflow | 47 | 🔨 IN PROGRESS | `_run_tessl_review(quality)` + tessl_run_id via view --last; slice 46 closed ✅ #105 |
| 2026-08-24 | slice/47-review-quality-split | slice-workflow | 47 | 🔨 IN PROGRESS | GWT-47.5 `_TesslIdContext` seed + `_update_tessl_id_context` after Quality stamp |
| 2026-08-24 | main | merge PR #109 + sync-docs | 47 | ✅ PASSED | nw-review APPROVED; GWT-47.1–47.5 on main; gate-evidence PASS |
| 2026-08-25 | slice/51-review-security | slice-workflow | 51 | 🔨 IN PROGRESS | Security Review row after Eval; GWT-51.1–51.4 + dashboard Quality link; TESSL_WORKSPACE left unchanged |
| 2026-08-25 | slice/51-review-security | nw-review | 51 | APPROVED | software-crafter-reviewer; After-Checks ticked; still 🔨 until commit/PR |
| 2026-08-25 | slice/51-review-security | clean-commit | 51 | 🔀 ON BRANCH | `6cbded7` feat + `c96c459` style; pushed; awaiting `/create-pr` |
| 2026-08-25 | slice/51-review-security | sync-docs | 51 | APPLIED | Trackers 🔨→🔀; prerequisites + OPTIONAL_SCANNER_KEYS name Security; adapters heading; README/AGENTS NO_CHANGE |
