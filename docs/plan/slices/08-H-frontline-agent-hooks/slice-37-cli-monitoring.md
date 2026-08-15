# Slice 37: CLI Monitoring Extension

> Scenario: Brownfield | MoSCoW: Should | Phase: H6 | Depends on: 32

## Outcome

Operators gain CLI-level monitoring for Tripwire agent-hook / scan activity so
they can observe enforcement and dispatch health without reading raw logs only —
extending the existing CLI, not a separate product.

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS`.

1. **Operator can view monitoring status from the CLI** `@contract-shape:bounded-change`
   - Given Phase 1 is complete and monitoring extension is installed,
     when the operator invokes the documented monitoring command/subcommand,
     then they receive an observable status summary (hooks enable state, recent
     scan/dispatch health, or documented equivalent).
2. **Monitoring does not bypass enforcement** `@contract-shape:unbounded-preservation`
   - Given hooks are enabled,
     when monitoring commands run,
     then PreToolUse enforcement behaviour is unchanged.
3. **Invalid monitoring input fails with guidance** `@contract-shape:bounded-change`
   - Given invalid flags/args,
     when the monitoring command runs,
     then it exits nonzero with an actionable message.

## Design / test treatment

- Prefer extending `tripwire` CLI surface over new binaries.
- Read `~/.tripwire/config.json` and existing status sources (Supabase patterns
  from Phase H2) rather than inventing a second truth store.
- Coverage target TBD at AT design before `IN PROGRESS`.
- Parallelizable after slice 32 with H4/H5 (see TRAIL).

**Test inventory (≤7 acceptance tests):** status happy path; enforcement
preservation; invalid input; (optional) empty-state / disabled hooks messaging.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] Branch `slice/37-cli-monitoring` created from Wave H integration branch
- [ ] Monitoring CLI surface/name sketched in evidence or DECISIONS before RED

## TDD execution

RED: CLI monitoring GWT scaffolds at the program boundary.
GREEN: implement only the monitoring read/report seam required.
REFACTOR: keep enable/disable and scan paths untouched.

## After-Checks [GATE]

- [ ] Each GWT clause has an observable output/state assertion; no mock-call-only Then
- [ ] Monitoring command scenarios pass; literal stdout/exit in evidence
- [ ] Enforcement preservation scenario passes
- [ ] `./scripts/quality-gates.sh` exit 0 recorded in `docs/plan/gate-evidence/slice-37.json`
- [ ] Coverage target recorded (set at AT design) and met
- [ ] Complexity evidence: **enforcing** for product-code
- [ ] Review APPROVED; evidence verdict `PASS`

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README / QUICKSTART | Document monitoring command |
| 2 | Inline comments | As needed |
| 3 | Function signatures | CLI program surface |
| 4 | Error paths | Invalid args messaging |
| 5 | CHANGELOG | If public CLI ships |
| 6 | Architecture | Monitoring reads config/status sources |
| 7 | API / CLI help | New subcommand help |
| 8 | Config/env vars | Any new keys |
| 9 | Examples | One monitoring invocation |
| 10 | Deprecated features | N/A |
| 11 | Migration guide | N/A |
| 12 | Troubleshooting | Empty/disabled states |
| 13 | Related links | slice 32 → 37 → 38 |
| 14 | No orphaned file references | OK |

## Gate Status

📋 PLANNED
