# Slice 33: DepShield Install via setup-agent-hooks

> Scenario: Brownfield | MoSCoW: Should | Phase: H4 | Depends on: 32

## Outcome

An operator who already completed Phase 1 (`slice-32` PASS) can extend the
canonical install path so `tripwire setup-agent-hooks` provisions DepShield
alongside Tripwire agent hooks — without inventing a second install command.

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS`.

1. **Operator extends install without a parallel installer** `@contract-shape:bounded-change`
   - Given Phase 1 hooks are installed and DepShield packaging/credentials are available,
     when the operator runs `tripwire setup-agent-hooks` with DepShield install enabled,
     then DepShield artifacts land under the documented install locations and the command
     exits 0 with an observable confirmation.
2. **Re-run remains idempotent** `@contract-shape:unbounded-preservation`
   - Given DepShield was already installed by a prior setup run,
     when the operator re-runs `tripwire setup-agent-hooks`,
     then the command does not corrupt existing Tripwire hooks/config and reports a
     safe no-op or refresh outcome.
3. **Missing DepShield preconditions fail closed with guidance** `@contract-shape:bounded-change`
   - Given required DepShield inputs are absent,
     when setup attempts DepShield provisioning,
     then the command exits nonzero with an actionable message and leaves Tripwire
     Phase 1 enforcement intact.

## Design / test treatment

- Extend the existing `tripwire setup-agent-hooks` subcommand (slice 24) with a
  pluggable DepShield install step — same canonical path, not a sibling CLI.
- Keep install concerns separate from dispatch (slice 34): this slice only
  provisions/configures DepShield so dispatch can assume it is present.
- Drive ATs at the CLI boundary with fakes for filesystem / settings writes;
  coverage target TBD at AT design before `IN PROGRESS`.

**Test inventory (≤7 acceptance tests):** install success; idempotent re-run;
missing-precondition failure; Tripwire hooks preserved; confirmation output;
(optional) dry-run/preview if design retains one.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] Branch `slice/33-depshield-install` created from Wave H integration branch
- [ ] Phase H3 hard gate noted: no DepShield product work started before slice 32 PASS
- [ ] DepShield install inputs (package/path/env) are listed in evidence or DECISIONS

## TDD execution

RED: add GWT scaffolds at the `setup-agent-hooks` boundary for DepShield provision.
GREEN: implement only the install/extension seam required by those scenarios.
REFACTOR: keep Tripwire Phase 1 install path as the single entry point.

## After-Checks [GATE]

- [ ] Each GWT clause has an observable output/state assertion; no mock-call-only Then
- [ ] `tripwire setup-agent-hooks` DepShield path exits as specified; literal stdout/exit in evidence
- [ ] `./scripts/quality-gates.sh` exit 0 recorded in `docs/plan/gate-evidence/slice-33.json`
- [ ] Coverage target recorded (set at AT design) and met
- [ ] Complexity evidence: **enforcing** for product-code via quality-gates
- [ ] `docs/plan/gate-evidence/slice-33.json` review records `acceptance` + `implementation` APPROVED
- [ ] Evidence verdict `PASS` with commands, coverage, complexity

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README / QUICKSTART setup path | Update if install steps change |
| 2 | Inline comments (non-obvious) | As needed |
| 3 | Function signatures documented | Public CLI surface only |
| 4 | Error paths documented | Missing DepShield precondition message |
| 5 | CHANGELOG entry | If public install behaviour ships |
| 6 | Architecture doc | Note DepShield as pluggable install add-on |
| 7 | API / CLI help | `setup-agent-hooks` help reflects DepShield |
| 8 | Config/env vars | Document DepShield-required env/keys |
| 9 | Examples | One setup command example |
| 10 | Deprecated features | N/A unless replacing prior path |
| 11 | Migration guide | N/A for first add |
| 12 | Troubleshooting | Install failure guidance |
| 13 | Related links | TRAIL ↔ gate-evidence ↔ slice 34 |
| 14 | No orphaned file references | OK |

## Gate Status

📋 PLANNED
