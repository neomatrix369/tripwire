# Trail
> ~8 min read

## Original Material
- **Brief**: Horizon A — gap-close Saturday 3-lite + demo video (Detection + Sandbox). Operator reports capture-ready; formalize GWT evidence, dress-rehearsal, VO/Remotion. Expand to 1+C later.
- **Scenario**: Brownfield · Flow D · depth 5–8
- **Canonical plan path**: `docs/plan/` (public). Product SoT remains gitignored `internal-docs/00_build/` — do not fork parallel plan trees.
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


## Slices
| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](slice-1-walking-skeleton-live-path.md) | Walking Skeleton — Live Demo Path | Must | ✅ | none | #14 | ~5 min |
| 2 | [slice-2-gwt1-detection-acceptance](slice-2-gwt1-detection-acceptance.md) | GWT-1 Detection Acceptance | Must | ✅ | 1 | #15 | ~4 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](slice-3-gwt2-sandbox-evidence-acceptance.md) | GWT-2 Sandbox Evidence Acceptance | Must | ✅ | 1 | #16 | ~4 min |
| 4 | [slice-4-vo-remotion-assemble](slice-4-vo-remotion-assemble.md) | VO + Remotion Assemble (GWT-3) | Must | 🔴 | 2,3 | #17 | ~4 min |
| 5 | [slice-5-gate-evidence-docs-sync](slice-5-gate-evidence-docs-sync.md) | Gate Evidence + Docs Sync | Should | 📋 | 1,2,3,4 | — | ~3 min |
| 6 | [slice-6-orchestrator-characterization](slice-6-orchestrator-characterization.md) | Orchestrator / Modal Characterization | Could | 🔀 | none | — | ~3 min |

**Status legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 DEFERRED`

## Supporting Artifacts
| File | Status |
|------|--------|
| interview_summary.md | ✅ written |
| PROGRESS.md | ✅ written |
| DECISIONS.md | ✅ in progress |
| GAP_ANALYSIS.md | pending |
| HANDOFF.md | pending — `/memory-distiller` at session end |
| gate-evidence/ | pending at slice PASS |

## Forward (Won't for A — ask 1+C later)
- Drift / trend / diff / `identifier` UI
- Phase 4 Agent Guard
- Phase 5 Reconciler / Overmind
- Dashboard redesign / blast-radius / `--from-instructions`
