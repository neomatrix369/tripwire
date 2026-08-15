# Slice 29: /tw-scan

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26

## Outcome

`/tw-scan` resolves multiple names like `/tw-verify`, accepts both `--force` and `force` to resubmit over a valid non-stale result, submits via the existing `tripwire scan` API, and returns introspected identifiers from that API.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Multi-name submit**
   - Given two resolvable names, when `/tw-scan` runs, then each resolved path is submitted (or batched) via the existing scan API and confirmation covers all names.
2. **`--force` works**
   - Given a fresh non-stale scan result, when `/tw-scan name --force` runs, then a new submission occurs.
3. **Bare `force` works**
   - Given a fresh non-stale scan result, when `/tw-scan name force` runs, then a new submission occurs (same effect as `--force`).
4. **Identifiers returned**
   - Given a successful submit, when the skill responds, then the response includes introspected IDs from the scan API (e.g. scan/batch ID — exact fields per slice-26 introspection).

## Design / test treatment

- Wire to existing `tripwire scan` submit path; do not invent a parallel submit API.
- Dual force syntax is mandatory; share name resolution with `/tw-verify` where practical.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slice 26 gate-evidence `verdict` is `PASS`
- [ ] Branch `slice/29-tw-scan` created from current `main`
- [ ] Observed `tripwire scan` response fields (IDs) recorded from slice-26 introspection
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add scan GWTs for multi-name, `--force`, bare `force`, and ID return.
GREEN: implement `/tw-scan` submit wiring only as needed.
REFACTOR: share resolution/formatting with `/tw-verify` without coupling enable flag.

## After-Checks [GATE]

- [ ] Multi-name submit and both force syntaxes pass
- [ ] Response includes introspected scan/batch identifiers
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [ ] `docs/plan/gate-evidence/slice-29.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 29 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-scan` multi-name + `--force`/`force` documented |
| 2 | Link to existing `tripwire scan` API + slice-26 ID fields |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
