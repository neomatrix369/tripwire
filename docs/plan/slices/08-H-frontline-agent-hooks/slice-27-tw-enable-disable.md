# Slice 27: /tw-enable and /tw-disable

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26

## Outcome

`/tw-enable` and `/tw-disable` toggle only the `enable` flag in `~/.tripwire/config.json`. `/tw-scan` and `/tw-verify` continue to work when enforcement is disabled.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Enable sets flag true**
   - Given config with `enable=false`, when `/tw-enable` runs, then `~/.tripwire/config.json` has `enable=true` and other keys are unchanged.
2. **Disable sets flag false**
   - Given config with `enable=true`, when `/tw-disable` runs, then `enable=false` and other keys are unchanged.
3. **Verify/scan still work when disabled**
   - Given `enable=false`, when `/tw-verify` or `/tw-scan` is invoked for a resolvable name, then the skill still produces status/submit output (does not no-op solely because enforcement is off).

## Design / test treatment

- Skills write config only; they do not call Tripwire enforcement APIs for enable/disable.
- Preserve `scan_validity_days` and any future keys across toggles.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slice 26 gate-evidence `verdict` is `PASS`
- [ ] Branch `slice/27-tw-enable-disable` created from current `main`
- [ ] Skill install path / Claude skill layout for `/tw-*` noted in evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add GWTs for enable/disable config mutation and verify/scan-still-works.
GREEN: implement the two skills to toggle `enable` only.
REFACTOR: shared config read/write helper if needed; no enforcement logic in these skills.

## After-Checks [GATE]

- [ ] Enable/disable GWTs pass; only `enable` changes
- [ ] Verify/scan-still-works when disabled is asserted observably
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [ ] `docs/plan/gate-evidence/slice-27.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 27 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-enable` and `/tw-disable` documented as config toggles only |
| 2 | Note that `/tw-scan` and `/tw-verify` remain usable when disabled |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
