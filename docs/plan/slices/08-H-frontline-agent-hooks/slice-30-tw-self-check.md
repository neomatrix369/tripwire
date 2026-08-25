# Slice 30: /tw-self-check

> Scenario: Brownfield | MoSCoW: Must | Depends on: 28

## Outcome

`/tw-self-check` reuses `/tw-verify` status/staleness/tabular logic scoped only to the five `/tw-*` skills, with optional `--force` / `force` to drive rescan behaviour where applicable. Table columns follow the amended slice-26/28 contract: **Name | Type | Status | Quality | Note** (Quality as `N/100` or `—`; blocked message as table footer).

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Scoped to five /tw-* skills**
   - Given installed Tripwire control skills, when `/tw-self-check` runs without names, then only the five `/tw-*` skills appear in the table (not arbitrary demos/other skills).
2. **Same verify logic**
   - Given known states among those five, when self-check runs, then states/notes/Quality/footer match `/tw-verify` contract behaviour (fresh/stale/unscanned/scanning/red handling + Quality `N/100` + blocked footer).
3. **Optional force**
   - Given `--force` or bare `force`, when self-check runs, then force semantics align with rescan/verify-adjacent behaviour defined at AT design (documented in evidence).

## Design / test treatment

- Prefer calling shared verify core with a fixed name list rather than duplicating formatting.
- Scope expansion beyond five `/tw-*` skills is BACKLOG — do not implement here.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slice 28 gate-evidence `verdict` is `PASS`
- [ ] Branch `slice/30-tw-self-check` created from current `main`
- [ ] Inventory of the five `/tw-*` skill names recorded in evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add self-check GWTs for five-skill scope, verify-equivalent output, and force option.
GREEN: implement thin skill wrapper over verify core.
REFACTOR: keep scope list explicit and greppable.

## After-Checks [GATE]

- [ ] Self-check reports only the five `/tw-*` skills
- [ ] Output matches verify contract for those skills
- [ ] `--force` / `force` behaviour asserted per AT design
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [ ] `docs/plan/gate-evidence/slice-30.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 30 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-self-check` scope = five `/tw-*` skills only (BACKLOG expansion noted) |
| 2 | Link to `/tw-verify` + slice-26 contract |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
