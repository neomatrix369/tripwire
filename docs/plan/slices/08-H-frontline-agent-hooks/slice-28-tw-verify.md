# Slice 28: /tw-verify

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26, 27

## Outcome

`/tw-verify` resolves multiple names, reports every artifact in one pass via the shared human table + machine JSON, covers all six states, surfaces Tessl **Quality** as **`N/100`** when `items.quality_score` is present, de-duplicates the shared blocked message into a **table footer**, offers `/tw-scan` for unscanned, and returns a useful human message for not-found.

**Delta (2026-08-25):** Quality column + blocked-note footer de-dupe (Quality-only metrics; amend-in-place — no new slice). Evidence state: **DECIDED** until skill implementation ships.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Multi-name one-pass table**
   - Given two or more resolvable names, when `/tw-verify` runs, then every name appears as a row in one Markdown table (and matching machine artifacts) without stopping at the first issue.
2. **State coverage**
   - Given fixtures for fresh/stale/unscanned/scanning/not-found/red, when verify runs, then each state renders per the slice-26 contract (including Quality column).
3. **Quality column (`N/100`)**
   - Given a found skill with stored `items.quality_score`, when verify reports it, then the Quality cell shows **`N/100`** (scale bound visible; never a bare integer or `Q N` alone).
   - Given MCP, unscanned, not-found, or null score, when verify reports it, then Quality is `—`.
4. **Driver exposes `quality_score`**
   - Given the Step-4 status driver JSON, when an artifact has an item row, then `quality_score` is present as a nullable number (0–100); human render owns the `/100` display.
5. **Blocked note de-dupe (footer)**
   - Given one or more rows with `will_be_blocked=true`, when verify renders the table, then the phrase **Will be blocked when Tripwire is enabled** appears **once** under the table (footer), not repeated in every Note.
   - Row Notes keep *distinct* copy only (AMBER threshold, STALE remedy, CHANGED, NOT FOUND locus, UNSCANNED, alias hints).
6. **Unscanned offers scan**
   - Given an unscanned artifact, when verify reports it, then the operator is offered `/tw-scan` for that name.
7. **Not-found is human-readable**
   - Given a name with no resolution match, when verify runs, then the response includes a useful human message (not a bare error).

## Design / test treatment

- Name resolution uses the deterministic resolve driver (`resolve_operator_name`); status via `get_item_status` (item already includes `quality_score`).
- Output must satisfy amended slice-26 dual audience contract: columns `Name | Type | Status | Quality | Note`.
- Do **not** invoke Tessl CLI from `/tw-verify` — read persisted `items.quality_score` only.
- Out of scope this delta: Risk, scanner counts, scan age, other non-quality metrics.
- Files at implementation: `agent-hooks/skills/tw-verify/SKILL.md` (Steps 4–5), `agent-hooks/skills/tw-self-check/SKILL.md` (mirror), optional promote of `quality_score` in the inline status driver JSON; then `tripwire setup-agent-hooks`.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slices 26 and 27 gate-evidence `verdict` are `PASS`
- [ ] Branch `slice/28-tw-verify` (or `slice/28-tw-verify-quality`) created from current `main`
- [ ] Slice-26 contract path recorded as the output SSOT in evidence
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add verify GWTs for multi-name table, six states, Quality `N/100`, footer blocked de-dupe, unscanned offer, not-found message.
GREEN: implement `/tw-verify` skill render + driver field against existing status APIs only as needed.
REFACTOR: share formatting helpers with later `/tw-scan` / `/tw-self-check`.

## After-Checks [GATE]

- [ ] Multi-name one-pass and six-state GWTs pass
- [ ] Quality cell asserts `/100` when score present; `—` when absent
- [ ] Blocked footer appears once when any `will_be_blocked`; Notes lack repeated blocked sentence
- [ ] Unscanned→offer-scan asserted observably
- [ ] Not-found human message asserted (not bare error)
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report; **N/A** for skill-markdown-only with reason
- [ ] `docs/plan/gate-evidence/slice-28.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 28 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-verify` multi-name + one-pass + Quality `N/100` + blocked footer documented in skill SSOT |
| 2 | Link to amended slice-26 output contract |
| 3 | sync-docs on ship: `tw-verify` + `tw-self-check` + `tw-disable` wording + `agent-hooks/README` + CHANGELOG |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
