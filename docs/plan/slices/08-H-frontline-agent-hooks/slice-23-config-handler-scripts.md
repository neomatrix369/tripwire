# Slice 23: Config + Handler Scripts

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

`~/.tripwire/config.json` has a documented schema (`enable` default `true`,
`scan_validity_days` default `14`). Repo-owned handlers `pre-tool-use.sh` and
`_guard_entry.py` (install templates under `guard/hooks/`) read Claude Code
stdin JSON and emit stdout JSON `approve`/`block`; enforcement is fail-closed on
unexpected errors; `enable=false` is a no-op approve. First-write defaults are
owned by `guard.config.ensure_default_config` (called by slice 24 install).

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; parametrized cases count as one.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Disabled config approves without guard work | `@walking_skeleton` `@US-23` | `guard/hooks/pre-tool-use.sh` + `guard.hooks_entry` |
| 2 | Enabled + RED blocks with reason | `@US-23` `@error` | `guard.hooks_entry.handle_pre_tool_use` |
| 3 | Enabled + below-threshold approves | `@US-23` | `guard.hooks_entry.handle_pre_tool_use` |
| 4 | Unexpected error fails closed | `@US-23` `@error` | `guard.hooks_entry.handle_pre_tool_use` |
| 5 | First write applies config defaults | `@US-23` | `guard.config.ensure_default_config` |
| 6 | Existing config is preserved on ensure | `@US-23` | `guard.config.ensure_default_config` |

1. **Disabled config approves without guard work** `@walking_skeleton` `@US-23`
   - Given a fixture HOME with `~/.tripwire/config.json` `enable=false`,
     when the PreToolUse handler is invoked with Claude Code stdin JSON (fixture),
     then stdout JSON has `"decision":"approve"`, process exit is `0`, and the
     injected guard `check_call` is **not** invoked.
2. **Enabled + RED blocks with reason** `@US-23` `@error`
   - Given `enable=true` and an injected `check_call` returning
     `{"allow": false, "reason": "rated red — at/above threshold", "status": "red"}`,
     when `handle_pre_tool_use` runs with fixture stdin,
     then stdout JSON has `"decision":"block"`, a non-empty `"reason"`, and exit is `0`.
3. **Enabled + below-threshold approves** `@US-23`
   - Given `enable=true` and an injected `check_call` returning
     `{"allow": true, "reason": "rated green — below threshold", "status": "green"}`,
     when `handle_pre_tool_use` runs,
     then stdout JSON has `"decision":"approve"` and exit is `0`.
4. **Unexpected error fails closed** `@US-23` `@error`
   - Given `enable=true` and an injected `check_call` that raises `RuntimeError`,
     when `handle_pre_tool_use` runs,
     then stdout JSON has `"decision":"block"`, reason containing `fail closed`
     (case-insensitive), and exit is `0`.
5. **First write applies config defaults** `@US-23`
   - Given no config file at the fixture path,
     when `ensure_default_config(path)` runs,
     then the file exists and parses to `enable=true` and `scan_validity_days=14`.
6. **Existing config is preserved on ensure** `@US-23`
   - Given a config file with `enable=false` and `scan_validity_days=7`,
     when `ensure_default_config(path)` runs again,
     then those values are unchanged.

**Test inventory (6 acceptance tests):** disabled short-circuit; RED block; green
approve; fail-closed; defaults on first write; ensure preserves existing.

**Named verification command:**

```bash
cd <repo> && .venv/bin/pytest guard/tests/test_config_handler_scripts.py -q --tb=short
```

**Coverage target (AT design):** ≥95% lines on `guard/config.py` +
`guard/hooks_entry.py` measured by:

```bash
.venv/bin/pytest guard/tests/test_config_handler_scripts.py -q \
  --cov=guard.config --cov=guard.hooks_entry --cov-report=term-missing --cov-fail-under=95
```

(Does **not** fold `guard/` into the Horizon A sandbox `fail_under=95` bar —
ADR-0015 / coverage-audit Guard exclusion remains until a superseding ADR.)

## Design / test treatment

- Thin shell wrapper (`guard/hooks/pre-tool-use.sh`) + Python entry
  (`guard/hooks/_guard_entry.py`) calling `guard.hooks_entry`; decision always via
  stdout JSON with exit 0.
- Drive handler GWTs with fixture stdin JSON and injectable `check_call`; cover
  enable short-circuit and fail-closed path. Shell walking skeleton may invoke
  the script with `TRIPWIRE_CONFIG` / `TRIPWIRE_HOOKS_ENTRY` overrides for HOME
  fixtures.
- `ensure_default_config` is the first-write owner; slice 24 wires it into
  `tripwire setup-agent-hooks`.
- Outcome anchors: `Operator (Claude Code) receives approve/block JSON` /
  `Config file carries Frontline schema defaults`.

## Before-Checks [GATE]

- [x] Branch `slice/23-config-handler-scripts` created from Frontline integration
      branch `frontline-hackathon-london-2026-agent-hooks` (not bare `main` —
      DECISIONS 2026-08-15 Wave H branch-base)
- [x] `test -f docs/plan/gate-evidence/slice-23.json` and `"gate_status":"PLANNED"`
- [x] `rg -n "check_call|pre_tool_use_hook" guard/` →
      `guard/guard_hook.py:24` (`check_call`), `:65` (`pre_tool_use_hook`)
- [x] Coverage/complexity targets set at AT design (see above; complexity =
      enforcing for product-code paths touched)

## TDD execution

RED: add handler/config GWTs for enable short-circuit, RED block, green approve,
fail-closed, and config ensure defaults/preserve.
GREEN: ship schema + `pre-tool-use.sh` / `_guard_entry.py` + `hooks_entry` /
`config` wiring only as needed to pass.
REFACTOR: keep handlers thin; no product behaviour beyond approve/block contract.

## After-Checks [GATE]

- [x] Handler GWT scenarios pass (enable=false approve; enable=true+RED block;
      green approve; unexpected error fail-closed; defaults on first write;
      ensure preserves)
- [x] Each GWT Then clause asserts observable stdout JSON / exit / config fields
      — no mock-call-only assertions (short-circuit may also assert
      `check_call` not called as a **secondary** collaboration check in a
      dedicated test, or combine only when Then includes both stdout and
      non-invocation as the scenario rule)
- [x] Named test command(s) from AT design exit 0 (record in gate evidence)
- [x] Coverage target: ≥95% lines on `guard/config.py` + `guard/hooks_entry.py`
      (measured 98.8% 2026-08-15)
- [x] Complexity policy: **enforcing** for product-code paths touched; evidence
      cites `./scripts/quality-gates.sh` / complexity report
- [x] `docs/plan/gate-evidence/slice-23.json` records commands, coverage,
      complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or
      docs-only exception in DECISIONS)
- [x] `PROGRESS.md` + `TRAIL.md` show slice 23 ✅ and Execution order advanced

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | Config schema (`enable`, `scan_validity_days`) greppable in `guard/config.py` + STATUS Wave H note | PASS |
| 2 | Handler stdin/stdout approve/block contract greppable in `guard/hooks_entry.py` or hook templates | PASS |
| 3 | Fail-closed behaviour stated explicitly | PASS |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

✅ PASSED (PR #74 → `frontline-hackathon-london-2026-agent-hooks`, 2026-08-15)
