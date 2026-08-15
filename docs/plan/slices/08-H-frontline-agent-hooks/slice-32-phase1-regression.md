# Slice 32: Phase 1 Regression

> Scenario: Brownfield | MoSCoW: Must | Depends on: 23–31

## Outcome

A regression checklist/script proves the Phase 1 happy path: setup → enable → block unscanned → scan → verify table → disable bypass → self-check. This slice is a hard gate: Phase H4+ (Should slices 33+) must not start until this slice verdict is PASS.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Setup + enable path**
   - Given a clean fixture environment, when `tripwire setup-agent-hooks` then `/tw-enable` run, then hooks are installed and `enable=true`.
2. **Block unscanned when enabled**
   - Given an unscanned demo artifact and `enable=true`, when PreToolUse fires, then decision is `block`.
3. **Scan then verify table**
   - Given that artifact, when `/tw-scan` then `/tw-verify` run, then verify shows a non-unscanned state in the shared table.
4. **Disable bypass**
   - Given `enable=false` via `/tw-disable`, when the same PreToolUse fires, then decision is `approve`.
5. **Self-check closes the loop**
   - Given the five `/tw-*` skills installed, when `/tw-self-check` runs, then the table covers those skills without error.

## Design / test treatment

- Prefer one orchestrated regression script plus a human checklist for Claude Code session steps that cannot be fully automated.
- Do not start Should slices 33+ from this wave until gate-evidence `verdict: PASS`.
- **AT design required before IN PROGRESS** (≤7 acceptance tests / checklist items).

## Before-Checks [GATE]

- [ ] Slices 23–31 each have gate-evidence `verdict: PASS` (or DECISIONS waiver)
- [ ] Branch `slice/32-phase1-regression` created from current `main`
- [ ] Regression script/checklist path named in evidence (even if not yet implemented)
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add regression script/checklist assertions for the seven-step Phase 1 path.
GREEN: wire script + fill any gaps found without expanding Should scope.
REFACTOR: keep the checklist greppable and linked from TRAIL/PROGRESS.

## After-Checks [GATE]

- [ ] Regression path passes: setup → enable → block unscanned → scan → verify table → disable bypass → self-check
- [ ] Named regression command/checklist observations recorded in gate evidence with exit 0 / PASS notes
- [ ] Coverage/complexity: policy note recorded (enforcing for product-code touched; N/A with reason if script/docs-only)
- [ ] `docs/plan/gate-evidence/slice-32.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 32 ✅
- [ ] **HARD GATE:** Phase H4+ (Should slices 33+) must not start until this slice verdict is `PASS`

## Doc Audit

| # | Check |
|---|--------|
| 1 | Phase 1 regression checklist/script path documented |
| 2 | Hard gate vs slices 33+ stated in TRAIL/PROGRESS |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
