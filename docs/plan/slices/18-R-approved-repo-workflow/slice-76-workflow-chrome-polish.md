# Slice 76: Workflow Chrome Polish (Filter Density + Typography Sync)

> Scenario: Brownfield | MoSCoW: **Should** | Status: 🔀 ON BRANCH · VERIFIED · Gate 4 APPROVED
> Wave: R — Approved-repo security workflow
> Depends on: **75** (operator-visible pipeline); benefits from **73** (triage filters) + **74** (model labels)
> Trigger: USER HITL 2026-09-20 — authorize optional chrome polish deferred from slice 75 Non-goals / nw-UX-review FO
> Branch: `slice/76-workflow-chrome-polish`
> UI surface: **1A** — Workflow tab panels only (Dashboard inventory chrome unchanged except shared token reuse)
> Source: DECISIONS `nw-UX-review` optional slice 76; slice 75 Non-goals

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 75 contract → `Tripwire.dc.html` Workflow panels + `tripwire-triage.js`

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: Make Workflow tab chrome feel like one system — denser Triage filter toolbars with labelled groups, shared display/sans/mono typography across Run→Report panels, and plain-language Triage override buttons — without changing filter semantics or pipeline narration from slices 73–75.
- **Depends on**:
  - Slice 75: L→R narration, parent meta, multi-select, role model lines (must stay green)
  - Slice 73: type / quality / target / status filters (semantics unchanged; chrome only)
  - Slice 74: model hint lines (reuse meta token styling)
- **Global invariants**: → `docs/plan/invariants.md` (never colour-only; keyboard accessible; no fabricated judges)

## Non-goals
> Out of scope for this slice — do not implement here.
- Changing triage filter AND semantics, counts, or chip derivation (slice 73)
- New pipeline narration / judge honesty logic (slice 75)
- Persisting filters to localStorage
- Phone full-screen finding redesign
- Dashboard inventory toolbar redesign (may *reuse* chip tokens; do not restyle inventory IA)
- Turning `TRIPWIRE_JUDGE_PANEL` default on

## Output contract
> Observable shape of completion (shape only — not exact file paths).
- **Baseline**: Four Triage filter rows stack with generous vertical margin; Run/Triage/Investigate/Verify/Report headlines are ad-hoc mono inline styles while Fix alone uses display/sans/mono hierarchy; Triage override buttons show snake_case status ids (`to_fix` / `needs_review` / `dismissed`)
- After: (1) shared panel chrome classes (kicker / title / meta / body) applied across all six Workflow panels; (2) Triage filter rows use a compact shared toolbar class with visible group labels (Type / Quality / Target / Status); (3) override buttons use plain-language labels; (4) GWT-73.* and GWT-75.* remain green

## Design Context
| Field | Value |
|---|---|
| Component library | Existing dc-dashboard markup/CSS |
| Design system | Tripwire HUD tokens (`--font-display` / `--font-sans` / `--font-mono`) |
| Accessibility target | WCAG AA; never colour-only; keep `role="tablist"` + `aria-selected` |
| Responsive strategy | preserve Workflow tab; wrap toolbars; no new breakpoints required |
| Colour mode | preserve existing |

## Slice Workflow Bundle

```text
Slice: slice-76-workflow-chrome-polish — denser filters + typography sync across Workflow panels

Canonical context:
  - CLAUDE.md / AGENTS.md
  - docs/plan/TRAIL.md · PROGRESS.md · this stub

Files:
  - prototypes/dc-dashboard/Tripwire.dc.html  # shared chrome CSS + panel markup + plain-language buttons
  - prototypes/dc-dashboard/test/tripwire-chrome-polish.test.js  # GWT-76.* [new]
  - docs/STATUS.md · CHANGELOG.md  # Doc Audit

Exit criteria:
  [ ] GWT-76.1–76.4 green
  [ ] GWT-73.* + GWT-75.* regression green
  [ ] Doc Audit STATUS + CHANGELOG
  [ ] code review passed (Gate 4)
```

## Branch
`slice/76-workflow-chrome-polish`

## Spec (GWT / User Story)

### User story
As an operator, I want the Workflow tab filters and panel typography to feel compact and consistent left→right so I can scan Triage and move through Run→Report without chrome competing with content.

### GWT-76.1 — Shared panel typography tokens
**Given** Live/Mock dashboard Workflow tab
**When** HTML/CSS for Workflow panels is inspected
**Then** shared classes exist for panel kicker, title, meta, and body (display / sans / mono hierarchy)
**And** Run, Triage, Investigate, Fix, Verify, and Report panels each use those classes for their primary chrome (not only Fix)

### GWT-76.2 — Compact Triage filter toolbars
**Given** Triage step with type, quality, target, and status filters
**When** Triage renders
**Then** each filter row uses a shared compact toolbar class (tighter gap/margin than pre-76 `.tw-triage-tabs` spacing)
**And** filter semantics and counts remain unchanged (GWT-73.* still pass)

### GWT-76.3 — Filter group labels
**Given** Triage filter rows
**When** Triage renders
**Then** each tablist has a visible group label: Type, Quality, Target, Status
**And** labels are text (not colour-only) and associated with the tablist

### GWT-76.4 — Plain-language Triage override buttons
**Given** a finding row on Triage
**When** override buttons render
**Then** labels are plain language (“To fix”, “Needs review”, “Dismiss”) not snake_case status ids
**And** click handlers still set `to_fix` / `needs_review` / `dismissed`

## Before-Checks [GATE]
- [x] Branch `slice/76-workflow-chrome-polish` created
- [x] GWT RED tests for GWT-76.* exist and fail for the right reason
- [x] Depends-on: slice 75 on `main` (Workflow panels present)

## TDD Execution
1. RED — author `tripwire-chrome-polish.test.js` for GWT-76.1–76.4
2. GREEN — add shared CSS + markup updates in `Tripwire.dc.html`
3. REFACTOR — keep filter mapping helpers; no parallel style builders
4. Regression — run triage-filters + workflow / pipeline tests

## After-Checks [GATE]
- [x] GWT-76.* pass
- [x] Specification coverage for GWT-76.*
- [x] Complexity evidence recorded (reporting policy for dashboard HTML/CSS)
- [x] Doc Audit: STATUS + CHANGELOG chrome polish
- [x] GWT-73.* and GWT-75.* regression pass

### Closing Gates
- [x] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [x] `nw-software-crafter-reviewer` — APPROVED
- [x] `nw-acceptance-designer-reviewer` — APPROVED
- [x] `nw-solution-architect-reviewer` — APPROVED (ddd NOT_APPLICABLE)
- [x] `nw-gate-evidence-validator` — summary passed
- [x] `/verify-slice` — COMPLETE

## Gate Status
🔀 ON BRANCH — VERIFIED unit; Gate 4 APPROVED 2026-09-20; awaiting PR/merge for ✅ PASSED
