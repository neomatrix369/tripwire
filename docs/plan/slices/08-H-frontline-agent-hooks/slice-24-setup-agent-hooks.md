# Slice 24: setup-agent-hooks Install Path

> Scenario: Brownfield | MoSCoW: Must | Depends on: 23

## Outcome

`tripwire setup-agent-hooks` installs handler scripts under `~/.tripwire/hooks` with owner-only permissions (`chmod 700`), writes `~/.tripwire/config.json` if absent (defaults from slice 23), and registers a PreToolUse command hook in Claude Code settings.

## GWT acceptance specification

Thin scaffolds — full DISTILL ATs deferred per DECISIONS; design ATs before marking IN PROGRESS.

1. **Hooks land with correct permissions**
   - Given a clean home fixture, when the operator runs `tripwire setup-agent-hooks`, then `~/.tripwire/hooks/pre-tool-use.sh` and `_guard_entry.py` exist and the hooks directory mode is `700`.
2. **Config created only when absent**
   - Given no `~/.tripwire/config.json`, when setup runs, then config is written with `enable=true` and `scan_validity_days=14`; given config already present, when setup runs again, then existing values are preserved.
3. **PreToolUse registered**
   - Given Claude settings without a Tripwire PreToolUse hook, when setup runs, then settings contain a PreToolUse command pointing at the installed `pre-tool-use.sh`.

## Design / test treatment

- Single canonical install subcommand on the existing `tripwire` CLI; idempotent re-run safe for hooks + settings registration.
- Prefer fixture HOME / settings paths in acceptance tests over mutating the developer machine.
- **AT design required before IN PROGRESS** (≤7 acceptance tests).

## Before-Checks [GATE]

- [ ] Slice 23 gate-evidence `verdict` is `PASS` (or DECISIONS waiver)
- [ ] Branch `slice/24-setup-agent-hooks` created from current `main`
- [ ] `tripwire --help` / CLI surface inspection records where the new subcommand will attach (evidence note)
- [ ] Coverage/complexity targets TBD until AT design completes

## TDD execution

RED: add setup GWTs for install paths, chmod, config defaults/preserve, and PreToolUse registration.
GREEN: implement only the `setup-agent-hooks` path needed to pass.
REFACTOR: keep install idempotent; no enforcement behaviour beyond install wiring.

## After-Checks [GATE]

- [ ] Setup GWT scenarios pass (hooks present + mode 700; config write/preserve; PreToolUse registered)
- [ ] Each GWT Then clause asserts filesystem / settings observables
- [ ] Named test command(s) from AT design exit 0 (record in gate evidence)
- [ ] Coverage target: set at AT design before IN PROGRESS; recorded % meets that target
- [ ] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [ ] `docs/plan/gate-evidence/slice-24.json` records commands, coverage, complexity, reviewers, and `verdict: PASS`
- [ ] Review: `acceptance: APPROVED` and `implementation: APPROVED` (or docs-only exception in DECISIONS)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 24 ✅

## Doc Audit

| # | Check |
|---|--------|
| 1 | Operator docs name `tripwire setup-agent-hooks` as the single install path |
| 2 | Hook location `~/.tripwire/hooks` and chmod 700 stated |
| 3 | First-write config defaults cross-linked to slice 23 schema |
| 4 | Cross-link gate-evidence ↔ TRAIL/PROGRESS |

## Gate Status

📋 PLANNED
