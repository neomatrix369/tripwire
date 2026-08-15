# Slice 28: /tw-verify

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26, 27

## Outcome

`/tw-verify` resolves multiple names, reports every artifact in one pass via the shared human table + machine JSON, covers all six states, always notes RED will be blocked when enabled, offers `/tw-scan` for unscanned, and returns a useful human message for not-found.

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; product-code + Claude skill SKILL.md.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Multi-name one-pass table + JSON | `@US-28` | `guard.verify.verify_artifacts` |
| 2 | Six UI states (parametrized) | `@US-28` | `guard.verify.verify_artifacts` |
| 3 | RED block note | `@US-28` | `guard.verify.verify_artifacts` |
| 4 | Unscanned offers `/tw-scan` | `@US-28` | `guard.verify.verify_artifacts` |
| 5 | Not-found human-readable | `@US-28` | `guard.verify.verify_artifacts` |
| 6 | Skill shipped at Claude layout | `@US-28` | `.claude/skills/tw-verify/SKILL.md` |

1. **Multi-name one-pass table** `@US-28`
   - Given two or more resolvable names with distinct statuses,
     when `verify_artifacts` / `/tw-verify` runs,
     then every name appears as a row in one Markdown table and in `artifacts[]`
     without stopping at the first issue.
2. **State coverage** `@US-28`
   - Given fixtures for fresh / stale / unscanned / scanning / not-found / red,
     when verify runs for each,
     then `state` (and Status display) matches the slice-26 contract.
3. **RED block note** `@US-28`
   - Given a RED artifact within the validity window,
     when verify reports it,
     then Note includes **Will be blocked when Tripwire is enabled** and
     `will_be_blocked` is true.
4. **Unscanned offers scan** `@US-28`
   - Given an unscanned artifact,
     when verify reports it,
     then the Note (or equivalent) offers `/tw-scan` for that name.
5. **Not-found is human-readable** `@US-28`
   - Given a name with no resolution match,
     when verify runs,
     then the response includes a useful human message (not a bare error).
6. **Skill at Claude layout** `@US-28`
   - Given the repo checkout,
     when an operator looks for `/tw-verify`,
     then `.claude/skills/tw-verify/SKILL.md` exists and points at
     `guard.verify.verify_artifacts` + the dual-output contract.

**Test inventory (6 acceptance tests; state AT parametrized = 1):**
`guard/tests/test_tw_verify.py`

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_tw_verify.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Coverage target: **≥95% lines** on `guard/verify.py` (new dual-output + classify).
- Complexity: **enforcing** for product-code; cite `./scripts/quality-gates.sh` /
  xenon in gate evidence.

## Design / test treatment

- Name resolution is injectable (`resolve`); Claude skill resolves via agent visibility,
  then calls `verify_artifacts` with resolved paths (or `None` for not-found).
- Status lookup is injectable (`fetch_status`); production path queries Supabase
  `items.heatmap_status` + scan timestamps / in-flight runs (same pattern as
  `guard/guard_hook.py`). Tests never hit live Supabase.
- Output must satisfy slice-26 dual audience contract
  (`docs/user-guide/frontline-output-contract.md`).
- Shared format helpers live in `guard/verify.py` for later `/tw-scan` /
  `/tw-self-check` reuse.
- **AT design complete** — ready for 🔨 IN PROGRESS.

## Before-Checks [GATE]

- [x] Slices 26 and 27 gate-evidence `verdict` are `PASS` (26: PR #78; 27: PR #80)
- [x] Branch `slice/28-tw-verify` created from Frontline integration
      (DECISIONS Wave H branch-base waiver)
- [x] Slice-26 contract path recorded as the output SSOT in evidence
      (`docs/user-guide/frontline-output-contract.md`)
- [x] Coverage target ≥95% lines on `guard/verify.py`; complexity enforcing

## TDD execution

RED: add verify GWTs for multi-name table, six states, RED note, unscanned offer, not-found message.
GREEN: implement `/tw-verify` against existing status APIs only as needed.
REFACTOR: share formatting helpers with later `/tw-scan` / `/tw-self-check`.

## After-Checks [GATE]

- [x] Multi-name one-pass and six-state GWTs pass
- [x] RED block note and unscanned→offer-scan asserted observably
- [x] Not-found human message asserted (not bare error)
- [x] Named test command(s) from AT design exit 0 (record in gate evidence)
- [x] Coverage target: ≥95% lines on `guard/verify.py`; recorded % meets that target (100%)
- [x] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [x] `docs/plan/gate-evidence/slice-28.json` records commands, coverage, complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (nw-software-crafter-reviewer)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 28 ✅ (after merge)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | `/tw-verify` multi-name + one-pass behaviour documented | PASS — setup-commands + SKILL.md |
| 2 | Link to slice-26 output contract | PASS — SKILL.md + frontline-output-contract |
| 3 | RED block note + unscanned offer + not-found messaging stated | PASS |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

🔀 ON BRANCH (pending review + merge)
