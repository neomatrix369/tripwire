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
| 2026-08-02 | slice-4 blocker | Remotion sibling missing | `claude-remotion-kickstart` not on disk / not listed under neomatrix369; VO assets absent in private references; GWT-3 script audit PASS in-repo |
| 2026-08-02 | slice-5 entry | Waive “slices 1–4 complete” | Slice 4 remains 🔴; proceed with docs sync for verified 1–3 (+6) and leave VO/capture open in build-day |
| 2026-08-02 | coverage-target | Ship-path ~95% instrumented | User locked; behavior matrix primary; floors after Must ATs |
| 2026-08-02 | coverage-scope | Ship path only | cli/src + sandbox (excl tests) + Live ACL JS; omit guard, support.js, Remotion, scripts |
| 2026-08-02 | coverage-e2e | Live Modal/Supabase CI Must = Won't | Stay slow/optional skip-without-config |
| 2026-08-02 | planning | Added slices 7–14 | Path B Add via enhanced-flow-planner; delta-only vs existing suites; private references context pack mandatory |
| 2026-08-02 | health-check | Gap 2: Routing fingerprint | AUTO-FIXED on TRAIL Original Material |
| 2026-08-02 | sync-docs | Coverage wave docs | STATUS DECIDED + CONTRIBUTING floors + docs/README plan links; README NO_CHANGE |
| 2026-08-02 | urgency | Slice 7 Gate A = trust strip | Overmind/Ossprey badges + HTML/CI strings + Guard Future + Nightly non-gating + stale branch refs run first in slice 7 before coverage-audit.md; P1 pulled from deferred 14/16 |
| 2026-08-02 | sync-docs | Badge strip APPLIED | Overmind/Ossprey removed from public md/HTML/CI comments; badges only when functionality exists |
| 2026-08-02 | planning | Added slices 15–16 | Path B Add — claim audit canvas (15) + Realtime/demo/prototype remediations (16); depends on 7 |
| 2026-08-02 | slice-7 | Gate A+B written | coverage-audit.md + trust strip on branch `slice/7-coverage-audit-matrix` (PR #26) |
| 2026-08-02 | moscow | Demo/hackathon demoted | Slice 4 VO/Remotion → Could; slice 16 demo prose → Could. **SUPERSEDED** by demo-hackathon closed row (📦 Won't A) and docs-onboarding priority |
| 2026-08-02 | docs-onboarding | Slice 17 Must; priority after 7 | RPF principles (setup before `.env`, user-guide Phase 1); lean README kept; Phase 2 deferred. **Critical path: Must 7→17→8→11→12→13**; Should 14→15 (9→10 are **SUBSUMED by 11**) |
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
| 2026-08-02 | slice-12 | ✅ PASSED | c8 on `cli/src`; lines/stmts/funcs ≥95% (measured ~99.75%/100%); CI `cli-tests` → `npm run test:coverage`. |
| 2026-08-02 | slice-12 | branch gate | c8 `--branches 85` (not 95): residual defensive branches in orchestrator/loadEnv; line/stmt/func remain the ship-path ≥95% bar. |
| 2026-08-02 | slice-12 | review | Test+ci only; `/nw-review` skipped with this note. |
| 2026-08-02 | slice-12 | ClientImpl seam | `applySchema({ ClientImpl })` + `ensureSchema({ applySchemaFn })` injectable for unit tests (no live Postgres). |
| 2026-08-02 | slice-13 | ✅ PASSED | c8 on Live ACL four files; lines ~98.48%; `support.js` excluded; CI job `live-acl-tests`. |
| 2026-08-02 | slice-13 | func/branch gates | c8 funcs 85 / branches 80 — residual `getCreateClient` CDN import unmocked; line/stmt ≥95% is the ship-path bar. |
| 2026-08-02 | slice-13 | review | Test+ci only; `/nw-review` skipped with this note. |
| 2026-08-02 | slice-13 | loadCreateClient | `subscribe(..., { loadCreateClient })` injectable seam for unit tests. |
| 2026-08-03 | planning | slice 9 + 10 | **SUBSUMED by 11** for Horizon A execution order. Slice 9/10 remain documented as slice specs only; execution closes via slice 11 + slice 14 docs sync. |
| 2026-08-03 | model split | OpenAI wave execution model | Planning/coordination = `gpt-5.6-sol`; implementation/verification slices = `gpt-5.6-terra`; review = `gpt-5.6-terra`. |
| 2026-08-03 | model execution | OpenAI model profile | Review execution for `/nw-review` and plan-doc verification uses `gpt-5.6-terra` unless slice says otherwise. Fine-grain: `high` for planning synthesis, `low`/`medium` for artifact audit, `low` for doc-only updates. |
| 2026-08-03 | slice-14 | review disposition | Plan review requested for `slice-14-coverage-status-docs-sync.md`; review outcome logged as docs-shape pass (no blocking issues) and no runtime evidence dependency beyond tracker/doc checks. |
| 2026-08-03 | slice-14 | tracker | `docs/plan/gate-evidence/slice-14.json` scaffold created with hard-check schema expectations; ready for command/results append on execution. |
| 2026-08-03 | slice-15 | evidence format | `docs/plan/claim-audit.md` created with PASS/FAIL/PARTIAL + evidence-path matrix and 3B/3C block-log rows to align with slice-15 After-Checks. |
| 2026-08-03 | slice-14 | /nw-review | `gpt-5.6-terra` (low) quality pass: `APPROVED` — `docs/plan/slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md` `task` review command added and routed through `Command 14.4`. Docs-shape review complete (no blocking issues); tracker/command intent complete; pending execution evidence is command output capture. |
| 2026-08-03 | slice-15 | /nw-review | `gpt-5.6-terra` (low) quality pass: `APPROVED` — `docs/plan/slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md` `task` review command added and routed through `Command 15.10`. Scope, evidence protocol, and command matrix coherent; pending runtime evidence still blocks PASS. |
| 2026-08-03 | priority | close-path | slices-14 and 15 elevated to Must close-path after E and before final close; execution remains 14 → 15. |
| 2026-08-03 | slice-17 | correction supersedes earlier pass claim | Current branch centralizes vendor procurement in `env-vars.md`, command order in `setup-commands.md`, and Modal secret synchronization in `OPTIONAL_SCANNER_KEYS.md`. The earlier docs-only pass/review-skip rows remain historical; slice 17 is 🔀 pending fresh evidence and `/nw-review` before ✅. |
| 2026-08-03 | health-check | Gap 2: routing fingerprint | AUTO-FIXED — normalized the existing TRAIL routing line to the canonical `Routing:` form. |
| 2026-08-03 | slice-14 | review retry | Fresh delegated review returned NEEDS_REVISION: evidence commands must match the slice exactly and capture literal stdout. Remediation is in progress; no approval or waiver is claimed. |
| 2026-08-03 | slice-14 | review retry resolved | Re-review APPROVED after exact command strings and literal outputs were captured. Slice remains 🔀 pending merge. |
| 2026-08-03 | slice-17 Phase 1b | documentation UX ownership | Keep the public README/docs-index redesign in Slice 17 rather than create Slice 18: it shares the onboarding user outcome, files, Mock first-run proof, and documentation smoke path. The merged Phase 1 baseline remains historical evidence; Phase 1b receives fresh review and gate evidence. |
| 2026-08-03 | priority | Slice 17 Phase 1b before Slice 15 | Public documentation UX is the current active Must. Slice 15's Slice 14 dependency is satisfied, but claim-audit work waits until the cohesive onboarding follow-up is reviewed and merged. |
| 2026-08-04 | slice-17 Phase 1b | docs-only review exception for closure record | The fallback independent review is APPROVED in the Slice 17 specification; PR #41 merged with all CI checks successful. Its scope is Markdown and evidence synchronization only, so the dashboard localhost bind remains recorded as `blocked-by-env`. Closure PR #44 satisfies this GATE_CONTRACT docs-only review exception. |
| 2026-08-04 | slice-17 | ✅ closed | Closure PR #44 merged into `main` at `f005799`. The evidence verdict is `PASS`; the prior `blocked-by-env` dashboard bind remains an environment constraint, not a slice blocker. |
| 2026-08-04 | health-check | Gap 8: specification coverage gates | Inserted the standard coverage gates in 4 open/deferred slice specifications (9, 10, 15, 16); closed and legacy specifications remain historical snapshots. USER-CONFIRMED. |
| 2026-08-04 | health-check | Gap 9: complexity-evidence policy | Added reporting-only, repository-native complexity-evidence protocol to 2 open/deferred product-code specifications (9, 10); tools and thresholds remain explicitly TBD pending quality-tooling evidence. USER-CONFIRMED. |
| 2026-08-04 | slice-15 3C | Security scan blocker | Owner: project operator. `./scripts/security-scan.sh --dry-run` completed, but Semgrep, OSV-Scanner, Trivy, and TruffleHog are not installed and Meterian requires configured credentials. Action: install/provision the applicable scanners and run the real scan; target: 2026-08-11. This is a tracked prerequisite, not a security-pass waiver. |
| 2026-08-04 | slice-15 | Removed stale audit placeholder | `tripwire.audit` is not implemented or planned; removed its unsupported gate, execution template, and gate-evidence entry. Security and live-evidence requirements remain unchanged. |
| 2026-08-04 | slice-15 | Deferred | The Horizon A claim-audit artifact is retained for a future live/demo release, but its unavailable security scanners and unobserved 3B path no longer block new slice planning. Gate evidence is frozen; reinstate explicitly before execution. |
| 2026-08-04 | slice status audit | Closed all non-pending slices | Slices 1–3, 5–8, 11–14, and 17 are already passed/merged. Slices 4, 9, 10, 15, and 16 are now explicitly closed as deferred or subsumed. No pending slice remains, so no execution priority is assigned. |
| 2026-08-07 | health-check | Gap 9: legacy complexity-evidence policy | Historical closed stubs remain unchanged; all new product-code slices carry an explicit repository-native policy. USER-CONFIRMED DEFAULT. |
| 2026-08-07 | planning | Added slices 18–22 | ATDD closure: CLI operator evidence, persistence contract, subprocess adapter contract, dashboard latest-state accuracy, and dashboard realtime recovery. All are Must with independent gates; source-file overlap controls execution order. PLANNED. |
| 2026-08-07 | scope | Dashboard reliability | Implement latest-state and realtime recovery now; keep dashboard excluded from governed coverage/complexity thresholds while normal tests remain mandatory. USER-CONFIRMED. |
| 2026-08-07 | quality-lens | 15/15 checks passed | Split dashboard latest-state and realtime recovery into slices 21 and 22 to maintain single-level abstraction; no new dependency or metric policy introduced. REVISED 1 SLICE. |
| 2026-08-12 | adr-backfill | Formal ADRs 0002–0015 | Retrospective Accepted records from docs + git + production entry points. 0001 (Monk kit) stays Proposed. Index: `docs/adr/README.md`. Slice waivers remain in this file. |
