# Slice 31: Demo Artifacts

> Scenario: Brownfield | MoSCoW: Must | Depends on: 25, 28, 29

## Outcome

Safe, amber, and vuln skill+tool demo artifacts exist and are usable as concrete inputs to `/tw-verify` and `/tw-scan` for live demos and regression.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Demo inventory present**
   - Given the repo install layout, when listing demo artifacts, then safe/amber/vuln skill demos and safe/amber/vuln tool demos are present at documented paths/names.
2. **Verify accepts demos**
   - Given demo names, when `/tw-verify` runs against them, then each resolves and appears in the one-pass table (not-found only if intentionally omitted from install).
3. **Scan accepts demos**
   - Given demo names, when `/tw-scan` runs against them, then submit confirmation returns for each resolved demo.

## Design / test treatment

- Demos are fixtures for H1/H2 validation — keep them obviously labelled and non-destructive.
- Align names with main_prompt examples where practical (`safe-*`, `amber-*`, `vuln-*`).
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slices 25, 28, and 29 gate-evidence `verdict` are `PASS`
- [ ] Branch `slice/31-demo-artifacts` created from current `main`
- [ ] Target demo name list recorded in evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add presence + verify/scan-input GWTs for demo names.
GREEN: add only the demo skill/tool fixtures needed to pass.
REFACTOR: keep demos isolated from production `/tw-*` control skills.

## After-Checks [GATE]

- [ ] Safe/amber/vuln skill+tool demos exist at documented paths
- [ ] `/tw-verify` and `/tw-scan` accept demo names (observable table / submit confirmation)
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target (or N/A with reason if fixture-only)
- [ ] Complexity policy: **enforcing** for product-code; N/A for docs/fixture-only with reason in evidence
- [ ] `docs/plan/gate-evidence/slice-31.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 31 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | Demo names/paths documented for operators and hackathon demos |
| 2 | Explicitly usable as `/tw-verify` and `/tw-scan` inputs |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
