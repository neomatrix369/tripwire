# Slice 34: Tripwire → DepShield Pluggable Dispatch

> Scenario: Brownfield | MoSCoW: Should | Phase: H4 | Depends on: 33

## Outcome

After DepShield is installable via `setup-agent-hooks`, Tripwire can dispatch
eligible scans to DepShield through the same pluggable scanner dispatch layer —
operators see DepShield results correlated like existing scanners.

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS`.

1. **Operator can dispatch a scan through DepShield** `@contract-shape:bounded-change`
   - Given DepShield is installed (slice 33) and a target is eligible,
     when the operator submits a scan that selects DepShield dispatch,
     then Tripwire invokes DepShield and records an observable run/scanner
     identity (or documented stub equivalent under test doubles).
2. **Dispatch failure is accountable, not silent success** `@contract-shape:bounded-change`
   - Given DepShield returns an error or is unreachable,
     when dispatch completes,
     then the operator-facing result exits nonzero / reports failure without
     claiming a successful DepShield scan.
3. **Other scanners remain reachable** `@contract-shape:unbounded-preservation`
   - Given DepShield is wired,
     when an operator runs an existing non-DepShield scan path,
     then prior scanner behaviour is preserved (no regressions to Phase 1 path).

## Design / test treatment

- Add DepShield as a **pluggable** dispatch adapter in Tripwire’s scanner
  dispatch layer (same pattern intended for Ossprey in H5) — not a fork of
  `tripwire scan` UX.
- Prefer fakes/contracts at the dispatch port for ATs; live DepShield smoke is
  optional evidence, not a substitute for contract assertions.
- Coverage target TBD at AT design before `IN PROGRESS`.

**Test inventory (≤7 acceptance tests):** happy dispatch; failure path;
preservation of existing scanner path; config/flag selection if applicable;
correlation IDs present.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] `docs/plan/gate-evidence/slice-33.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] Branch `slice/34-depshield-dispatch` created from Wave H integration branch
- [ ] DepShield install seam from slice 33 is available on the branch under test

## TDD execution

RED: write dispatch-port GWT scaffolds (success + failure + preservation).
GREEN: implement the DepShield adapter and wiring only as required.
REFACTOR: keep adapter boundaries clean for Ossprey (slice 36) reuse.

## After-Checks [GATE]

- [ ] Each GWT clause has an observable output/state assertion; no mock-call-only Then
- [ ] DepShield dispatch success and failure scenarios pass; evidence records commands
- [ ] Existing scanner regression check recorded (command + exit 0)
- [ ] `./scripts/quality-gates.sh` exit 0 recorded in `docs/plan/gate-evidence/slice-34.json`
- [ ] Coverage target recorded (set at AT design) and met
- [ ] Complexity evidence: **enforcing** for product-code via quality-gates
- [ ] Review APPROVED for acceptance + implementation; evidence verdict `PASS`

## Human test checkpoint (Phase H4)

**Stop after this slice for a human test checkpoint** before treating H4 as
complete and before relying on DepShield in full-chain validation (slice 38).
Operator confirms: install (33) + dispatch (34) behave as expected in a live or
demo environment.

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README / operator docs | Mention DepShield as optional scanner if public |
| 2 | Inline comments | Adapter invariants |
| 3 | Function signatures | Dispatch port / adapter public surface |
| 4 | Error paths | Unreachable DepShield messaging |
| 5 | CHANGELOG | If public scan behaviour changes |
| 6 | Architecture | Pluggable scanner diagram/note |
| 7 | API / CLI | Flags or config selecting DepShield |
| 8 | Config/env vars | DepShield dispatch keys |
| 9 | Examples | One scan-with-DepShield example |
| 10 | Deprecated features | N/A |
| 11 | Migration guide | N/A |
| 12 | Troubleshooting | Dispatch failure |
| 13 | Related links | slice 33 → 34 → 38; TRAIL H4 |
| 14 | No orphaned file references | OK |

## Gate Status

📋 PLANNED
