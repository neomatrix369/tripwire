# Slice 23: Config + Handler Scripts

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

`~/.tripwire/config.json` has a documented schema (`enable` default `true`, `scan_validity_days` default `14`). Installed handlers `pre-tool-use.sh` and `_guard_entry.py` read Claude Code stdin JSON and emit stdout JSON `approve`/`block`; enforcement is fail-closed on unexpected errors; `enable=false` is a no-op approve.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Disabled config approves without guard work**
   - Given `~/.tripwire/config.json` with `enable=false`, when the PreToolUse handler receives a tool-call stdin payload, then stdout is `{"decision":"approve"}` and exit is 0.
2. **Enabled + RED blocks**
   - Given `enable=true` and the target artifact is RED, when the handler runs, then stdout is `{"decision":"block", ...}` with a reason and exit is 0.
3. **Unexpected error fails closed**
   - Given `enable=true` and the guard path raises an unexpected error, when the handler runs, then stdout blocks with a fail-closed reason and exit is 0.
4. **First write applies config defaults**
   - Given no `~/.tripwire/config.json`, when config is written for the first time (via the install/setup path that owns first write), then `enable` is `true` and `scan_validity_days` is `14`.

## Design / test treatment

- Thin shell wrapper + Python entry that wraps existing `guard/guard_hook.py`; decision always via stdout JSON with exit 0.
- Drive handler GWTs with fixture stdin JSON and fake/stubbed guard results; cover enable short-circuit and fail-closed path.
- **AT design required before IN PROGRESS** (≤7 acceptance tests; parametrized cases count as one).

## Before-Checks [GATE]

- [ ] Branch `slice/23-config-handler-scripts` created from current `main`
- [ ] `test -f docs/plan/gate-evidence/slice-23.json` and `"gate_status":"PLANNED"`
- [ ] `rg -n "check_call|pre_tool_use_hook" guard/` identifies the existing guard entry points recorded in gate evidence
- [ ] Coverage/complexity targets TBD recorded as TBD until AT design completes

## TDD execution

RED: add handler/config GWTs for enable short-circuit, RED block, and fail-closed.
GREEN: ship schema + `pre-tool-use.sh` / `_guard_entry.py` wiring only as needed to pass.
REFACTOR: keep handlers thin; no product behaviour beyond approve/block contract.

## After-Checks [GATE]

- [ ] Handler GWT scenarios pass (enable=false approve; enable=true+RED block; unexpected error fail-closed; defaults on first write)
- [ ] Each GWT Then clause asserts observable stdout JSON / exit / config fields — no mock-call-only assertions
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code paths touched; evidence cites `./scripts/quality-gates.sh` / complexity report
- [ ] `docs/plan/gate-evidence/slice-23.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 23 ✅ and Execution order advanced

## Doc Audit

| # | Check |
|---|--------|
| 1 | Config schema (`enable`, `scan_validity_days`) documented where operators look |
| 2 | Handler stdin/stdout approve/block contract greppable in docs or code comments |
| 3 | Fail-closed behaviour stated explicitly |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
