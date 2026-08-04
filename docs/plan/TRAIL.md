# Trail
> ~8 min read

## Original Material
- **Brief**: Horizon A — ship path + onboarding + coverage. GWT-1/2 evidence ✅. **Demo/hackathon wave closed 2026-08-02** (VO/Remotion + film-day prose deferred; reinstate if needed). **Wave +coverage**: ship-path ~95% (cli + sandbox + Live ACL); onboarding slice 17; slices 7–15.
- **Scenario**: Brownfield · Flow D · depth 5–8
Routing: Brownfield · Chosen: 2026-08-02 · Source: health-check-inferred
- **Canonical plan path**: `docs/plan/` (public). Product SoT remains gitignored private references — do not fork parallel plan trees. Enhanced-flow-planner context pack: private references + `01_demo_video/00-tripwire-demo-script.md` (not `02_prototypes/import-stash/`).
- **Model split** — Planning: gpt-5.6-sol (high) · Execution: gpt-5.6-terra (medium) · Design: N/A (UI frozen as-is)

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

### E — Ship-path coverage (next)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 8 | [slice-8-scanner-skill-parse-fixtures](slices/05-E-ship-path-coverage/slice-8-scanner-skill-parse-fixtures.md) | Scanner Skill Parse Fixtures (Delta) | Must | ✅ | 7 | — | ~4 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](slices/05-E-ship-path-coverage/slice-9-scanner-snyk-tessl-parse-fixtures.md) | Snyk / Tessl Parse Fixtures (Delta) | Should | 📦 closed (subsumed) | 11 | SUBSUMED by 11 | ~4 min |
| 10 | [slice-10-scan-item-inner-characterization](slices/05-E-ship-path-coverage/slice-10-scan-item-inner-characterization.md) | scan_item_inner Characterization (Delta) | Should | 📦 closed (subsumed) | 11 | SUBSUMED by 11 | ~4 min |
| 11 | [slice-11-python-ship-path-coverage-95](slices/05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md) | Python Ship-Path Coverage ≥95% | Must | ✅ | 8 (9,10 Should) | — | ~5 min |
| 12 | [slice-12-cli-coverage-gate-95](slices/05-E-ship-path-coverage/slice-12-cli-coverage-gate-95.md) | CLI Coverage Gate ≥95% (Delta) | Must | ✅ | 6 | — | ~4 min |
| 13 | [slice-13-live-acl-coverage-gate-95](slices/05-E-ship-path-coverage/slice-13-live-acl-coverage-gate-95.md) | Live ACL Coverage Gate ≥95% (Delta) | Must | ✅ | 2,3 | — | ~4 min |
| 14 | [slice-14-coverage-status-docs-sync](slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md) | Coverage Status + Docs Sync (Delta) | Must | ✅ | 11,12,13 | #39 | ~3 min |

### F — Claim audit (deferred)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 15 | [slice-15-horizon-a-claim-audit](slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md) | Horizon A Factual Claim Audit | Must | 📦 closed | 7,14 | — | ~4 min |
| 16 | [slice-16-docs-claim-remediations](slices/06-F-claim-audit/slice-16-docs-claim-remediations.md) | Docs Claim Remediations (Realtime/Demo/Prototype) | Won't (A) | 📦 closed | 15 | — | ~3 min |

## Supporting Artifacts
| File | Status |
|------|--------|
| [README.md](README.md) | ✅ wave folder map (`01-A-…` … `slices/06-F-claim-audit/`) |
| `01-A-…` … `06-F-…/` | ✅ slice stubs by execution wave |
| interview_summary.md | ✅ written |
| PROGRESS.md | ✅ written |
| DECISIONS.md | ✅ in progress |
| **[GATE_CONTRACT.md](GATE_CONTRACT.md)** | ✅ SSOT — closing rule + check quality bar |
| coverage-audit.md | ✅ written — slice 7 |
| GAP_ANALYSIS.md | pending |
| HANDOFF.md | pending — `/memory-distiller` at session end |
| gate-evidence/ | ✅ passed slices, including Slice 17 |

**Close rule:** ✅ PASSED only when every Before/After check is met (or DECISIONS-waived), evidence JSON `verdict: PASS`, review done, trackers updated. See GATE_CONTRACT.md.

## Execute priority (by wave — 2026-08-02)

1. Waves **A–C**, Slice 14, and Slice 17 are merged and closed
2. Phase 1b preserves the practical onboarding flow while making the Live-first setup, optional Mock preview, and Discover → Scan → Review journey immediately scannable
3. No pending slice remains. Wave F slices 15 and 16 are 📦 closed; reinstate either explicitly only for a future live/demo release.

See also PROGRESS.md **Slice groups** and [GATE_CONTRACT.md](GATE_CONTRACT.md).

## Forward (Won't for A — ask 1+C later)
- Drift / trend / diff / `identifier` UI
- Phase 4 Agent Guard (also excluded from ship-path coverage bar)
- Phase 5 Reconciler / Overmind
- Dashboard redesign / blast-radius / `--from-instructions`
- `support.js` / Mock chrome 95% coverage
- Live Modal/Supabase E2E as CI Must (stay slow/optional)
- **Demo/hackathon:** VO/Remotion (slice 4), film-day claim remediations (slice 16) — reinstate only if a new demo need arises
