# Slice 25: Live Enforce Smoke

> Scenario: Brownfield | MoSCoW: Must | Depends on: 24

## Outcome

Live smoke proves enforcement: with hooks enabled, an unscanned or RED artifact is blocked; with `enable=false`, the same call is approved. Docs state that Claude Code has no native install-event hook and the workaround is `tripwire setup-agent-hooks`.

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; parametrized cases count as one.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Enabled blocks unscanned / RED | `@walking_skeleton` `@US-25` | `tripwire setup-agent-hooks` → installed `pre-tool-use.sh` |
| 2 | Disabled approves same call | `@US-25` | installed `pre-tool-use.sh` + `enable=false` |
| 3 | Install-event gap documented | `@US-25` | operator docs greppable claim |

1. **Enabled blocks unscanned / RED** `@walking_skeleton` `@US-25`
   - Given `tripwire setup-agent-hooks` installed into a fixture HOME with
     `enable=true`, and a smoke fixture that returns unscanned **or** RED from
     the guard check seam (`TRIPWIRE_CHECK_CALL_FIXTURE`),
     when the installed `~/.tripwire/hooks/pre-tool-use.sh` runs with Claude
     Code PreToolUse stdin JSON,
     then stdout JSON has `"decision":"block"`, a non-empty `"reason"`, and
     exit is `0`.
   - Parametrize: `unscanned` → reason contains `never scanned`; `red` → reason
     contains `rated red` (case-insensitive). Counts as **one** AT.
2. **Disabled approves same call** `@US-25`
   - Given the same install with `enable=false` (and the same fixture stdin),
     when the installed `pre-tool-use.sh` runs,
     then stdout JSON has `"decision":"approve"` and exit is `0` (shell
     short-circuit; guard check not required).
3. **Install-event gap documented** `@US-25`
   - Given operator-facing docs under `docs/user-guide/`,
     when searching for install-event / setup workaround language,
     then docs state Claude Code has **no native install-event hook** and name
     `tripwire setup-agent-hooks` as the workaround.

**Test inventory (3 acceptance tests):** enabled block (param unscanned|RED);
disabled approve; docs greppable install-event gap.

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_live_enforce_smoke.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Smoke + docs primary. Product touch limited to an explicit
  `TRIPWIRE_CHECK_CALL_FIXTURE` seam in `guard/hooks_entry.py` (unscanned|red
  only) so CI smoke does not require live Supabase.
- Coverage: existing slice-23 bar on `guard/config.py` + `guard/hooks_entry.py`
  remains ≥95% lines (smoke + prior GWTs). No new Horizon A sandbox floor change.
- Complexity: **enforcing** for any product-code change (`quality-gates.sh`).

## Design / test treatment

- Prefer scripted smoke against **installed** hooks + fixture HOME (real
  `tripwire setup-agent-hooks` CLI), not in-process-only handler unit tests.
- `TRIPWIRE_CHECK_CALL_FIXTURE=unscanned|red` is a smoke/test seam only; unset
  in production → real `guard.guard_hook.check_call`.
- Keep smoke scope to enable/disable + unscanned/RED block — not full skill
  surface (H2).
- **AT design complete** — ready for 🔨 IN PROGRESS.
- **Human checkpoint:** Phase H2 (26–30) must not start until a human signs off
  this smoke in gate evidence / DECISIONS.

## Before-Checks [GATE]

- [x] Slice 24 gate-evidence `verdict` is `PASS` (PR #75 merged to Frontline)
- [x] Branch `slice/25-live-enforce-smoke` created from Frontline integration
      branch (DECISIONS Wave H branch-base waiver)
- [x] Smoke fixture procedure noted: fixture HOME + `TRIPWIRE_CHECK_CALL_FIXTURE`
      + enable flip; recorded in gate evidence
- [x] Coverage/complexity targets set at AT design (above)

## TDD execution

RED: add smoke GWTs / scripted checks for enabled block and disabled approve.
GREEN: only fix wiring gaps that block the smoke path (fixture seam + docs).
REFACTOR: document the install-event workaround without expanding product scope.

## After-Checks [GATE]

- [x] Enabled unscanned/RED → `block` observed and recorded in gate evidence
- [x] Disabled → `approve` observed and recorded in gate evidence
- [x] Docs claim greppable: no native install-event hook; workaround is `tripwire setup-agent-hooks`
- [x] Named smoke/test command(s) exit 0 (or human observation logged with date + result)
- [x] Coverage/complexity: policy note recorded (enforcing for product-code touched; N/A with reason if docs/smoke-only)
- [x] `docs/plan/gate-evidence/slice-25.json` records commands/observations, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (nimble
      Wave H in-session review per DECISIONS)
- [x] `PROGRESS.md` + `TRAIL.md` show slice 25 ✅ (after merge to Frontline)
- [x] **Human test checkpoint:** Phase H2 (slices 26–30) signed off — operator
      requested start of slice 26 (DECISIONS 2026-08-15)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | Install-event absence + `setup-agent-hooks` workaround documented | PASS — setup-commands.md |
| 2 | Enable/disable smoke steps greppable for operators | PASS |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |
| 4 | Human checkpoint before H2 recorded | PASS — SIGNED_OFF in evidence + DECISIONS |

## Gate Status

✅ PASSED (PR #76)
