# Slice 24: setup-agent-hooks Install Path

> Scenario: Brownfield | MoSCoW: Must | Depends on: 23

## Outcome

`tripwire setup-agent-hooks` installs handler scripts under `~/.tripwire/hooks`
with owner-only permissions (`chmod 700`), writes `~/.tripwire/config.json` if
absent (defaults from slice 23 via `ensure_default_config`), and registers a
PreToolUse command hook in Claude Code settings.

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; parametrized cases count as one.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Hooks land with correct permissions | `@walking_skeleton` `@US-24` | `tripwire setup-agent-hooks` → `~/.tripwire/hooks/` |
| 2 | Config created when absent | `@US-24` | first-write via `ensure_default_config` |
| 3 | Existing config preserved | `@US-24` | re-run setup |
| 4 | PreToolUse registered | `@US-24` | Claude settings JSON |
| 5 | Idempotent re-run (no duplicate hooks) | `@US-24` | Claude settings JSON |

1. **Hooks land with correct permissions** `@walking_skeleton` `@US-24`
   - Given a clean fixture HOME,
     when the operator runs `tripwire setup-agent-hooks` with that HOME,
     then `~/.tripwire/hooks/pre-tool-use.sh` and `_guard_entry.py` exist and
     the hooks directory mode is `0o700`.
2. **Config created when absent** `@US-24`
   - Given no `~/.tripwire/config.json`,
     when setup runs,
     then config parses to `enable=true` and `scan_validity_days=14`.
3. **Existing config preserved** `@US-24`
   - Given config with `enable=false` and `scan_validity_days=7`,
     when setup runs again,
     then those values are unchanged.
4. **PreToolUse registered** `@US-24`
   - Given Claude settings without a Tripwire PreToolUse hook,
     when setup runs,
     then settings contain a PreToolUse command whose `command` path points at
     the installed `pre-tool-use.sh`.
5. **Idempotent re-run (no duplicate hooks)** `@US-24`
   - Given setup already ran once,
     when setup runs again,
     then exactly one Tripwire PreToolUse command entry remains (no duplicates).

**Test inventory (5 acceptance tests):** hooks+mode; config first-write; config
preserve; PreToolUse register; idempotent settings.

**Named verification command:**

```bash
cd cli && npm test -- test/setupAgentHooks.test.js
```

**Coverage target (AT design):** ≥80% lines on `cli/src/setupAgentHooks.js`
(CLI ship-path floors remain temporary 60% overall; this module-local target is
the slice gate). Measured via:

```bash
cd cli && npx c8 --include 'src/setupAgentHooks.js' --check-coverage --lines 80 \
  node --test test/setupAgentHooks.test.js
```

## Design / test treatment

- Single canonical install subcommand on the existing `tripwire` CLI; idempotent
  re-run safe for hooks + settings registration.
- Prefer fixture HOME / settings paths in acceptance tests over mutating the
  developer machine (`--home` / `--claude-settings` flags for tests and ops).
- Config first-write delegates to Python `guard.config.ensure_default_config`
  (slice 23 owner) via `uv run` / `python` with `HOME` / path env.
- **AT design complete** — ready for 🔨 IN PROGRESS.

## Before-Checks [GATE]

- [x] Slice 23 gate-evidence `verdict` is `PASS` (PR #74)
- [x] Branch `slice/24-setup-agent-hooks` created from Frontline integration
      branch (DECISIONS Wave H branch-base waiver)
- [x] `tripwire --help` inspection: new subcommand attaches beside `setup` /
      `scan` / `route` in `cli/bin/tripwire.js`
- [x] Coverage target set: ≥80% lines on `cli/src/setupAgentHooks.js`

## TDD execution

RED: add setup GWTs for install paths, chmod, config defaults/preserve, and
PreToolUse registration.
GREEN: implement only the `setup-agent-hooks` path needed to pass.
REFACTOR: keep install idempotent; no enforcement behaviour beyond install wiring.

## After-Checks [GATE]

- [x] Setup GWT scenarios pass (hooks present + mode 700; config write/preserve;
      PreToolUse registered; idempotent)
- [x] Each GWT Then clause asserts filesystem / settings observables
- [x] Named test command(s) from AT design exit 0 (record in gate evidence)
- [x] Coverage target: ≥80% lines on `cli/src/setupAgentHooks.js` (measured
      93.11% 2026-08-15)
- [x] Complexity policy: **enforcing** for product-code; evidence cites
      quality-gates / complexity report
- [x] `docs/plan/gate-evidence/slice-24.json` records commands, coverage,
      complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (nimble
      Wave H in-session review per DECISIONS)
- [x] `PROGRESS.md` + `TRAIL.md` show slice 24 ✅ (merged Frontline via PR #75)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | Operator docs name `tripwire setup-agent-hooks` as the single install path | PASS — setup-commands.md |
| 2 | Hook location `~/.tripwire/hooks` and chmod 700 stated | PASS |
| 3 | First-write config defaults cross-linked to slice 23 schema | PASS |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

✅ PASSED
