# Slice 67: SIE Judge Panel + Final Judge

> Scenario: Brownfield | MoSCoW: **Must** | Status: ✅ PASSED
> Wave: R — Approved-repo security workflow
> Depends on: **66**; ADR-0016 SIE/escalation **unchanged** (inputs only)
> Trigger: Independent parallel judges + final verdict (TP / FP / needs review) with provenance
> Branch: `slice/67-sie-judge-panel-final` · merged `main` [#151](https://github.com/neomatrix369/tripwire/pull/151)

## Session bootstrap
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → ADR-0016 → `cli/src/router.js` / SIE client

## Context
- **Stage objective**: For every candidate with verified (or explicitly unverified) evidence, run ≥3 independent parallel SIE judge executions (**light → mid-size** generate models), then one **stronger final judge** that weighs reasons + existing analysis/escalation results and selects the most defensible verdict (true_positive / false_positive / needs_review); persist per-judge model, role, verdict, confidence, reason, raw response, prompt version, run ID, timestamp, plus **parent target identity** (`item_id`, target type/name when known).
- **Depends on**: Slice 66 evidence pipeline; existing `tripwire route` / SIE client (reuse — do not invent a second model integration)
- **Global invariants**: ADR-0016 behaviour unchanged; open-weight via Superlinked SIE only for judging; scanned content is data not instructions; model failures never silently become TP/FP
> Soft-amended 2026-09-20 (USER): explicit light/mid panel vs stronger final; persist parent target for Workflow rows.

## Non-goals
- Replacing or rewriting the tiered router (ADR-0016)
- Closed / proprietary generation models for the panel
- Dashboard stepper chrome (slice 68) beyond persisting fields the UI will read
- **Operator-facing Workflow narration** of panel progress / honest empty states — owned by **slice 75** (R-UX-1); this slice still must persist UI-consumable panel_run fields
- **LLM Fix propose** (stronger model for patch text) — owned by **slice 69** + labels in **74**; panel/final judging stay here

## Output contract
- **Baseline**: ADR-0016 writes `tiered_router` triage/escalation rows; no independent 3-judge panel + final verdict schema
- After: each candidate has panel judgements + final verdict ∈ {true_positive, false_positive, needs_review}; disagreements flagged; if judges disagree and final judge is unconfident → needs_review; timeouts/failures recorded
- **Role split (product)**: panel slots = light/mid (`gen-4b` and/or parallel same-model runs when inventory <3 distinct models); **final** = stronger generate alias (prefer `gen-27b` / last suitable in inventory) — weighs reasons, not vote count alone
- **UI handoff**: persisted `panel_run` (per-judge `role` ∈ {panel, final}, model/verdict/confidence/reason/status + `final_*` + parent `item_id` / finding id) must be readable by dashboard Workflow builders (slice 75 binds and narrates; this slice does not own chrome copy)

## Slice Workflow Bundle
- Slice name: `slice-67-sie-judge-panel-final`
- Files: judge orchestration (CLI), schema/persist, SIE client reuse, tests with mocked SIE
- Exit criteria: GWT-67.* green; model inventory performed before wiring (document available models/limits)
- Commit pattern: `feat(slice-67): SIE judge panel and final judge`

## Branch
`slice/67-sie-judge-panel-final`

## Spec (GWT / User Story)

### GWT-67.1 — Model discovery first
**Given** configured SIE access
**When** the judging pipeline is initialised
**Then** available models/capabilities/limits are discovered via the existing client
**And** if fewer than three suitable models exist, independent parallel executions of available model(s) are used and recorded explicitly

### GWT-67.2 — Parallel independent judges
**Given** a candidate finding with evidence + ADR-0016 analysis/escalation results
**When** the panel runs
**Then** ≥3 judge executions start concurrently
**And** no judge receives another judge’s answer
**And** each records model, verdict, confidence, reason, raw response, prompt version, run ID, timestamp

### GWT-67.3 — Final judge weighs reasons (stronger model)
**Given** all available panel judgements (including partial if some failed)
**When** the final judge runs
**Then** it uses the stronger generate model from inventory (prefer `gen-27b` / last suitable) with `role: final`
**And** it receives all judgements + analysis/escalation results
**And** the verdict weighs evidence/reasons, not simple majority alone
**And** disagreement + low final confidence → needs_review
**And** persisted `final_model` / `final_judge.model` are distinct fields the Workflow UI can label as “final (stronger)”

### GWT-67.4 — Failures are honest
**Given** 1 of 3 judges times out or errors
**When** the run continues
**Then** UI/API can express “2 of 3 judges answered”
**And** the missing judge is not treated as TP or FP

### GWT-67.5 — ADR-0016 unchanged
**Given** an existing `tripwire route` / auto-route path
**When** the panel is enabled
**Then** router triage/escalation logic and persistence rules from ADR-0016 still hold
**And** router outputs are inputs to the panel/final judge only

## Before-Checks [GATE]
- [x] Branch created (`slice/67-sie-judge-panel-final`)
- [x] SIE model inventory documented in DECISIONS or stub appendix
- [x] GWT RED tests with mocked SIE (`cli/test/judgePanel.test.js`)

## After-Checks [GATE]
- [x] Tests pass
- [x] Specification coverage: every GWT clause has ≥1 test
- [x] Complexity evidence recorded
- [x] Doc Audit: STATUS — panel vs ADR-0016 separation; open-weight constraint

### Closing Gates
- [x] `nw-at-completeness-check` — formal close after merge; gates satisfied on landing PR [#151](https://github.com/neomatrix369/tripwire/pull/151)
- [x] `nw-software-crafter-reviewer` — formal close after merge; gates satisfied on landing PR
- [x] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — formal close after merge; gates satisfied on landing PR
- [x] `nw-gate-evidence-validator` — formal close after merge; gates satisfied on landing PR (no `gate-evidence/slice-67-summary.json` on tree)
- [x] `/verify-slice` — COMPLETE (formal close after merge; gates satisfied on landing PR)

## Gate Status
✅ PASSED — 2026-09-20; landed `main` via [#151](https://github.com/neomatrix369/tripwire/pull/151) (`8d6fd9f`); formal close after merge; gates satisfied on landing PR

## Appendix — SIE model inventory (GWT-67.1)

Source: [`prototypes/sie-studio/models.json`](../../../../prototypes/sie-studio/models.json) (catalog fetched 2026-08-14; Superlinked Cloud). Also recorded in [DECISIONS.md](../../../DECISIONS.md) (2026-09-20 slice-67 row).

| Alias | Title | Kind | Upstream model | Role for panel |
|-------|-------|------|----------------|----------------|
| `gen-4b` | Qwen3.5-4B | generate | `Qwen/Qwen3.5-4B` | Fast generation lane; **default** (`generate_default`) |
| `gen-27b` | Qwen3.6-27B | generate | `Qwen/Qwen3.6-27B` | Higher-quality generation (costlier) |

**Suitable judge models:** the two **generate** aliases above (open-weight via SIE only). Encode/score catalog entries (`embed-4b`, `rerank-0.6b`, `rerank-4b`, `vl-rerank-2b`, `colqwen`) are **not** panel judges.

**Fewer than three models:** inventory has **2** generate models (<3). Per GWT-67.1, the panel uses independent **parallel same-model** executions (e.g. multiple concurrent `gen-4b` and/or `gen-27b` runs) so ≥3 judge executions still start without inventing a third distinct model ID. Record each execution’s model alias + run ID explicitly.
