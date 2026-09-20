# Slice 75: Operator-Visible Pipeline (R-UX-1)

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **67** (panel fields); **68** (stepper panels); benefits from **74** (model labels)
> Trigger: USER 2026-09-20 — backend/CLI judging + honesty must not stay silent in Workflow UI
> Branch: `slice/75-operator-visible-pipeline`
> UI surface: **1A** — extend existing Workflow tab (Dashboard inventory stays separate)
> Source: DECISIONS `Wave R — operator-visible pipeline (R-UX-1)`

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slices 67/68 contracts → `tripwire-run-progress.js` / `tripwire-triage.js` / `tripwire-investigate.js` / `Tripwire.dc.html`

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: Make the Workflow UI **narrate and stay in sync** left→right (Run→Report): coverage ledger, evidence verify, SIE judge panel, stage progress/outcomes, and honest absent states — so text, workings, and functions feel like one guided system (clarity, simplicity, connection).
- **Depends on**:
  - Slice 67 (SIE judge panel): `cli/src/judgePanel.js` + persisted panel fields the UI can read
  - Slice 68 (stepper): Run/Triage/Investigate builders + Workflow tab chrome
  - Slice 74 (optional): model default/actual labels — reuse if present; do not block; **must not show false Fix model hints**
- **Global invariants**: → `docs/plan/invariants.md` (Wave R + never colour-only; no findings ≠ safe; scanned content untrusted)
> Soft-amended 2026-09-20 after nw Workflow UX review (PO + Architect + System-designer): absorb C1–C3 wiring + process CTA into this slice.

## Non-goals
> Out of scope for this slice — do not implement here.
- Changing ADR-0016 router triage/escalation logic
- Replacing judge panel algorithms or inventing closed models
- Turning `TRIPWIRE_JUDGE_PANEL=1` into default-on without a separate DECISIONS row / USER confirm (honest “panel off” copy is in scope; default flip is HITL)
- Charts, prior-run compare, snippet target discovery (Then-phase / other backlog)
- Fix/Verify/Report deep redesign (reuse existing step panels; only add narration hooks if fields already exist)
- Full Triage filter IA redesign / typography unification across all six panels — optional **slice 76** (HITL) if still needed after 75

## Output contract
> Observable shape of completion (shape only — not exact file paths).
- **Baseline**: Workflow Run/Triage/Investigate can show empty/placeholder judge slots and “judge panel pending” even when CLI panel/coverage/evidence ran (or when panel is opt-in off); `collectWorkflowJudges` may fabricate 3 pending slots; coverage strip may use item heuristics
- After: (1) Run shows per-scanner status + judge track with live/bound fields when present; (2) plain-language process line + one primary CTA when ready for next step; (3) “N of M judges answered”, disagreement, and final-judge verdict/reason when panel data exists; (4) Triage/Investigate show coverage honesty from ledger when present + evidence-verified status with correct cause; (5) when panel is off or data absent, UI states that explicitly and **does not fabricate pending judge slots**; (6) Investigate auto-selects first to-fix when entered from Triage without selection; (7) misattributed “judge panel pending” placeholders removed for non-judge fields

## Design Context
| Field | Value |
|---|---|
| Component library | Existing dc-dashboard markup/CSS |
| Design system | Tripwire HUD tokens |
| Accessibility target | WCAG AA; never colour-only |
| Responsive strategy | preserve Workflow tab; phone full-screen finding remains follow-on if still missing |
| Colour mode | preserve existing |
| Aesthetic register | utility / research-dashboard |
| UX north star | clarity · simplicity · connection (left→right sync) |

## Slice Workflow Bundle
- Slice name: `slice-75-operator-visible-pipeline`
- Files: `prototypes/dc-dashboard/tripwire-run-progress.js`, `tripwire-triage.js`, `tripwire-investigate.js`, `Tripwire.dc.html` (`collectWorkflowJudges` / `mapItemFindingToWorkflow` / `collectWorkflowCoverage` / `buildWorkflowView`), (+ Live bind helper if needed), tests, STATUS/CHANGELOG
- Exit criteria: GWT-75.* green; Doc Audit STATUS R-UX-1 closed
- Estimated Pomos: `2 (~50 min) [Walking Skeleton]` — UX review expanded scope; split 75a/75b before coding if still over
- Commit pattern: `feat(slice-75): operator-visible workflow pipeline`

