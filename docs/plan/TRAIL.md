# Trail
> ~8 min read

## Original Material
- **Brief**: Horizon A — ship path + onboarding + coverage. GWT-1/2 evidence ✅. **Demo/hackathon wave closed 2026-08-02** (VO/Remotion + film-day prose deferred; reinstate if needed). **Wave +coverage**: ship-path ~95% (cli + sandbox + Live ACL); onboarding slice 17; slices 7–15. **Wave H (2026-08-15):** Frontline Hackathon London 2026 — Claude Code agent hooks + `/tw-*` skills (slices 23–39); plan-only on branch `frontline-hackathon-london-2026-agent-hooks`.
- **Scenario**: Brownfield · Flow D · depth 5–8
Routing: Brownfield · Chosen: 2026-08-02 · Source: health-check-inferred; Wave H Add: 2026-08-15 · Source: `internal-docs/04_frontline/main_prompt.md`
- **Canonical plan path**: `docs/plan/` (public). Product SoT remains gitignored private references — do not fork parallel plan trees. Enhanced-flow-planner context pack: private references + `01_demo_video/00-tripwire-demo-script.md` (not `02_prototypes/import-stash/`).
- **Model split** — Planning: gpt-5.6-sol (high) · Execution: gpt-5.6-terra (medium) · Design: slice 43 (FolderGate cream/tan × Tripwire HUD; slice 41 dark-cyan fill superseded)

<!-- harness-scout output -->
<!-- NOTE: recommendation models below are cached artifacts; live execution model is overridden in DECISIONS (2026-08-03) to OpenAI (`gpt-5.6-sol` for planning, `gpt-5.6-terra` for execution/review). -->
```yaml
# planning (detect_confirm)
mode: detect_confirm
action: plan
ambiguity: high  # Brownfield
blast_radius: low
time_box: "planning session"
duration_profile: interactive
extensions_applied: [ambiguity]
recommendation:
  claude_code:
    model: claude-opus-4-8
    effort: High
    permission_mode: plan
  cursor:
    mode: Agent
    model: claude-opus-4-8
    max_mode: false
    auto_run: false
isolation:
  worktree_required: false
duration:
  profile: interactive
  checkpoint_cadence: N/A
cost_flag: elevated
confirm_checklist:
  - "Cursor detection is self-report only — read model/mode from Agent tab header"
  - "Phase 1: deliberate tier for judgment; Phase 2: drop to workhorse for execution"
freshness:
  stale: false
  last_checked: "2026-07-19"
---
# execution (recommend)
mode: recommend
action: execute
ambiguity: low
blast_radius: medium
time_box: "≤2h (~5–6 Pomos)"
duration_profile: interactive
extensions_applied: [blast_radius_medium]
recommendation:
  claude_code:
    model: claude-sonnet-5
    effort: Medium
    permission_mode: default
  cursor:
    mode: Composer
    model: claude-sonnet-5
    max_mode: false
    auto_run: false
isolation:
  worktree_required: true
duration:
  profile: interactive
  checkpoint_cadence: N/A
cost_flag: none
confirm_checklist:
  - "Start from an isolated worktree before first edit"
  - "git diff --stat main must be empty before first edit"
freshness:
  stale: false
  last_checked: "2026-07-19"
```


## Slice groups (execution sequence)

Groups are ordered by when the wave ran (or will run), not by slice number.

