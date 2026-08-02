# Trail
> ~8 min read

## Original Material
- **Brief**: Horizon A — ship path + onboarding + coverage. GWT-1/2 evidence ✅. **Demo/hackathon wave closed 2026-08-02** (VO/Remotion + film-day prose deferred; reinstate if needed). **Wave +coverage**: ship-path ~95% (cli + sandbox + Live ACL); onboarding slice 17; slices 7–15.
- **Scenario**: Brownfield · Flow D · depth 5–8
- **Routing:** Brownfield · Chosen: 2026-08-02 · Source: health-check-inferred
- **Canonical plan path**: `docs/plan/` (public). Product SoT remains gitignored `internal-docs/00_build/` — do not fork parallel plan trees. Enhanced-flow-planner context pack: `internal-docs/00_build/*` + `01_demo_video/00-tripwire-demo-script.md` (not `02_prototypes/import-stash/`).
- **Model split** — Planning: claude-opus-4-8 · Execution: claude-sonnet-5 · Design: N/A (UI frozen as-is)

<!-- harness-scout output -->
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
| 1 | [`01-A-live-path-gwt/`](01-A-live-path-gwt/) | **A — Live path + GWT** | 1 → 2 → 3 (4 attempted) | A done; 4 📦 |
| 2 | [`02-B-characterization-evidence/`](02-B-characterization-evidence/) | **B — Characterization + evidence sync** | 6 → 5 | ✅ |
| 3 | [`03-C-trust-coverage-audit/`](03-C-trust-coverage-audit/) | **C — Trust + coverage audit** | 7 | ✅ |
| 4 | [`04-D-operator-onboarding/`](04-D-operator-onboarding/) | **D — Operator onboarding** | **17** | 📋 **next** |
| 5 | [`05-E-ship-path-coverage/`](05-E-ship-path-coverage/) | **E — Ship-path coverage** | 8 → (9∥10) → 11 → 12 → 13 → 14 | 📋 |
| 6 | [`06-F-claim-audit/`](06-F-claim-audit/) | **F — Claim audit** | 15 (16 deferred) | 📋 / 📦 |

