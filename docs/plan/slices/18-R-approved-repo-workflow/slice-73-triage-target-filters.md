# Slice 73: Triage Target Type + Per-Target Filters

> Scenario: Brownfield | MoSCoW: **Should** | Status: ✅ VERIFIED ON MAIN
> Wave: R — Approved-repo security workflow
> Depends on: **68** (Triage step + findings with itemId/itemName)
> Trigger: Operator needs inventory-style type/quality filters **and** per-target chips on Triage to pick issues for the right targets
> Branch: `slice/73-triage-target-filters`
> UI surface: **1A** — extend existing Tripwire Live/Mock dashboard Triage panel

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → `tripwire-triage.js` + Triage panel in `Tripwire.dc.html`

## Context
- **Stage objective**: On Triage, reuse the dashboard inventory filter buttons (All items / Skills / MCP Servers / Packages + quality tabs) **and** add per-target chips so the operator can narrow findings to the relevant target(s) before Fix.
- **Depends on**: Slice 68 triage view (`buildTriageView`, status tabs); findings already carry `itemId` / `itemName`
- **Global invariants**: never colour-only; no findings ≠ safe; keyboard accessible; filters do not drop coverage honesty strip

## Non-goals
- Changing Fix/Verify/Report step filters (may inherit later)
- Persisting target filters across sessions (localStorage optional follow-up)
- New target discovery / scan behaviour

## Output contract
- **Baseline**: Triage only has status tabs (All / To fix / Needs review / Dismissed); findings list does not surface target name or type/quality filters
- After: Triage shows (1) type tabs matching inventory, (2) quality tabs matching inventory, (3) per-target chips derived from findings in scope, (4) existing status tabs; filtered list shows target name; counts on status/target chips reflect active type/quality/target scope

## Slice Workflow Bundle
- Slice name: `slice-73-triage-target-filters`
- Files: `prototypes/dc-dashboard/tripwire-triage.js`, `Tripwire.dc.html`, triage tests, STATUS/CHANGELOG
- Exit criteria: GWT-73.* green
- Commit pattern: `feat(slice-73): triage type quality and target filters`

## Branch
`slice/73-triage-target-filters`

## Spec (GWT / User Story)

### GWT-73.1 — Type filters
**Given** findings from skills, MCP servers, and packages
**When** the operator selects Skills (or MCP Servers / Packages / All items) on Triage
**Then** only findings whose target type matches are listed
**And** status-tab counts reflect the type-filtered set

### GWT-73.2 — Quality filters
**Given** skill findings with mixed Tessl quality scores
**When** the operator selects a quality tab (High / Low / Unscored) on Triage
**Then** skill findings match the same quality rules as the inventory toolbar
**And** non-skill targets continue to pass through (same as inventory)

### GWT-73.3 — Per-target chips
**Given** findings from multiple targets within the active type/quality scope
**When** Triage renders
**Then** chips list All targets plus one chip per distinct target (label = name, count)
**And** selecting a chip shows only that target’s findings
**And** selecting All targets clears the target narrowing

### GWT-73.4 — Compose with status tabs
**Given** type, quality, and/or target filters active
**When** the operator also selects a status tab (To fix / Needs review / Dismissed)
**Then** all active filters compose (AND)
**And** finding rows show the target name so the operator can confirm scope

## Before-Checks [GATE]
- [x] Branch created
- [x] GWT RED tests for GWT-73.*

## After-Checks [GATE]
- [x] Tests pass
- [x] Specification coverage for GWT-73.*
- [ ] Complexity evidence recorded
- [x] Doc Audit: STATUS + CHANGELOG triage filters

### Closing Gates
- [x] Specification coverage — GWT-73.* unit tests on `main`
- [ ] `nw-at-completeness-check` — formal Gate 4 (sibling close agents / follow-up)
- [ ] `nw-software-crafter-reviewer` — formal Gate 4
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — formal Gate 4
- [x] Unit evidence — `node --test test/tripwire-triage-filters.test.js` green on `main` (2026-09-20)
- [x] `/verify-slice` unit path — COMPLETE for GWT-73.* on `main`

## Gate Status
✅ VERIFIED (unit) ON MAIN — 2026-09-20 · code + GWT-73.* green; formal Gate 4 reviewer ticks may still land via close agents — sync-docs does not invent APPROVED