| Wave | Folder | Group | Slices | Status |
|-----:|--------|-------|--------|--------|
| 1 | [`slices/01-A-live-path-gwt/`](slices/01-A-live-path-gwt/) | **A — Live path + GWT** | 1 → 2 → 3 (4 attempted) | A done; 4 📦 |
| 2 | [`slices/02-B-characterization-evidence/`](slices/02-B-characterization-evidence/) | **B — Characterization + evidence sync** | 6 → 5 | ✅ |
| 3 | [`slices/03-C-trust-coverage-audit/`](slices/03-C-trust-coverage-audit/) | **C — Trust + coverage audit** | 7 | ✅ |
| 4 | [`slices/04-D-operator-onboarding/`](slices/04-D-operator-onboarding/) | **D — Task-based onboarding + documentation UX** | **17** | ✅ |
| 5 | [`slices/05-E-ship-path-coverage/`](slices/05-E-ship-path-coverage/) | **E — Ship-path coverage** | 8 → 11 → 12 → 13 ✅ · (9∥10) → 14 | ✅ closed; 9/10 📦 subsumed |
| 6 | [`slices/06-F-claim-audit/`](slices/06-F-claim-audit/) | **F — Claim audit** | 15, 16 deferred | 📦 |
| 7 | [`slices/07-G-atdd-closure/`](slices/07-G-atdd-closure/) | **G — ATDD closure** | 18, 19, 20, 21, 22 (independent gates) | 📋 |
| 8 | `slices/08-H-agent-guard-integration/` (stubs pending) | **H — Claude Code Agent Guard integration** | H0 governance → H1–H7 (hackathon plan §9 steps 0–7) | 🔨 |
| 8 | [`slices/08-H-frontline-agent-hooks/`](slices/08-H-frontline-agent-hooks/) | **H — Frontline agent hooks** | 23→32 Must · 33–38 Should · 39 Could | 📋 plan-only |
| 9 | [`slices/09-I-landing-intro-restyle/`](slices/09-I-landing-intro-restyle/) | **I — Landing Intro + Visual Refresh** | 41 ✅ · **43** ✅ | [#96](https://github.com/neomatrix369/tripwire/pull/96) |
| 10 | [`slices/10-J-dashboard-data-quality/`](slices/10-J-dashboard-data-quality/) | **J — Dashboard Data Quality Fixes** | 42 ✅ A1–A13 ([#98](https://github.com/neomatrix369/tripwire/pull/98)) · A1–A8 [#95](https://github.com/neomatrix369/tripwire/pull/95) | — |
| 11 | [`slices/11-K-docs-ux-plain-language/`](slices/11-K-docs-ux-plain-language/) | **K — Docs UX plain language + compaction** | **44** 🔀 | — |

**Status legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 CLOSED — DEFERRED/WON'T`

### A — Live path + GWT (executed 2026-08-01 → 08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](slices/01-A-live-path-gwt/slice-1-walking-skeleton-live-path.md) | Walking Skeleton — Live Demo Path | Must | ✅ | none | #14 | ~5 min |
| 2 | [slice-2-gwt1-detection-acceptance](slices/01-A-live-path-gwt/slice-2-gwt1-detection-acceptance.md) | GWT-1 Detection Acceptance | Must | ✅ | 1 | #15 | ~4 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](slices/01-A-live-path-gwt/slice-3-gwt2-sandbox-evidence-acceptance.md) | GWT-2 Sandbox Evidence Acceptance | Must | ✅ | 1 | #16 | ~4 min |
| 4 | [slice-4-vo-remotion-assemble](slices/01-A-live-path-gwt/slice-4-vo-remotion-assemble.md) | VO + Remotion Assemble (GWT-3) | Won't (A) | 📦 closed | 2,3 | #17 | ~4 min |

### B — Characterization + evidence sync (executed 2026-08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 6 | [slice-6-orchestrator-characterization](slices/02-B-characterization-evidence/slice-6-orchestrator-characterization.md) | Orchestrator / Modal Characterization | Could | ✅ | none | #18 | ~3 min |
| 5 | [slice-5-gate-evidence-docs-sync](slices/02-B-characterization-evidence/slice-5-gate-evidence-docs-sync.md) | Gate Evidence + Docs Sync | Should | ✅ | 1,2,3,4 | #19 | ~3 min |

### C — Trust + coverage audit (executed 2026-08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 7 | [slice-7-coverage-audit-matrix](slices/03-C-trust-coverage-audit/slice-7-coverage-audit-matrix.md) | Coverage Audit Matrix + Docs Parity | Must | ✅ | none | #26/#27 | ~4 min |

### D — Task-based onboarding + documentation UX

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| **17** | [slice-17-user-guide-onboarding](slices/04-D-operator-onboarding/slice-17-user-guide-onboarding.md) | User-Guide Onboarding + Documentation UX | Must | ✅ | 7 | — | ~6 min |

### E — Ship-path coverage (executed)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 8 | [slice-8-scanner-skill-parse-fixtures](slices/05-E-ship-path-coverage/slice-8-scanner-skill-parse-fixtures.md) | Scanner Skill Parse Fixtures (Delta) | Must | ✅ | 7 | — | ~4 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](slices/05-E-ship-path-coverage/slice-9-scanner-snyk-tessl-parse-fixtures.md) | Snyk / Tessl Parse Fixtures (Delta) | Should | 📦 closed (subsumed) | 11 | SUBSUMED by 11 | ~4 min |
| 10 | [slice-10-scan-item-inner-characterization](slices/05-E-ship-path-coverage/slice-10-scan-item-inner-characterization.md) | scan_item_inner Characterization (Delta) | Should | 📦 closed (subsumed) | 11 | SUBSUMED by 11 | ~4 min |
| 11 | [slice-11-python-ship-path-coverage-95](slices/05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md) | Python Ship-Path Coverage ≥95% (+ Snyk v0.6 delta) | Must | 🔀 delta | 8 (9,10 Should) | — | ~5 min |
| 12 | [slice-12-cli-coverage-gate-95](slices/05-E-ship-path-coverage/slice-12-cli-coverage-gate-95.md) | CLI Coverage Gate ≥95% (Delta) | Must | ✅ | 6 | — | ~4 min |
| 13 | [slice-13-live-acl-coverage-gate-95](slices/05-E-ship-path-coverage/slice-13-live-acl-coverage-gate-95.md) | Live ACL Coverage Gate ≥95% (Delta) | Must | ✅ | 2,3 | — | ~4 min |
| 14 | [slice-14-coverage-status-docs-sync](slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md) | Coverage Status + Docs Sync (Delta) | Must | ✅ | 11,12,13 | #39 | ~3 min |

### F — Claim audit (deferred)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 15 | [slice-15-horizon-a-claim-audit](slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md) | Horizon A Factual Claim Audit | Must | 📦 closed | 7,14 | — | ~4 min |
| 16 | [slice-16-docs-claim-remediations](slices/06-F-claim-audit/slice-16-docs-claim-remediations.md) | Docs Claim Remediations (Realtime/Demo/Prototype) | Won't (A) | 📦 closed | 15 | — | ~3 min |

### G — ATDD closure (planned)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 18 | [slice-18-cli-operator-evidence](slices/07-G-atdd-closure/slice-18-cli-operator-evidence.md) | CLI Operator Evidence Contracts | Must | 📋 | none | — | ~5 min |
| 19 | [slice-19-sandbox-persistence-contract](slices/07-G-atdd-closure/slice-19-sandbox-persistence-contract.md) | Sandbox Persistence State Contract | Must | 📋 | none | — | ~5 min |
| 20 | [slice-20-scanner-subprocess-contract](slices/07-G-atdd-closure/slice-20-scanner-subprocess-contract.md) | Scanner Subprocess Adapter Contract | Must | 📋 | none | — | ~5 min |
| 21 | [slice-21-dashboard-reliability](slices/07-G-atdd-closure/slice-21-dashboard-reliability.md) | Dashboard Latest-State Accuracy | Must | 📋 | none | — | ~4 min |
| 22 | [slice-22-dashboard-realtime-recovery](slices/07-G-atdd-closure/slice-22-dashboard-realtime-recovery.md) | Dashboard Realtime Recovery | Must | 📋 | none | — | ~4 min |

### H — Claude Code Agent Guard integration (opened 2026-08-15)

Hackathon work stream (Frontline Hackathon London 2026) on branch
`tripwire-frontline-hack`. Authoritative spec: "Tripwire × Claude Code
Integration — Implementation Plan" (session working document). Governance:
[ADR-0017](../adr/0017-claude-code-agent-guard-integration.md) (amends
ADR-0015) + DECISIONS 2026-08-15 rows + STATUS PROPOSED section. Wave folder
`slices/08-H-agent-guard-integration/` pending; steps tracked against plan §9
until stubs exist.

| # | Name | MoSCoW | Status | Depends on |
| --- | --- | --- | --- | --- |
| H0 | Governance docs (ADR-0017 + DECISIONS/STATUS/TRAIL/PROGRESS rows) | Must | 🔨 | none |
| H1–H7 | Handler + guard T1/T2 + `guard/status.py` → hook wiring (spike first) → `setup-agent-hooks` → install live → five `/tw-*` skills → demo artifacts → Phase-1 regression gate | Must | 📋 | H0 (blocks merge, not prototyping) |

**Shared-file sequencing (slice 18 overlap):** `setup-agent-hooks` lands in
`cli/bin/tripwire.js` — the same file slice 18's Commander-composition refactor
touches. One active slice per shared code area: land the H-wave subcommand
before slice 18 starts, or rebase it onto slice 18. Do not run both
concurrently.
### H — Frontline agent hooks (planned 2026-08-15 — plan-only)

Branch: `frontline-hackathon-london-2026-agent-hooks`. Source: `internal-docs/04_frontline/main_prompt.md`.

**Phase gates:** human test after H1 (25), H2 (30); **HARD GATE** slice 32 PASS before H4+; human test after H4 (34). Parallelism later: after 26, 27∥29; after 32, 33–34 ∥ 35–36 (if access) ∥ 37. AT design before any H → 🔨.

#### H1 — Enforcement walking skeleton (Must)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 23 | [slice-23-config-handler-scripts](slices/08-H-frontline-agent-hooks/slice-23-config-handler-scripts.md) | Config + Handler Scripts | Must | 📋 | none | — | ~4 min |
| 24 | [slice-24-setup-agent-hooks](slices/08-H-frontline-agent-hooks/slice-24-setup-agent-hooks.md) | `tripwire setup-agent-hooks` | Must | 📋 | 23 | — | ~4 min |
| 25 | [slice-25-live-enforce-smoke](slices/08-H-frontline-agent-hooks/slice-25-live-enforce-smoke.md) | Live Enforce Smoke | Must | 📋 | 24 | — | ~3 min |

#### H2 — Shared contracts + control skills (Must)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 26 | [slice-26-api-output-contract](slices/08-H-frontline-agent-hooks/slice-26-api-output-contract.md) | API Introspect + Dual Output Contract | Must | 📋 | 25 | — | ~4 min |
| 27 | [slice-27-tw-enable-disable](slices/08-H-frontline-agent-hooks/slice-27-tw-enable-disable.md) | `/tw-enable` + `/tw-disable` | Must | 📋 | 26 | — | ~3 min |
| 28 | [slice-28-tw-verify](slices/08-H-frontline-agent-hooks/slice-28-tw-verify.md) | `/tw-verify` | Must | 📋 | 26,27 | — | ~5 min |
| 29 | [slice-29-tw-scan](slices/08-H-frontline-agent-hooks/slice-29-tw-scan.md) | `/tw-scan` | Must | 📋 | 26 | — | ~4 min |
| 30 | [slice-30-tw-self-check](slices/08-H-frontline-agent-hooks/slice-30-tw-self-check.md) | `/tw-self-check` | Must | 📋 | 28 | — | ~3 min |

#### H3 — Demos + Phase 1 regression (Must) — HARD GATE

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 31 | [slice-31-demo-artifacts](slices/08-H-frontline-agent-hooks/slice-31-demo-artifacts.md) | Demo Artifacts | Must | 📋 | 25,28,29 | — | ~4 min |
| 32 | [slice-32-phase1-regression](slices/08-H-frontline-agent-hooks/slice-32-phase1-regression.md) | Phase 1 Regression Verification | Must | 📋 | 23–31 | — | ~5 min |

#### H4 — DepShield (Should)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 33 | [slice-33-depshield-install](slices/08-H-frontline-agent-hooks/slice-33-depshield-install.md) | DepShield Install via setup-agent-hooks | Should | 📋 | 32 | — | ~3 min |
| 34 | [slice-34-depshield-dispatch](slices/08-H-frontline-agent-hooks/slice-34-depshield-dispatch.md) | Tripwire → DepShield Dispatch | Should | 📋 | 33 | — | ~4 min |

#### H5 — Ossprey (Should)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 35 | [slice-35-ossprey-access](slices/08-H-frontline-agent-hooks/slice-35-ossprey-access.md) | Ossprey Access Provisioning | Should | 🔴 | 32 | access OPEN | ~2 min |
| 36 | [slice-36-ossprey-dispatch](slices/08-H-frontline-agent-hooks/slice-36-ossprey-dispatch.md) | Tripwire → Ossprey Dispatch | Should | 📋 | 35 | — | ~4 min |

#### H6 — Monitoring + full-chain (Should) / FE-BE (Could)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 37 | [slice-37-cli-monitoring](slices/08-H-frontline-agent-hooks/slice-37-cli-monitoring.md) | CLI Monitoring | Should | 📋 | 32 | — | ~3 min |
| 38 | [slice-38-full-chain-validation](slices/08-H-frontline-agent-hooks/slice-38-full-chain-validation.md) | Full-Chain Validation (+ `/tw-self-check`) | Should | 📋 | 34; 36 if access; 37 | — | ~5 min |
| 39 | [slice-39-fe-be-rearchitecture](slices/08-H-frontline-agent-hooks/slice-39-fe-be-rearchitecture.md) | FE/BE Rearchitecture | Could | 📦 | 38 | hackathon-too-large | ~3 min |

#### H-ss — Scan type filter (Must)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 40 | [slice-40-scan-type-filter](slices/08-H-frontline-agent-hooks/slice-40-scan-type-filter.md) | `tripwire scan --type <skill\|mcp>` filter | Must | ✅ | — | — | ~3 min |

### I — Landing Intro + Visual Refresh (opened 2026-08-19)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 41 | [slice-41-landing-intro-dashboard-restyle](slices/09-I-landing-intro-restyle/slice-41-landing-intro-dashboard-restyle.md) | Landing Page Intro + Dashboard Restyle | Must | ✅ | none | dc8e033 | — |
| 43 | [slice-43-foldergate-tripwire-visual-blend](slices/09-I-landing-intro-restyle/slice-43-foldergate-tripwire-visual-blend.md) | FolderGate × Tripwire Visual Blend | Must | ✅ | 41 | [#96](https://github.com/neomatrix369/tripwire/pull/96) | ~3 min |

### J — Dashboard Data Quality Fixes (opened 2026-08-19)

Source: systematic dashboard anomaly audit (2026-08-19) — 66/235 cards showing incorrect/incomplete panel data.
Audit report: `~/.claude/plans/iterate-through-all-of-lovely-stearns.md`

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 42 | [slice-42-dashboard-data-quality-fixes](slices/10-J-dashboard-data-quality/slice-42-dashboard-data-quality-fixes.md) | Dashboard Data Quality Fixes (A1–A13 Tessl quality + tooltips + labels) | Must | ✅ | none | [#95](https://github.com/neomatrix369/tripwire/pull/95) · [#98](https://github.com/neomatrix369/tripwire/pull/98) | ~3 min |

### K — Docs UX plain language + compaction (opened 2026-08-20)

Wave D Phase 2 continuation (slice 17 ✅). Less-is-more compaction (GWT-44.1–44.4) **plus** pile-ons:
Setup vs Configure framing, MVP Live, Maintain hub (GWT-44.5–44.7); External services inventory +
operator journey + dependency-order Mermaid in ARCHITECTURE (GWT-44.8). Documentarist pile-on
**APPROVED WITH FOLLOW-ON** (2026-08-21): DIVIO rewrites for env-vars procurement table +
prerequisites capability bullets DECIDED, targets pending on this branch.

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 44 | [slice-44-docs-ux-plain-language](slices/11-K-docs-ux-plain-language/slice-44-docs-ux-plain-language.md) | Docs UX Plain Language + Compaction (+ Setup/Configure + services diagrams) | Must | 🔀 | 17 | — | ~5 min |

## Wave 12-L — Tessl 5-Row Expansion

Design source: [`docs/design/tessl-5-row-expansion.md`](../design/tessl-5-row-expansion.md)
Replaces the single `"Tessl"` scanner row with 5 flat sibling rows following the Cisco 3-row precedent. Slices 45–48 are Must (ship together as a self-contained rollout unit); 49–50 are Should; 51–52 are Could.

**Coverage Gaps (2026-08-24 Tessl CLI + docs probe)**:

- **A** (run-ID timing): **Partially resolved** — `scenario generate` polls until complete; capture ID via `scenario view <id> --json`. `eval run --json` returns eval IDs immediately.
- **B** (`scenario view <id>`): **Resolved** — explicit ID supported for scenario view/download.
- **C** (agent-assisted generation in Modal): **Still open** — blocks CLI injection of Quality findings into scenario gen only; plain `scenario generate` path is unaffected.

Slices 49–50 may proceed on Gap A/B resolution; slice 52 cross-read for scenario_gen uses Gap B. Gap C limits UI-only Quality context panel (slice 52 Scenario 3).

**ID carry-forward (MUST — slices 47–51)**: `run_tessl()` maintains in-process `_TesslIdContext`; each downstream row stamps `upstream_run_ids` from ctx before invoke and `tessl_run_id` after success. Lint excluded. Full contract: design doc § ID carry-forward contract.

See `docs/design/tessl-5-row-expansion.md § Open Questions`.

**PARKED**: retry invocation mechanism (single-row vs. full-scan) — schema is designed to support either; product decision deferred.

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 45 | [slice-45-schema-migration](slices/12-L-tessl-5-row-expansion/slice-45-schema-migration.md) | DB Schema Migration (12-state enum + 4 new columns) | Must | ✅ | 44 | [#103](https://github.com/neomatrix369/tripwire/pull/103) | ~3 min |
| 46 | [slice-46-lint-adapter](slices/12-L-tessl-5-row-expansion/slice-46-lint-adapter.md) | Tessl: Lint Adapter (Row 1) | Must | ✅ | 45 | [#105](https://github.com/neomatrix369/tripwire/pull/105) | ~4 min |
| 47 | [slice-47-review-quality-split](slices/12-L-tessl-5-row-expansion/slice-47-review-quality-split.md) | Tessl: Review (Quality) Split + `tesslQuality` Scope Fix (Row 2) | Must | ✅ | 45, 46 | [#109](https://github.com/neomatrix369/tripwire/pull/109) | ~4 min |
| 48 | [slice-48-not-available-yet-ui](slices/12-L-tessl-5-row-expansion/slice-48-not-available-yet-ui.md) | "Not Available Yet" Placeholder Rows (Rows 3–5) | Must | 🔨 | 47 | — | ~3 min |
| 49 | [slice-49-scenario-generation](slices/12-L-tessl-5-row-expansion/slice-49-scenario-generation.md) | Tessl: Scenario Generation + Resume Checkpoint (Row 3) | Should | ✅ | 47, 48 | [#112](https://github.com/neomatrix369/tripwire/pull/112) | ~6 min |
| 50 | [slice-50-eval-auto-chain](slices/12-L-tessl-5-row-expansion/slice-50-eval-auto-chain.md) | Tessl: Eval + Scenario→Eval Auto-Chain (Row 4) | Should | ✅ | 49 | [#113](https://github.com/neomatrix369/tripwire/pull/113) | ~5 min |
| 51 | [slice-51-review-security](slices/12-L-tessl-5-row-expansion/slice-51-review-security.md) | Tessl: Review (Security) Adapter (Row 5) | Could | 🔀 | 47 | — | ~3 min |
| 52 | [slice-52-id-lineage-wiring](slices/12-L-tessl-5-row-expansion/slice-52-id-lineage-wiring.md) | ID Lineage Cross-Reads + UI Side-by-Side Findings | Could | 📋 | 49, 50, 51; Gap C UI-only | — | ~5 min |

## Wave 13-M — LLM usage / cost observability

**Group letter M** (next after L). Folder: [`slices/13-M-llm-usage-tracking/`](slices/13-M-llm-usage-tracking/).  
Design: [`docs/design/llm-usage-tracking.md`](../design/llm-usage-tracking.md).  
**Follow-on to ADR-0016** (tiered router) — not a Tessl (L), dashboard-quality (J), or ATDD (G) pile-on.

| Candidate home | Fit | Why rejected / accepted |
|----------------|-----|-------------------------|
| **M (this wave)** | ✅ | New cross-stack capability: schema + router metering + Usage tab + cost tips (+ Phase 2 sandbox) |
| J — Dashboard data quality | ❌ | J is closed ✅ on A1–A13 *correctness*; usage/cost is new behaviour, not fixing wrong card data |
| L — Tessl 5-row | ❌ | Only Phase 2 emits Tessl opaque events; core is SIE/Model Studio router |
| G — ATDD closure | ❌ | Parked contract gaps (18–22); not a feature wave |
| K — Docs UX | ❌ | Docs are a side effect of the feature PR, not the slice purpose |

Meter router (SIE + Model Studio) accurately; Phase 2 best-effort Cisco LLM + Tessl SaaS events; Usage tab + cost tips. **Plan captured + EFP-processed 2026-08-25 — build only when slice 53 is explicitly started.**

**Model / harness:** inherits TRAIL Original Material (`gpt-5.6-sol` planning / `gpt-5.6-terra` execution) + existing `<!-- harness-scout` embed. Profile: ambiguity=low · blast_radius=high · time_box=Phase1 ≤2h · interactive.

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 53 | [slice-53-llm-usage-tracking](slices/13-M-llm-usage-tracking/slice-53-llm-usage-tracking.md) | LLM Usage Tracking + UI Cost Surfacing | Should | 📋 | — (ADR-0016 complements) | — | ~6 min |

## Supporting Artifacts
| File | Status |
|------|--------|
| [README.md](README.md) | ✅ wave folder map (`01-A-…` … `13-M-llm-usage-tracking/`) |
| `01-A-…` … `13-M-…/` | ✅ slice stubs by execution wave |
| interview_summary.md | ✅ written |
| PROGRESS.md | ✅ written |
| DECISIONS.md | ✅ in progress |
| **[GATE_CONTRACT.md](GATE_CONTRACT.md)** | ✅ SSOT — closing rule + check quality bar |
| coverage-audit.md | ✅ written — slice 7 |
| GAP_ANALYSIS.md | pending |
| HANDOFF.md | pending — `/memory-distiller` at session end |
| gate-evidence/ | ✅ passed slices, including Slice 17 |

**Close rule:** ✅ PASSED only when every Before/After check is met (or DECISIONS-waived), evidence JSON `verdict: PASS`, review done, trackers updated. See GATE_CONTRACT.md.

## Execute priority (by wave — 2026-08-15)

1. Waves **A–C**, Slice 14, and Slice 17 are merged and closed
2. Wave **G** closes the acceptance-review findings through independent gates: 18, 19, 20, 21, 22. Prefer one active slice per shared code area to avoid edit conflicts.
3. Slice 18 is the first pending work. Wave F slices 15 and 16 remain 📦 closed; reinstate either explicitly only for a future live/demo release.
4. **2026-08-15 addendum:** Wave **H** (Claude Code Agent Guard integration, hackathon) is the active stream on `tripwire-frontline-hack`. It shares `cli/bin/tripwire.js` with slice 18 — slice 18 must not start while H's `setup-agent-hooks` work is open (see the Wave H sequencing note).
1. Waves **A–C**, Slice 14, and Slice 17 are merged and closed. Wave F (15–16) remains 📦 closed.
2. **Active Frontline branch:** Wave **H** Musts **23 → 32** (phase-gated H1→H2→H3). Human test after 25 and 30; **HARD GATE** at 32 before any Should 33+.
3. Wave **H** Should 33–38 after 32 PASS (35 stays 🔴 until Ossprey access in DECISIONS). Slice 39 stays 📦 unless pulled in.
4. Wave **G** (18–22) remains 📋 — do **not** start while H1–H3 is active unless explicitly resumed. Prefer one active slice per shared code area.

## Wave G source-finding map

Source: ATDD safety review, 2026-08-07. Each finding must be closed by the mapped slice's GWTs and gate evidence.

| Finding | Value at risk | Closing slice and scenarios |
|---|---|---|
| R1 | Schema/auth failures must not start a scan | 18.1 |
| R2 | Batch outcomes must identify success and failure honestly | 18.3–18.5 |
| R3 | Persisted scan state must be coherent and idempotent | 19.1–19.5 |
| R4 | Scanner subprocess evidence must fail closed | 20.1–20.4 |
| R5 | Each dashboard card must show its newest scan | 21.1–21.2 |
| R6 | Live dashboard status must recover honestly | 22.1–22.7 |

See also PROGRESS.md **Slice groups** and [GATE_CONTRACT.md](GATE_CONTRACT.md).

## Forward (Won't for A — ask 1+C later)
- Drift / trend / diff / `identifier` UI
- Phase 4 Agent Guard — **superseded for Frontline by Wave H** (Claude Code hooks + `/tw-*`); Horizon A ship-path still excludes guard coverage bar until H lands
- Phase 5 Reconciler / Overmind
- Dashboard redesign / blast-radius / `--from-instructions` — **visual chrome tokens** reopened as slice 43 (not a product redesign)
- `support.js` / Mock chrome 95% coverage
- Live Modal/Supabase E2E as CI Must (stay slow/optional)
- **Demo/hackathon:** VO/Remotion (slice 4), film-day claim remediations (slice 16) — reinstate only if a new demo need arises
- **2026-08-15 amendment:** the "Phase 4 Agent Guard" line above is amended by [ADR-0017](../adr/0017-claude-code-agent-guard-integration.md) — Guard PreToolUse enforcement is reopened as Wave H; Drift/trend, Reconciler/Overmind and the other exclusions remain Won't (A)
- **Demo/hackathon (Horizon A film):** VO/Remotion (slice 4), film-day claim remediations (slice 16) — reinstate only if a new demo need arises
- **Frontline FE/BE:** slice 39 Could/deferred — pull in only after full-chain (38)
