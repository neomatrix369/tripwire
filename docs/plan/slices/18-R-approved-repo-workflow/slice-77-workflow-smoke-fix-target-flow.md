# Slice 77: Workflow Smoke Fixes + Target-Scoped Fix→Verify

> Scenario: Brownfield | MoSCoW: **Must** | Status: 🔨 IN PROGRESS
> Wave: R — Approved-repo security workflow
> Depends on: **75** (pipeline honesty); **69** (fix); **70** (verify); **76** (chrome)
> Trigger: USER 2026-09-21 — smoke FAIL/PARTIAL on Run CTA, Live counts, Verify honesty; require target-scoped single-item select + Fix→Verify
> Branch: `slice/77-workflow-smoke-fix-target-flow`
> UI surface: **1A** — Workflow tab only
> Source: Workflow L→R smoke matrix 2026-09-21

## Session bootstrap
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → invariants.md → this stub → `tripwire-workflow-pipeline.js` / `tripwire-verify-*.js` / `Tripwire.dc.html`

## Context
- **Stage objective**: Close smoke FAIL/PARTIAL on Run (CTA + process line), reconcile Triage/Fix/Report counts, make Workflow target-scoped (one skill/mcp/package at a time with single finding focus), and make Fix→Verify honest (no “Finding gone” without a real mark/apply path).
- **Depends on**: slices 69–70, 75–76 on `main`
- **Global invariants**: never colour-only; no fabricated judges; no findings ≠ safe; keyboard accessible

## Non-goals
- Turning `TRIPWIRE_JUDGE_PANEL` default on
- Real filesystem worktree apply outside memory verify port (dashboard stays in-browser)
- Dashboard inventory redesign
- Automating Playwright smoke suite

## Output contract
- After: (1) Run CTA visible when findings exist and no scanner is still running/queued; terminal statuses (`not_applicable`, `blocked`, …) count as finished; (2) Triage/Fix/Report share one deduped finding universe (stable id includes target); (3) operator focuses one target then one finding; (4) Verify does not claim “Finding gone” for heuristic patches until Mark fixed (or honest still_present / unable); (5) j/k navigates Fix candidates within focused target

## Slice Workflow Bundle

```text
Slice: slice-77-workflow-smoke-fix-target-flow

Files:
  - prototypes/dc-dashboard/tripwire-workflow-pipeline.js
  - prototypes/dc-dashboard/tripwire-workflow-prefs.js
  - prototypes/dc-dashboard/tripwire-verify-rescan.js
  - prototypes/dc-dashboard/tripwire-fix-controls.js
  - prototypes/dc-dashboard/Tripwire.dc.html
  - prototypes/dc-dashboard/test/tripwire-workflow-smoke-fix.test.js  # GWT-77.*
  - docs/STATUS.md · CHANGELOG.md · TRAIL · PROGRESS · DECISIONS

Exit criteria:
  [ ] GWT-77.1–77.6 green
  [ ] GWT-75.3 / 75.6 / 70.* regression green
  [ ] Doc Audit
```

## Branch
`slice/77-workflow-smoke-fix-target-flow`

## Spec (GWT / User Story)

### User story
As an operator, I want Run to advance when scanners are done, counts that match left→right, and a clear path: pick one skill/mcp/package → one finding → Fix → Verify, without false “fixed” claims.

### GWT-77.1 — Terminal scanner statuses finish Run
**Given** scanner rows include `not_applicable` / `blocked` / `completed` / `failed` and findings exist
**When** Run builds process line + primary CTA
**Then** process line does not say “Scanners running” solely because of terminal non-running statuses
**And** “Review findings” CTA is visible

### GWT-77.2 — Deduped shared finding universe
**Given** raw item findings that collide on title/evidence across targets or duplicate ids
**When** Workflow collects findings for Triage/Fix/Report
**Then** stable ids include target identity
**And** Report `left` count equals Triage universe size (same array after prefs overlay)

### GWT-77.3 — Target focus then single finding
**Given** Triage with multiple targets
**When** operator selects one target chip as focus
**Then** finding list is scoped to that skill/mcp/package
**And** selecting a finding is single-active (one primary selection) within that target

### GWT-77.4 — Fix j/k within target
**Given** Fix step with ≥2 fix candidates for the focused target
**When** j / k are pressed (not in reason input)
**Then** selection moves among those candidates only

### GWT-77.5 — Verify honesty before Mark fixed
**Given** a heuristic proposed patch and memory verify port
**When** Verify runs before Mark fixed
**Then** outcome is not `finding_gone` (still_present or unable_to_verify with honest reason)

### GWT-77.6 — Verify after Mark fixed
**Given** the same finding after Mark fixed
**When** Verify runs
**Then** outcome may be `finding_gone` with honesty line that approved repo is unchanged

## Before-Checks [GATE]
- [x] Branch created
- [x] GWT-77.* RED then GREEN
- [x] Depends-on 75/69/70 on main

## After-Checks [GATE]
- [x] GWT-77.* pass (unit) + Mock/Live browser smoke 2026-09-21
- [x] Doc Audit STATUS + CHANGELOG (+ README entry note)
- [x] Regression GWT-75.6 / pipeline suite (with smoke-fix tests)
- [ ] Formal close / PR merge (Gate 4) — pending
