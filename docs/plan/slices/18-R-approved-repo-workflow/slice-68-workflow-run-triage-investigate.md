# Slice 68: Workflow Stepper Run → Triage → Investigate

> Scenario: Brownfield | MoSCoW: **Must** | Status: ✅ VERIFIED ON BRANCH
> Wave: R — Approved-repo security workflow
> Depends on: **67** (judged findings + coverage)
> Trigger: Guided UX — Run live progress, Triage summary/tabs, Investigate detail (Simple default)
> Branch: `slice/68-workflow-run-triage-investigate`
> UI surface: **1A** — extend existing Tripwire Live/Mock dashboard (`prototypes/dc-dashboard/`) — USER go-ahead 2026-09-20

## Session bootstrap
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → dc-dashboard patterns

## Context
- **Stage objective**: Add stepper **Run → Triage → Investigate** (Fix/Verify/Report may be stubs linking to later slices) on the existing dashboard; Simple view default; live scanner/judge progress; triage filters; investigate evidence + verdict line.
- **Depends on**: Slice 67 persisted judgements; Wave P inventory/coverage fields from 63/65
- **Global invariants**: never colour-only; no findings ≠ safe; keyboard accessible

## Non-goals
- Full Expert raw provenance (slice 71)
- Fix propose / verify worktree (69–70)
- Separate hackathon-only viewer (1B rejected for this wave)
- **Live binding + honest empty-state narration** for judge panel / coverage / evidence-verify outcomes when CLI ran silently or panel is opt-in off — owned by **slice 75** (R-UX-1). Slice 68 keeps builders + placeholders; 75 closes operator-visible honesty.

## Design Context
| Field | Value |
|---|---|
| Component library | Existing dc-dashboard markup/CSS |
| Design system | Tripwire HUD tokens already in dashboard |
| Accessibility target | WCAG AA |
| Responsive strategy | mobile-first; finding opens full-screen on phone |
| Colour mode | preserve existing dashboard |
| Aesthetic register | utility / research-dashboard |

## Output contract
- **Baseline**: dashboard shows cards/findings without Run→Triage→Investigate stepper
- After: stepper always visible; Run shows per-scanner status + finding track found→evidence→judges→final; Triage headline + tabs (To fix / Needs review / Dismissed); Investigate ordered sections per product spec

## Slice Workflow Bundle
- Slice name: `slice-68-workflow-run-triage-investigate`
- Files: `prototypes/dc-dashboard/` (or production dashboard path per STATUS), realtime bindings, tests
- Exit criteria: GWT-68.* green
- Commit pattern: `feat(slice-68): run triage investigate stepper`

## Branch
`slice/68-workflow-run-triage-investigate`

## Spec (GWT / User Story)

### GWT-68.1 — Stepper
**Given** an approved-repo workflow run
**When** the dashboard loads
**Then** stepper shows Run → Triage → Investigate → Fix → Verify → Report with current step highlighted (not colour alone)

### GWT-68.2 — Run live progress
**Given** scanners and judges in flight
**When** the Run step is active
**Then** each scanner action shows target, scanner, status, candidates, errors
**And** judges light up as results arrive; partial “N of 3 judges answered” is visible

### GWT-68.3 — Triage
**Given** a completed run
**When** Triage opens (auto after Run ends)
**Then** headline summarises to-fix / needs-review / dismissed
**And** summary strip filters work; tabs sort by severity; coverage honesty section lists discovered/scanned/failed/skipped

### GWT-68.4 — Investigate
**Given** one finding selected
**When** Investigate renders
**Then** order is: title/severity → highlighted evidence → source/sink (if any) → plain explanation → one-line verdict → attack path → prerequisites → evidence verification
**And** “How we decided” is collapsed by default

### GWT-68.5 — Simple view
**Given** default view
**When** Expert is off
**Then** jargon-heavy IDs/raw judges are hidden
**And** High/Medium/Low + agreement + essential evidence remain

### GWT-68.6 — Triage persistence hooks
**Given** stable finding identity (existing or slice-local contract)
**When** operator overrides/suppresses/sets status
**Then** decision is stored keyed by stable ID for cross-run retention (full controls may complete with 69)

## Before-Checks [GATE]
- [x] Branch created
- [x] UI 1A confirmed in DECISIONS
- [x] GWT RED / visual checks planned

## After-Checks [GATE]
- [x] Tests / dashboard characterisation pass
- [x] Specification coverage for GWT-68.*
- [ ] Complexity evidence recorded
- [x] Doc Audit: screenshots optional; STATUS workflow stepper

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
✅ VERIFIED ON BRANCH — modules + GWT-68.* on `slice/68-workflow-run-triage-investigate`; Closing Gates still open (not ✅ PASSED / merged)