## Branch
`slice/75-operator-visible-pipeline`

## Spec (GWT / User Story)

### User story
As an operator, I want the Workflow UI to explain what the scanners, evidence checks, and judges are doing (and what they decided) so I can trust outcomes without reading CLI logs.

### GWT-75.1 — Run narrates scanner + judge progress
**Given** a Workflow run with scanner rows and (when enabled) judge slots
**When** the Run step is active
**Then** each scanner action shows target, scanner, status, candidates, errors in plain language
**And** judge slots light up as results arrive with “N of M judges answered”
**And** a short process line states what is running / done / waiting

### GWT-75.2 — Final judge and disagreement are visible
**Given** panel judgements + a final judge result for a finding
**When** Run or Investigate renders that finding’s track
**Then** the UI shows the final verdict (true_positive / false_positive / needs_review)
**And** shows whether judges disagreed and that the final judge weighed reasons (not vote count alone)
**And** Simple view keeps jargon light; Expert may show models/confidence/raw

### GWT-75.3 — Honest absent / panel-off states
**Given** `TRIPWIRE_JUDGE_PANEL` is off, or panel fields are missing, or evidence/coverage rows are absent
**When** Workflow panels render
**Then** the UI states “Judge panel not run (opt-in off)” or “Pending / not available yet” as appropriate
**And** does **not** imply a successful silent judgement or a fully scanned repo
**And** does **not** fabricate three pending judge slots when panel data is absent (empty slots + honest copy instead)
**And** coverage honesty prefers CLI coverage ledger fields when present (not inventing from item-count heuristics alone)

### GWT-75.4 — Evidence verify + coverage on Triage/Investigate
**Given** findings enriched with evidence verification and a coverage ledger for the run
**When** Triage summary or Investigate detail opens
**Then** evidence verification status is shown (verified / unverified / not run) with plain wording
**And** Triage coverage section (or equivalent) remains visible and filterable from summary strip where already supported
**And** placeholders like “Not available yet (judge panel pending)” are **not** used for missing attack path, prerequisites, or evidence when the true cause is “field not provided by scanner” or “panel not run”

### GWT-75.5 — Live binding (not mock-only)
**Given** Live/Mock dashboard with Workflow tab
**When** Live data includes panel_run / coverage / evidence fields from CLI persistence
**Then** Run/Triage/Investigate builders receive those fields (not only fixture placeholders)
**And** characterisation tests cover both “data present” and “panel off / absent” paths

### GWT-75.6 — Process line + primary CTA (connection)
**Given** scanners have completed (or panel is off) and findings exist
**When** the Run step is shown
**Then** a process line summarises scanners / judges / what’s next in plain language
**And** one primary CTA advances to Triage (e.g. “Review findings”) — stepper alone is not the only affordance

### GWT-75.7 — Investigate connection from Triage
**Given** the operator opens Investigate with no finding selected and at least one to-fix finding exists
**When** Investigate renders
**Then** the first to-fix finding is selected automatically
**And** the empty “Select a finding from Triage” state only appears when no eligible findings exist

### GWT-75.8 — Model hints stay truthful
**Given** Fix propose is still heuristic (no LLM model id)
**When** the stepper and Fix panel render
**Then** Fix does not show a false default like `gen-27b`
**And** model lines only appear when STAGE_DEFAULT_MODELS / actual IDs say so (slice 74 policy)
## Before-Checks [GATE]
- [ ] Branch created (`slice/75-operator-visible-pipeline`)
- [ ] Soft amendments on slices 67/68 noted (UI narration owned here)
- [ ] GWT RED tests planned against run-progress / triage / investigate builders

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage: every GWT-75.* clause has ≥1 test
- [ ] Complexity evidence recorded (reporting or enforcing — repository-native)
- [ ] Doc Audit: STATUS — R-UX-1 closed; DECISIONS row APPLIED

### Closing Gates
- [ ] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [ ] `nw-software-crafter-reviewer` — code quality + TDD discipline review (slice close gate #9)
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — data flow review (Live → UI binding)
- [ ] `nw-gate-evidence-validator` — all 9 gate-evidence conditions pass
- [ ] `/verify-slice` — holistic evidence verdict COMPLETE (final closing gate)

## Gate Status
📋 PLANNED — 2026-09-20 (EFP Path B Add from R-UX-1)
