# Tripwire — Planning Decisions

| Date | Topic | Decision | Notes |
|------|-------|----------|-------|
| 2026-08-01 | routing | Brownfield / Flow D | Horizon A first; ask about 1+C after A |
| 2026-08-01 | horizon | A = 3-lite + demo video (2b) | GWT-1/2/3 accepted |
| 2026-08-01 | spec-level | Upgraded PRD→GWT for A | GWT-1 Detection, GWT-2 Sandbox, GWT-3 VO/Remotion |
| 2026-08-01 | frontend | Skip `/frontend-advisor` | Ship UI = `prototypes/dc-dashboard` as-is |
| 2026-08-01 | agent-config | Defaults | slice-execution, software-craft, test-writing-*, CLAUDE.md |
| 2026-08-01 | adversarial | none | No phantom scope |
| 2026-08-01 | scope-cut | No pre-committed drop | Re-ask if clock bites |
| 2026-08-01 | Divergence: canonical = **spec** | User said continue (no a/b/c); default + hybrid | Spec/GWT own Done-when; code = ship evidence today; stale build-day boxes sync when GWT verified; add GWT E2E tests in plan slices; VO lives in Remotion sibling |
| 2026-08-01 | CodeHealth | MEDIUM (churn hotspots) | No CodeHealth MCP; nw-hotspot: scan_app/scanners/dashboard/live/schema |
| 2026-08-01 | OpenRewrite | Skipped | No recipes for Node+Python Modal stack |
| 2026-08-01 | Characterization coverage | Proceed below 60% E2E | User confirmed; gaps → Must slices (GWT E2E, orchestrator/modal) |
| 2026-08-01 | Strangler+ACL | Confirmed for A | Live vs Mock; ACL=tripwire-live.js; kill=data-source dropdown; shadow/cut-over N/A for A |
| 2026-08-01 | quality-lens | 10/10 checks passed | user_action: confirmed (lens ok); Must slices retained; slice 4 shape unchanged |
| 2026-08-01 | adversarial-lens | Musts retained | User confirmed plan; no Must demoted; slice 4 kept as VO+Remotion assemble |
| 2026-08-01 | model-split | Planning: claude-opus-4-8 · Execution: claude-sonnet-5 | User M1 confirm as-is |
| 2026-08-01 | frontend-advisor | skip | Already decided — dc-dashboard as-is |
| 2026-08-01 | execution-strategy | /nw-execute sequential | User E1; no parallel 2∥3 |
| 2026-08-01 | cost-gate | /code-review ultra = n | Not confirmed y; default skip for A execute |
| 2026-08-01 | next-wave | A — /nw-execute slice 1 | User chose start now; ask 1+C after A completes |
| 2026-08-01 | nw-execute adapt | docs/plan slice-workflow | No `.nwave/config.yaml`/roadmap; execute TRAIL slices via slice stubs + TDD |
| 2026-08-02 | slice-4 blocker | Remotion sibling missing | `claude-remotion-kickstart` not on disk / not listed under neomatrix369; VO assets absent in internal-docs; GWT-3 script audit PASS in-repo |
| 2026-08-02 | slice-5 entry | Waive “slices 1–4 complete” | Slice 4 remains 🔴; proceed with docs sync for verified 1–3 (+6) and leave VO/capture open in build-day |
| 2026-08-02 | coverage-target | Ship-path ~95% instrumented | User locked; behavior matrix primary; floors after Must ATs |
| 2026-08-02 | coverage-scope | Ship path only | cli/src + sandbox (excl tests) + Live ACL JS; omit guard, support.js, Remotion, scripts |
| 2026-08-02 | coverage-e2e | Live Modal/Supabase CI Must = Won't | Stay slow/optional skip-without-config |
| 2026-08-02 | planning | Added slices 7–14 | Path B Add via enhanced-flow-planner; delta-only vs existing suites; internal-docs context pack mandatory |
| 2026-08-02 | health-check | Gap 2: Routing fingerprint | AUTO-FIXED on TRAIL Original Material |
| 2026-08-02 | sync-docs | Coverage wave docs | STATUS DECIDED + CONTRIBUTING floors + docs/README plan links; README NO_CHANGE |
| 2026-08-02 | urgency | Slice 7 Gate A = trust strip | Overmind/Ossprey badges + HTML/CI strings + Guard Future + Nightly non-gating + stale branch refs run first in slice 7 before coverage-audit.md; P1 pulled from deferred 14/16 |
| 2026-08-02 | sync-docs | Badge strip APPLIED | Overmind/Ossprey removed from public md/HTML/CI comments; badges only when functionality exists |
| 2026-08-02 | planning | Added slices 15–16 | Path B Add — claim audit canvas (15) + Realtime/demo/prototype remediations (16); depends on 7 |
| 2026-08-02 | slice-7 | Gate A+B written | coverage-audit.md + trust strip on branch `slice/7-coverage-audit-matrix` (PR #26) |
| 2026-08-02 | moscow | Demo/hackathon demoted | Slice 4 VO/Remotion → Could; slice 16 demo prose → Could. **SUPERSEDED** by demo-hackathon closed row (📦 Won't A) and docs-onboarding priority |
| 2026-08-02 | docs-onboarding | Slice 17 Must; priority after 7 | RPF principles (setup before `.env`, user-guide Phase 1); lean README kept; Phase 2 deferred. **Critical path: Must 7→17→8→11→12→13**; Should 9→10→14→15 (15 prefer after 17) |
| 2026-08-02 | priority | Reprioritise for slice 17 | PROGRESS Execution order + TRAIL table reorder: finish 7, then 17 before coverage wave; do not preempt open 🔨 on 7 |
| 2026-08-02 | demo-hackathon | Closed for Horizon A | Demo + hackathon over. **Slice 4** (VO/Remotion) and **slice 16** (film-day / demo prose remediations) → 📦 Won't (A); Remotion blocker closed. Reinstate stubs only if a new demo need arises. Operator Mock-select honesty stays in **slice 17**. Slice 15 claim audit may still note FAIL rows without requiring slice 16. |
| 2026-08-02 | gate-contract | Hard close + quality bar | SSOT: `docs/plan/GATE_CONTRACT.md`. ✅ PASSED only if all Before/After met (or DECISIONS-waived), evidence `verdict: PASS`, review, trackers, merged. Soft checks banned; open slices 8–15/17 After-Checks strengthened. `🔀` ≠ ✅. |
| 2026-08-02 | slice-7 | ✅ PASSED | After-Checks re-verified on `main` post PRs #26/#27; `gate-evidence/slice-7.json` → PASS. Next Must: **17**. |
| 2026-08-02 | slice-groups | Execution-wave grouping | TRAIL/PROGRESS group A→F by run order: A Live/GWT → B char+sync → C audit → D onboarding(17) → E coverage → F claims. Not numeric slice order. |
| 2026-08-02 | slice-layout | Group folders under docs/plan/ | Slices live in `01-A-…` … `06-F-…` by execution wave; trackers link into folders. |
| 2026-08-02 | refs | Path sync after layout | Trackers, STATUS, docs index, coverage-audit, gate-evidence `spec_path`, plan README, Cursor onboarding plan → wave folders. No `docs/plan/slice-N-*.md` at plan root. |
| 2026-08-02 | slice-17 | ✅ PASSED (docs-only) | Phase 1 user-guide (prereqs/supabase/modal/env-vars) + QUICKSTART/README/docs index/CONTRIBUTING wire. Review: docs-only exception (GATE_CONTRACT). Next Must: **8**. |
| 2026-08-02 | slice-17 | docs-only review skip | No `/nw-review` — documentation-only slice; GATE_CONTRACT exception recorded here. |
| 2026-08-02 | slice-8 | ✅ PASSED | Cisco skill parse fixtures (happy/malformed/severity/_safe_json); stub `_run`/`_which` only. Sandbox cov ~47%→58.2%. |
| 2026-08-02 | slice-8 | review | Test-only fixture delta — no production code change; `/nw-review` skipped with this note. |
| 2026-08-02 | slice-11 | waiver 9/10 | Before-Check “slices 8,9,10 ✅”: 9/10 remain Should; Snyk/Tessl/MCP/`scan_item_inner` coverage filled inside slice 11 tests instead of serial Should slices. |
| 2026-08-02 | slice-11 | ✅ PASSED | Sandbox ship-path ~58%→98%; `fail_under=95`; guard omitted from cov source; CI/quality-gates/pre-push updated. |
| 2026-08-02 | slice-11 | review | Coverage/test+config only; `/nw-review` skipped with this note. |
