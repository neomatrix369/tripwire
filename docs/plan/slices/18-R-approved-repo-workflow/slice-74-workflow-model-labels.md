# Slice 74: Workflow Model Labels (Defaults + Actuals)

> Scenario: Brownfield | MoSCoW: **Should** | Status: ✅ VERIFIED ON MAIN
> Wave: R — Approved-repo security workflow
> Depends on: **68** (stepper + panels); benefits from **67** (judge models) / **69** (fix propose)
> Trigger: Operator needs to see which models assess vulns / propose fixes — defaults on tabs, actuals in panels, **role + per-target** clarity
> Branch: `slice/74-workflow-model-labels`
> UI surface: **1A** — extend Tripwire Live/Mock workflow chrome
> Soft-amended 2026-09-20 (USER): role labels (panel light/mid · final stronger · fix stronger); Fix default `gen-27b` when LLM propose is product path; per-target (skill/mcp/package) model rows

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → `tripwire-workflow-stepper.js` + workflow panels in `Tripwire.dc.html`

## Context
- **Stage objective**: Annotate workflow stepper tabs with **configured default** model aliases **and roles** for stages that use models; annotate Run / Triage / Investigate / Fix panels with **actual** models from judge slots, final judge, router envelope, or fix provenance when present — including **which target** (skill / mcp_server / package / …) the models ran against.
- **Depends on**: Slice 68 stepper; router defaults `gen-4b` / `qwen3.8-max`; judge panel light/mid + final stronger (ADR-0016 + slice 67); fix propose stronger model (slice 69)
- **Global invariants**: never colour-only; do not invent model IDs; omit label when stage uses no model; Expert-only raw IDs stay Expert (this slice adds always-visible stage labels)

## Non-goals
- Changing which models the router/judge/fix pipelines call (orchestration stays 67/69/ADR-0016)
- Persisting operator overrides of stage defaults
- Usage/cost metering (slice 53)
- Multi-select / parent-meta layout chrome beyond labels (slice 75)

## Output contract
- **Baseline**: Stepper shows only Run/Triage/… labels; panels omit stage model lines (Expert Investigate may still list Model IDs inside how_we_decided)
- After: (1) steps with configured models show a text `modelHint` under the step label with **role-aware** copy; (2) Run/Triage/Investigate/Fix panels show `modelsUsedLine` when actual model IDs are known for the active context; (3) when a finding/target is in context, lines name **target type + name** alongside models; (4) Verify/Report stay blank unless actual models appear
- **Defaults SSOT (updated)**:

| Step | Default aliases | Role copy (hint) |
|------|-----------------|------------------|
| Run | `gen-4b` · `gen-27b` | panel (light/mid) · final (stronger) |
| Triage | `gen-4b` | SIE triage |
| Investigate | `gen-4b` · `qwen3.8-max` | SIE · Model Studio |
| Fix | `gen-27b` | propose (stronger) — only when LLM propose is the product path; empty if heuristic-only build |
| Verify / Report | _(empty)_ | — |

## Slice Workflow Bundle
- Slice name: `slice-74-workflow-model-labels`
- Files: `tripwire-workflow-models.js` (new), `tripwire-workflow-stepper.js`, `Tripwire.dc.html`, workflow tests, STATUS/CHANGELOG
- Exit criteria: GWT-74.* green
- Commit pattern: `feat(slice-74): workflow default and actual model labels`

## Branch
`slice/74-workflow-model-labels`

## Spec (GWT / User Story)

### GWT-74.1 — Default model hints on stepper tabs
**Given** the approved-repo workflow chrome
**When** the stepper renders
**Then** Run shows default judge aliases `gen-4b · gen-27b` (panel + final roles in hint or subtitle)
**And** Triage shows default SIE alias `gen-4b`
**And** Investigate shows default router aliases `gen-4b · qwen3.8-max`
**And** Fix shows default `gen-27b` when LLM propose is the configured product path
**And** Fix `modelHint` is empty only while the build is heuristic-only (no LLM propose) — do not advertise a model the panel will not call
**And** Verify and Report have empty `modelHint` (no model by default)

### GWT-74.2 — Actual models on Run panel (role-labelled)
**Given** judge slots that record `modelId` / `model` and final judge fields
**When** Run progress view builds
**Then** `modelsUsedLine` lists distinct actual model IDs
**And** panel slots are distinguishable from final (e.g. `panel: gen-4b · … · final: gen-27b`) when roles/fields exist
**And** when no slot models exist, the line falls back to the Run default hint (or empty if defaults cleared)

### GWT-74.3 — Actual models on Investigate / Triage / Fix + parent target
**Given** a selected finding with router `models.sie` / `models.model_studio` and/or judge model IDs
**When** Investigate (and Triage when a finding is selected) render
**Then** `modelsUsedLine` shows those actual IDs (SIE/MS format when router fields present)
**And** the line (or adjacent meta) includes parent target `itemType` + `itemName` / id (skill / mcp_server / package / …) — not model ids alone
**Given** a proposed fix with `model` / `modelId` (or LLM `source`)
**When** Fix renders
**Then** `modelsUsedLine` names that model (expected stronger: `gen-27b` when LLM propose ran)
**And** heuristic-only / provided fixes show no model line (empty — do not label heuristic as a model)

### GWT-74.4 — No invented models
**Given** missing model fields
**When** labels render
**Then** no proprietary/closed model names are fabricated beyond the documented defaults SSOT
**And** colour is never the sole signal for model presence (text label required)

### GWT-74.5 — Per-target model detail across steps
**Given** findings from more than one target type (e.g. skill + mcp_server + package)
**When** Run / Triage / Investigate show model lines for the active selection or multi-select set
**Then** each visible finding’s model summary can be tied to its parent target (type + name)
**And** Simple view keeps one short line; Expert may expand per-slot model + confidence

## Before-Checks [GATE]
- [x] Branch created
- [x] GWT RED tests for GWT-74.*

## After-Checks [GATE]
- [x] Tests pass
- [x] Specification coverage for GWT-74.*
- [ ] Complexity evidence recorded (reporting)
- [x] Doc Audit: STATUS + CHANGELOG model labels
- [x] Soft-amend GWT-74.1/74.3/74.5 tests (role + Fix default + per-target) — green on `main`

### Closing Gates
- [x] Soft-amend + specification coverage — GWT-74.* on `main`
- [ ] `nw-at-completeness-check` — formal Gate 4 (sibling close agents / follow-up)
- [ ] `nw-software-crafter-reviewer` — formal Gate 4
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — formal Gate 4
- [x] Unit evidence — `node --test test/tripwire-workflow-models.test.js` green on `main` (2026-09-20)
- [x] `/verify-slice` unit path — COMPLETE for GWT-74.* on `main`

## Gate Status
✅ VERIFIED (unit) ON MAIN — 2026-09-20 · soft-amend IMPLEMENTED · GWT-74.* green; formal Gate 4 reviewer ticks may still land via close agents — sync-docs does not invent APPROVED
