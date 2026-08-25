# Slice 28: /tw-verify

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26, 27

## Outcome

`/tw-verify` resolves multiple names, reports every artifact in one pass via the shared human table + machine JSON, covers all six states, surfaces Tessl **Quality** as **`N/100`** when `items.quality_score` is present, de-duplicates the shared blocked message into a **table footer**, attributes vendors via a **Sources** line (Quality = Tessl; Status = Cisco AI Defense + Snyk), offers `/tw-scan` for unscanned, and returns a useful human message for not-found.

**Delta (2026-08-25):** Quality column + blocked-note footer de-dupe + Sources attribution (Quality-only metrics; amend-in-place — no new slice). Evidence state: **IMPLEMENTED** on `slice/28-tw-verify-quality`.

## GWT acceptance specification

**DISTILL ATs (2026-08-25)** — ≤7; product-code `guard/verify.py` + agent-hooks skill.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Multi-name one-pass table + JSON | `@US-28` | `guard.verify.verify_artifacts` |
| 2 | Six UI states (parametrized) | `@US-28` | `guard.verify.verify_artifacts` |
| 3 | Quality `N/100` / `—` (parametrized) | `@US-28` | `format_quality_cell` / `to_markdown` |
| 4 | Blocked footer de-dupe | `@US-28` | `VerifyResult.to_markdown` |
| 5 | Unscanned offers `/tw-scan` | `@US-28` | `guard.verify.verify_artifacts` |
| 6 | Not-found human-readable | `@US-28` | `guard.verify.verify_artifacts` |
| 7 | Skill at agent-hooks layout | `@US-28` | `agent-hooks/skills/tw-verify/SKILL.md` |

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_tw_verify.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Coverage target: **≥95% lines** on `guard/verify.py` (measured 100%).
- Complexity: **enforcing** for product-code; cite `./scripts/quality-gates.sh` / xenon.

## Design / test treatment

- Name resolution uses the deterministic resolve driver (`resolve_operator_name`); status via `get_item_status` (item already includes `quality_score`).
- Dual-output helpers live in `guard/verify.py` for `/tw-scan` / `/tw-self-check` reuse.
- Output SSOT: `docs/user-guide/frontline-output-contract.md` (columns `Name | Type | Status | Quality | Note`).
- Do **not** invoke Tessl CLI from `/tw-verify` — read persisted `items.quality_score` only.
- Files: `guard/verify.py`, `agent-hooks/skills/tw-verify/SKILL.md`, `tw-self-check`, `tw-disable`, contract doc; then `tripwire setup-agent-hooks`.

## Before-Checks [GATE]

- [ ] Slices 26 and 27 gate-evidence `verdict` are `PASS` *(waived: DECISIONS 2026-08-25 — substitute contract + skills on main)*
- [x] Branch `slice/28-tw-verify-quality` created from current `main`
- [x] Slice-26 contract path recorded as the output SSOT: `docs/user-guide/frontline-output-contract.md`
- [x] Coverage target ≥95% on `guard/verify.py`; complexity enforcing

## TDD execution

RED→GREEN→REFACTOR complete for Quality + footer delta (restored Frontline verify helpers).

## After-Checks [GATE]

- [x] Multi-name one-pass and six-state GWTs pass
- [x] Quality cell asserts `/100` when score present; `—` when absent
- [x] Blocked footer appears once when any `will_be_blocked`; Notes lack repeated blocked sentence
- [x] Unscanned→offer-scan asserted observably
- [x] Not-found human message asserted (not bare error)
- [x] `.venv/bin/pytest guard/tests/test_tw_verify.py -q` exit 0
- [x] Coverage 100% lines on `guard/verify.py` (target ≥95%)
- [x] Complexity / quality-gates (record in evidence)
- [x] `docs/plan/gate-evidence/slice-28.json` records commands, coverage, complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED`
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 28 ✅ (after merge)

## Doc Audit

| # | Check |
|---|--------|
| 1 | `/tw-verify` multi-name + one-pass + Quality `N/100` + blocked footer + Sources attribution documented in skill SSOT |
| 2 | Link to `docs/user-guide/frontline-output-contract.md` |
| 3 | sync-docs: `tw-verify` + `tw-self-check` + `tw-disable` + `agent-hooks/README` + CHANGELOG |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

🔀 ON BRANCH
