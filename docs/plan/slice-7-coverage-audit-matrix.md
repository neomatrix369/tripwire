# Slice 7: Coverage Audit Matrix + Docs Parity

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-7-coverage-audit-matrix
- Files: `docs/plan/coverage-audit.md`, `docs/plan/DECISIONS.md`, `docs/plan/TRAIL.md`
- Exit criteria: `coverage-audit.md` exists with ship-path behavior matrix + internal-docs↔docs parity deltas + altitude notes; no CI floor raise in this slice.
- Commit pattern: `docs(slice-7): coverage audit matrix and parity`

## Branch
`slice/7-coverage-audit-matrix`

## Context references (mandatory)
- Product SoT: `internal-docs/00_build/security-scanning-platform-spec.md`
- Build gates: `internal-docs/00_build/build-day-decisions.md`
- Adapter research: `internal-docs/00_build/research/scanner-output-adapters.md`
- Demo lens: `internal-docs/01_demo_video/00-tripwire-demo-script.md`
- Public pair: `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `docs/research/adapters/scanner-output-adapters.md`, `docs/plan/*`
- Non-SoT: do not use `internal-docs/02_prototypes/import-stash/` as truth

## Spec (GWT / User Story)
**Given** Horizon-A STATUS, slices 1–6 evidence, internal-docs SoT, and measured coverage (~47% Python; no Node gates)
**When** the coverage audit runs
**Then** `docs/plan/coverage-audit.md` lists each ship-path / Done-when / demo must-show capability as AT / unit / missing, records internal↔public parity deltas, and locks targets (ship-path ~95%; exclude guard/support.js)

## Out of scope (already exists)
- Re-running slice-5 gate-evidence backfill
- Raising `fail_under` or adding Node coverage tools (slices 11–13)

## Before-Checks [GATE]
- [ ] Branch created (`slice/7-coverage-audit-matrix`)
- [ ] Task file opened
- [ ] Context pack opened (internal-docs 00_build + demo script + docs/STATUS)
- [ ] Confirmed no prior `docs/plan/coverage-audit.md`

## TDD Execution
Docs-only. Matrix rows seeded from spec Done-when + build-day 3-lite + demo must-show + STATUS IMPLEMENTED.

## After-Checks [GATE]
- [ ] `docs/plan/coverage-audit.md` committed
- [ ] Specification coverage: every matrix row has AT/unit/missing label
- [ ] DECISIONS row for 95% / ship-path / Live E2E Won't-for-CI
- [ ] Acceptance criteria met
- [ ] Gate evidence `docs/plan/gate-evidence/slice-7.json` at PASS

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1–14 | Plan artifact + STATUS cross-links | N/A public README unless claims change |

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | — |
| Blockers encountered | — |
| Next-session notes | Execute slice 8 after PASS |
