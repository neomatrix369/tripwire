# Slice 74: Workflow Model Labels (Defaults + Actuals)

> Scenario: Brownfield | MoSCoW: **Should** | Status: 🔨 IN PROGRESS
> Wave: R — Approved-repo security workflow
> Depends on: **68** (stepper + panels); benefits from **67** (judge models) / **69** (fix propose)
> Trigger: Operator needs to see which models assess vulns / propose fixes — defaults on tabs, actuals in panels
> Branch: `slice/74-workflow-model-labels`
> UI surface: **1A** — extend Tripwire Live/Mock workflow chrome

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → `tripwire-workflow-stepper.js` + workflow panels in `Tripwire.dc.html`

## Context
- **Stage objective**: Annotate workflow stepper tabs with **configured default** model aliases for stages that use models; annotate Run / Triage / Investigate / Fix panels with **actual** models from judge slots, router envelope, or fix provenance when present.
- **Depends on**: Slice 68 stepper; router defaults `gen-4b` / `qwen3.8-max`; judge panel `gen-4b` / `gen-27b` (ADR-0016 + slice 67)
- **Global invariants**: never colour-only; do not invent model IDs; omit label when stage uses no model; Expert-only raw IDs stay Expert (this slice adds always-visible stage labels)

## Non-goals
- Changing which models the router/judge/fix pipelines call
- Persisting operator overrides of stage defaults
- Usage/cost metering (slice 53)

## Output contract
- **Baseline**: Stepper shows only Run/Triage/… labels; panels omit stage model lines (Expert Investigate may still list Model IDs inside how_we_decided)
- After: (1) steps with configured models show a text `modelHint` under the step label; (2) Run/Triage/Investigate/Fix panels show `modelsUsedLine` when actual model IDs are known for the active context; (3) Verify/Report stay blank unless actual models appear

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
**Then** Run shows default judge aliases `gen-4b · gen-27b`
**And** Triage shows default SIE alias `gen-4b`
**And** Investigate shows default router aliases `gen-4b · qwen3.8-max`
**And** Fix shows default fix alias `gen-27b`
**And** Verify and Report have empty `modelHint` (no model by default)

### GWT-74.2 — Actual models on Run panel
**Given** judge slots that record `modelId` / `model`
**When** Run progress view builds
**Then** `modelsUsedLine` lists the distinct actual model IDs used
**And** when no slot models exist, the line falls back to the Run default hint (or empty if defaults cleared)

### GWT-74.3 — Actual models on Investigate / Triage / Fix
**Given** a selected finding with router `models.sie` / `models.model_studio` and/or judge model IDs
**When** Investigate (and Triage when a finding is selected) render
**Then** `modelsUsedLine` shows those actual IDs (SIE/MS format when router fields present)
**Given** a proposed fix with `model` / `modelId` (or LLM `source`)
**When** Fix renders
**Then** `modelsUsedLine` names that model
**And** heuristic-only fixes show no inventeds model ID (empty or explicit non-model source label without fake alias)

### GWT-74.4 — No invented models
**Given** missing model fields
**When** labels render
**Then** no proprietary/closed model names are fabricated beyond the documented defaults SSOT
**And** colour is never the sole signal for model presence (text label required)

## Before-Checks [GATE]
- [x] Branch created
- [x] GWT RED tests for GWT-74.*

## After-Checks [GATE]
- [x] Tests pass
- [x] Specification coverage for GWT-74.*
- [ ] Complexity evidence recorded (reporting)
- [x] Doc Audit: STATUS + CHANGELOG model labels

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
🔨 IN PROGRESS — branch `slice/74-workflow-model-labels`
