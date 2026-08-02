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
| 2026-08-02 | moscow | Demo/hackathon demoted | Slice 4 VO/Remotion → Could; slice 16 demo prose → Could. Critical path = trust/coverage: Must 7→8→11→12→13; Should 9→10→14→15 |
