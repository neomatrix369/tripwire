# Slice 28: /tw-verify

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26, 27

## Outcome

`/tw-verify` resolves multiple names, reports every artifact in one pass via the shared human table + machine JSON, covers all six states, always notes RED will be blocked when enabled, offers `/tw-scan` for unscanned, and returns a useful human message for not-found.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Multi-name one-pass table**
   - Given two or more resolvable names, when `/tw-verify` runs, then every name appears as a row in one Markdown table (and matching machine artifacts) without stopping at the first issue.
2. **State coverage**
   - Given fixtures for fresh/stale/unscanned/scanning/not-found/red, when verify runs, then each state renders per the slice-26 contract.
3. **RED block note**
   - Given a RED artifact, when verify reports it, then the Note (or equivalent) includes that it will be blocked when Tripwire is enabled.
4. **Unscanned offers scan**
   - Given an unscanned artifact, when verify reports it, then the operator is offered `/tw-scan` for that name.
5. **Not-found is human-readable**
   - Given a name with no resolution match, when verify runs, then the response includes a useful human message (not a bare error).

## Design / test treatment

- Name resolution uses Claude visibility into skills/MCP/tools; path(s) passed to existing status sources (Supabase `heatmap_status` pattern).
- Output must satisfy slice-26 dual audience contract.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slices 26 and 27 gate-evidence `verdict` are `PASS`
- [ ] Branch `slice/28-tw-verify` created from current `main`
- [ ] Slice-26 contract path recorded as the output SSOT in evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add verify GWTs for multi-name table, six states, RED note, unscanned offer, not-found message.
GREEN: implement `/tw-verify` against existing status APIs only as needed.
REFACTOR: share formatting helpers with later `/tw-scan` / `/tw-self-check`.

## After-Checks [GATE]

- [ ] Multi-name one-pass and six-state GWTs pass
- [ ] RED block note and unscanned→offer-scan asserted observably
- [ ] Not-found human message asserted (not bare error)
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [ ] `docs/plan/gate-evidence/slice-28.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 28 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-verify` multi-name + one-pass behaviour documented |
| 2 | Link to slice-26 output contract |
| 3 | RED block note + unscanned offer + not-found messaging stated |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
