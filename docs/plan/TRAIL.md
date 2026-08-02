# Trail
> ~8 min read

## Original Material
- **Brief**: Horizon A — gap-close Saturday 3-lite + demo video (Detection + Sandbox). Operator reports capture-ready; formalize GWT evidence, dress-rehearsal, VO/Remotion. Expand to 1+C later. **Wave +coverage**: ship-path ~95% (cli + sandbox + Live ACL); slices 7–14.
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


## Slices
| # | File | Name | MoSCoW | Status | Depends on | Issue | Read time |
|---|------|------|--------|--------|------------|-------|-----------|
| 1 | [slice-1-walking-skeleton-live-path](slice-1-walking-skeleton-live-path.md) | Walking Skeleton — Live Demo Path | Must | ✅ | none | #14 | ~5 min |
| 2 | [slice-2-gwt1-detection-acceptance](slice-2-gwt1-detection-acceptance.md) | GWT-1 Detection Acceptance | Must | ✅ | 1 | #15 | ~4 min |
| 3 | [slice-3-gwt2-sandbox-evidence-acceptance](slice-3-gwt2-sandbox-evidence-acceptance.md) | GWT-2 Sandbox Evidence Acceptance | Must | ✅ | 1 | #16 | ~4 min |
| 4 | [slice-4-vo-remotion-assemble](slice-4-vo-remotion-assemble.md) | VO + Remotion Assemble (GWT-3) | Could | 🔴 | 2,3 | #17 | ~4 min |
| 5 | [slice-5-gate-evidence-docs-sync](slice-5-gate-evidence-docs-sync.md) | Gate Evidence + Docs Sync | Should | ✅ | 1,2,3,4 | #19 | ~3 min |
| 6 | [slice-6-orchestrator-characterization](slice-6-orchestrator-characterization.md) | Orchestrator / Modal Characterization | Could | ✅ | none | #18 | ~3 min |
| 7 | [slice-7-coverage-audit-matrix](slice-7-coverage-audit-matrix.md) | Coverage Audit Matrix + Docs Parity | Must | 🔀 | none | #26 | ~4 min |
| 8 | [slice-8-scanner-skill-parse-fixtures](slice-8-scanner-skill-parse-fixtures.md) | Scanner Skill Parse Fixtures (Delta) | Must | 📋 | 7 | — | ~4 min |
| 9 | [slice-9-scanner-snyk-tessl-parse-fixtures](slice-9-scanner-snyk-tessl-parse-fixtures.md) | Snyk / Tessl Parse Fixtures (Delta) | Should | 📋 | 7 | — | ~4 min |
| 10 | [slice-10-scan-item-inner-characterization](slice-10-scan-item-inner-characterization.md) | scan_item_inner Characterization (Delta) | Should | 📋 | 7 | — | ~4 min |
| 11 | [slice-11-python-ship-path-coverage-95](slice-11-python-ship-path-coverage-95.md) | Python Ship-Path Coverage ≥95% | Must | 📋 | 8 (9,10 Should) | — | ~5 min |
| 12 | [slice-12-cli-coverage-gate-95](slice-12-cli-coverage-gate-95.md) | CLI Coverage Gate ≥95% (Delta) | Must | 📋 | 6 | — | ~4 min |
| 13 | [slice-13-live-acl-coverage-gate-95](slice-13-live-acl-coverage-gate-95.md) | Live ACL Coverage Gate ≥95% (Delta) | Must | 📋 | 2,3 | — | ~4 min |
| 14 | [slice-14-coverage-status-docs-sync](slice-14-coverage-status-docs-sync.md) | Coverage Status + Docs Sync (Delta) | Should | 📋 | 11,12,13 | — | ~3 min |
| 15 | [slice-15-horizon-a-claim-audit](slice-15-horizon-a-claim-audit.md) | Horizon A Factual Claim Audit | Should | 📋 | 7 | — | ~4 min |
| 16 | [slice-16-docs-claim-remediations](slice-16-docs-claim-remediations.md) | Docs Claim Remediations (Realtime/Demo/Prototype) | Could | 📋 | 15 | — | ~3 min |

**Status legend**: `📋 PLANNED · 🔨 IN PROGRESS · ✅ PASSED · 🔀 ON BRANCH · 🔴 BLOCKED · 📦 DEFERRED`

## Supporting Artifacts
| File | Status |
|------|--------|
| interview_summary.md | ✅ written |
| PROGRESS.md | ✅ written |
| DECISIONS.md | ✅ in progress |
| coverage-audit.md | ✅ written — slice 7 |
| GAP_ANALYSIS.md | pending |
| HANDOFF.md | pending — `/memory-distiller` at session end |
| gate-evidence/ | ✅ slices 1–6; 7–14 at each PASS |

## Execute priority (MoSCoW — 2026-08-02)

1. **Must:** 7 (in flight) → 8 → 11 → 12 → 13
2. **Should:** 9 → 10 → 14 → 15
3. **Could (demo/hackathon / polish):** 4 (VO/Remotion, blocked), 16 (demo/prototype prose); 6 already ✅

Demo/hackathon deliverables are no longer on the critical path.

## Forward (Won't for A — ask 1+C later)
- Drift / trend / diff / `identifier` UI
- Phase 4 Agent Guard (also excluded from ship-path coverage bar)
- Phase 5 Reconciler / Overmind
- Dashboard redesign / blast-radius / `--from-instructions`
- `support.js` / Mock chrome 95% coverage
- Live Modal/Supabase E2E as CI Must (stay slow/optional)
