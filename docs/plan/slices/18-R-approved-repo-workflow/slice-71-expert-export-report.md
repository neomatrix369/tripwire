# Slice 71: Expert View + Report Export

> Scenario: Brownfield | MoSCoW: **Should** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **68** (Simple view); benefits from **67**/**69**/**70** fields
> Trigger: Expert toggle + full report export including coverage and provenance
> Branch: `slice/71-expert-export-report`

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 68

## Context
- **Stage objective**: Expert view surfaces weakness/AI-sec IDs, numeric confidence, raw judge answers, provenance, scanner details, data-flow; Report step exports full report + scan coverage section; secrets remain masked unless revealed.
- **Depends on**: Slice 68 Simple UI; judge/fix/verify fields when present
- **Global invariants**: privacy — nothing uploaded; mask secrets by default

## Non-goals
- Charts as a Must (Could stretch inside this slice only if trivial)
- Gap scanners (72)

## Design Context
| Field | Value |
|---|---|
| Component library | Existing dc-dashboard |
| Accessibility target | WCAG AA |
| Responsive strategy | mobile-first |

## Output contract
- **Baseline**: Simple-only findings view; no one-button full export with coverage
- After: Expert toggle; Report summary (fixed / left / won't fix); copy/export includes evidence, verdicts, provenance, coverage ledger

## Slice Workflow Bundle
- Slice name: `slice-71-expert-export-report`
- Files: dashboard Expert/Report, export serializer (JSON/MD), tests
- Exit criteria: GWT-71.* green
- Commit pattern: `feat(slice-71): expert view and report export`

## Branch
`slice/71-expert-export-report`

## Spec (GWT / User Story)

### GWT-71.1 — Expert toggle
**Given** a finding with panel provenance
**When** Expert is enabled
**Then** raw judge answers, model IDs, confidence, weakness/AI-sec IDs, scanner details are visible

### GWT-71.2 — Report export
**Given** a finished triage session
**When** operator exports the report
**Then** export includes per-finding evidence, verdicts, fixes, verification, provenance
**And** scan coverage (repo/commit, targets, scanners, statuses, unsupported reasons)
**And** secrets remain masked unless explicitly revealed

### GWT-71.3 — Report headline
**Given** reviewed findings
**When** Report step opens
**Then** headline summarises fixed / left / won't fix with one primary export action

## Before-Checks [GATE]
- [ ] Branch created
- [ ] GWT RED tests

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage
- [ ] Complexity evidence recorded
- [ ] Doc Audit: STATUS Expert + export

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` (export data flow)
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (Wave R)
