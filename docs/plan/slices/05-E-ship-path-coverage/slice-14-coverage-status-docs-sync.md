# Slice 14: Coverage Status + Docs Sync (Delta)

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-14-coverage-status-docs-sync
- Files: `docs/STATUS.md`, `docs/plan/PROGRESS.md`, `docs/plan/DECISIONS.md`, `docs/plan/coverage-audit.md`, `docs/plan/TRAIL.md`, `docs/plan/gate-evidence/slice-14.json` (final), `CONTRIBUTING.md` (coverage floors), optional `private source` (local)
- Exit criteria: STATUS VERIFIED cites new suites; coverage floors documented; no redo of slice-5 scope.
- Commit pattern: `docs(slice-14): sync status after coverage uplift`

## Branch
`slice/14-coverage-status-docs-sync`

## Context references (mandatory)
- Product SoT: `private source`
- Build gates: `private source`
- Adapter research sync if field names verified: `private source` ↔ `docs/research/adapters/`
- Evidence: `docs/STATUS.md`, `docs/plan/coverage-audit.md`

## Spec (GWT / User Story)
**Given** slices 11–13 PASSED with measured ≥95% ship-path gates, and this slice is executed immediately after them
**When** docs are synced
**Then** STATUS evidence labels cite the new suites/commands; CONTRIBUTING/CI comments state floors; build-day boxes stay honest

## Priority
- Close-path Must for project completion: slice-14 must be completed before slice-15 claim audit.

## Out of scope (already exists)
- Slice 5 gate-evidence backfill for slices 1–6
- Unblocking Remotion/slice 4 (📦 deferred — demo/hackathon closed)
- Overmind/Ossprey badge strip, Guard→Future in ARCHITECTURE, Nightly
  mutmut/Chalk non-gating one-liner — owned by **slice 7** Gate A (regression-
  check only here: grep still clean)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slices 11, 12, 13 ✅
- [ ] `coverage-audit.md` includes final numeric gates and branch/func/statement notes for all three layers

## TDD Execution
Docs-only.

## After-Checks [GATE]
- [ ] `docs/STATUS.md` has explicit coverage figures for all ship-path floors:
  - sandbox: `95.91%`
  - CLI: `99.75% lines/stmts, 100% funcs, 85% branch gate`
  - Live ACL: `98.48% lines`
- [ ] `docs/plan/coverage-audit.md` shows post-lift gate outcomes and metrics for all 3 layers with `slice11:95.91%`, `slice12:99.75% lines`, `slice13:98.48% lines`
- [ ] `docs/plan/TRAIL.md` and `docs/plan/PROGRESS.md` list slice 14 as active follow-on work, and both list slice 15 as dependent-on 14 (must close path)
- [ ] `docs/plan/DECISIONS.md` includes explicit review exception/waiver rows used by this execution
- [ ] `rg -i 'overmind|ossprey' README.md QUICKSTART.md CONTRIBUTING.md docs/STATUS.md` returns no matches (except approved historical references if any are documented in `TRAIL.md`)
- [ ] `rg "Nightly mutmut and Chalk" -n CONTRIBUTING.md` shows non-gating status (or equivalent explicit note)
- [ ] `docs/plan/gate-evidence/slice-14.json` has `"verdict": "PASS"` + exact commands + outputs in `commands[]` and `after_checks[]`
- [ ] `docs/plan/DECISIONS.md` records the slice-14 review disposition (docs-only exception or `/nw-review APPROVED`)
- [ ] Command 14.4 (`/nw-review`) command result recorded as `APPROVED`
- [ ] ✅ only after merge

## Execution Capture Template (command-ready)

- Set `status` to `PASS` and paste full stdout/stderr in the order below.
- Gate evidence file target: `docs/plan/gate-evidence/slice-14.json`

### Command 14.1 (term policy drift)
- command: `rg -i 'overmind|ossprey' README.md QUICKSTART.md CONTRIBUTING.md docs/STATUS.md`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste full command output>
- stderr: |
  <paste stderr output if any>

### Command 14.2 (Nightly mutmut / Chalk note)
- command: `rg "Nightly mutmut and Chalk" -n CONTRIBUTING.md`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste full command output>
- stderr: |
  <paste stderr output if any>

### Command 14.3 (Close-path dependency check)
- command: `rg -n "slice-14|slice-15|14 \\u2192 15|dependency" docs/plan/TRAIL.md docs/plan/PROGRESS.md`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste full command output>
- stderr: |
  <paste stderr output if any>

### Command 14.4 (`/nw-review` plan artifact)
- command: `/nw-review @nw-software-crafter task "docs/plan/slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync.md" step_id=14`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste full command output>
- stderr: |
  <paste stderr output if any>

## /nw-review (OpenAI `gpt-5.6-terra`, low effort)

### Verdict
`APPROVED`

### Findings

- praise: The slice lockstep with `coverage-audit.md`, `TRAIL.md`, and `PROGRESS.md` is clear; it explicitly constrains claim-audit dependencies before completion.
- praise: Hard checks are concrete and command-oriented, which matches `GATE_CONTRACT.md`.
- suggestion (non-blocking): keep branch/gate metric values in one canonical table (`coverage-audit.md`) and link that table directly from this slice to avoid metric drift.

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |

## Legacy draft carry-over notes

- `docs/plan/slices/05-E-ship-path-coverage/slice-14-coverage-status-docs-sync-onboarding-legacy.md` is the legacy draft retained for traceability and historical context.