**Status legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 DEFERRED`

### A — Live path + GWT (executed 2026-08-01 → 08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](01-A-live-path-gwt/slice-1-walking-skeleton-live-path.md) | Walking Skeleton — Live Demo Path | Must | ✅ | none | #14 | ~5 min |
| 2 | [slice-2-gwt1-detection-acceptance](01-A-live-path-gwt/slice-2-gwt1-detection-acceptance.md) | GWT-1 Detection Acceptance | Must | ✅ | 1 | #15 | ~4 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](01-A-live-path-gwt/slice-3-gwt2-sandbox-evidence-acceptance.md) | GWT-2 Sandbox Evidence Acceptance | Must | ✅ | 1 | #16 | ~4 min |
| 4 | [slice-4-vo-remotion-assemble](01-A-live-path-gwt/slice-4-vo-remotion-assemble.md) | VO + Remotion Assemble (GWT-3) | Won't (A) | 📦 | 2,3 | #17 | ~4 min |

### B — Characterization + evidence sync (executed 2026-08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 6 | [slice-6-orchestrator-characterization](02-B-characterization-evidence/slice-6-orchestrator-characterization.md) | Orchestrator / Modal Characterization | Could | ✅ | none | #18 | ~3 min |
| 5 | [slice-5-gate-evidence-docs-sync](02-B-characterization-evidence/slice-5-gate-evidence-docs-sync.md) | Gate Evidence + Docs Sync | Should | ✅ | 1,2,3,4 | #19 | ~3 min |

### C — Trust + coverage audit (executed 2026-08-02)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 7 | [slice-7-coverage-audit-matrix](03-C-trust-coverage-audit/slice-7-coverage-audit-matrix.md) | Coverage Audit Matrix + Docs Parity | Must | ✅ | none | #26/#27 | ~4 min |

### D — Operator onboarding (next)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| **17** | [slice-17-user-guide-onboarding](04-D-operator-onboarding/slice-17-user-guide-onboarding.md) | User-Guide Onboarding (Prereqs + Env) | Must | 📋 | 7 | — | ~5 min |

### E — Ship-path coverage (after D)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 8 | [slice-8-scanner-skill-parse-fixtures](05-E-ship-path-coverage/slice-8-scanner-skill-parse-fixtures.md) | Scanner Skill Parse Fixtures (Delta) | Must | 📋 | 7 | — | ~4 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](05-E-ship-path-coverage/slice-9-scanner-snyk-tessl-parse-fixtures.md) | Snyk / Tessl Parse Fixtures (Delta) | Should | 📋 | 7 | — | ~4 min |
| 10 | [slice-10-scan-item-inner-characterization](05-E-ship-path-coverage/slice-10-scan-item-inner-characterization.md) | scan_item_inner Characterization (Delta) | Should | 📋 | 7 | — | ~4 min |
| 11 | [slice-11-python-ship-path-coverage-95](05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md) | Python Ship-Path Coverage ≥95% | Must | 📋 | 8 (9,10 Should) | — | ~5 min |
| 12 | [slice-12-cli-coverage-gate-95](05-E-ship-path-coverage/slice-12-cli-coverage-gate-95.md) | CLI Coverage Gate ≥95% (Delta) | Must | 📋 | 6 | — | ~4 min |
| 13 | [slice-13-live-acl-coverage-gate-95](05-E-ship-path-coverage/slice-13-live-acl-coverage-gate-95.md) | Live ACL Coverage Gate ≥95% (Delta) | Must | 📋 | 2,3 | — | ~4 min |
| 14 | [slice-14-coverage-status-docs-sync](05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md) | Coverage Status + Docs Sync (Delta) | Should | 📋 | 11,12,13 | — | ~3 min |

### F — Claim audit (after D; preferably after E Musts)

| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 15 | [slice-15-horizon-a-claim-audit](06-F-claim-audit/slice-15-horizon-a-claim-audit.md) | Horizon A Factual Claim Audit | Should | 📋 | 7 (prefer after 17) | — | ~4 min |
| 16 | [slice-16-docs-claim-remediations](06-F-claim-audit/slice-16-docs-claim-remediations.md) | Docs Claim Remediations (Realtime/Demo/Prototype) | Won't (A) | 📦 | 15 | — | ~3 min |

## Supporting Artifacts
| File | Status |
|------|--------|
| [README.md](README.md) | ✅ wave folder map (`01-A-…` … `06-F-claim-audit/`) |
| `01-A-…` … `06-F-…/` | ✅ slice stubs by execution wave |
| interview_summary.md | ✅ written |
| PROGRESS.md | ✅ written |
| DECISIONS.md | ✅ in progress |
| **[GATE_CONTRACT.md](GATE_CONTRACT.md)** | ✅ SSOT — closing rule + check quality bar |
| coverage-audit.md | ✅ written — slice 7 |
| GAP_ANALYSIS.md | pending |
| HANDOFF.md | pending — `/memory-distiller` at session end |
| gate-evidence/ | ✅ slices 1–6; 7–17 at each PASS |

**Close rule:** ✅ PASSED only when every Before/After check is met (or DECISIONS-waived), evidence JSON `verdict: PASS`, review done, trackers updated. See GATE_CONTRACT.md.

## Execute priority (by wave — 2026-08-02)

1. Waves **A–C** ✅ — Live/GWT, characterization/evidence, trust+audit
2. Wave **D** Must: **17** (onboarding) — **next**
3. Wave **E** Must: 8 → 11 → 12 → 13 · Should: 9 → 10 → 14
4. Wave **F** Should: 15 · 16 📦 (demo remediations deferred with 4)

See also PROGRESS.md **Slice groups** and [GATE_CONTRACT.md](GATE_CONTRACT.md).

## Forward (Won't for A — ask 1+C later)
- Drift / trend / diff / `identifier` UI
- Phase 4 Agent Guard (also excluded from ship-path coverage bar)
- Phase 5 Reconciler / Overmind
- Dashboard redesign / blast-radius / `--from-instructions`
- `support.js` / Mock chrome 95% coverage
- Live Modal/Supabase E2E as CI Must (stay slow/optional)
- **Demo/hackathon:** VO/Remotion (slice 4), film-day claim remediations (slice 16) — reinstate only if a new demo need arises
