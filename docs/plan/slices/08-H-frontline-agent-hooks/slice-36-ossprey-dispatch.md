# Slice 36: Tripwire → Ossprey Dispatch

> Scenario: Brownfield | MoSCoW: Should | Phase: H5 | Depends on: 35

## Outcome

Once Ossprey access is confirmed (slice 35 unblocked + PASS), Tripwire can
dispatch eligible scans to Ossprey through the pluggable scanner dispatch layer,
mirroring DepShield wiring (slice 34).

## GWT acceptance specification

> Thin scaffolds — full DISTILL ATs before any `IN PROGRESS` **after slice 35 PASS**.

1. **Operator can dispatch a scan through Ossprey** `@contract-shape:bounded-change`
   - Given Ossprey access is confirmed and configured,
     when the operator submits a scan that selects Ossprey dispatch,
     then Tripwire invokes Ossprey and records an observable run/scanner identity
     (or documented stub under test doubles).
2. **Dispatch failure is accountable** `@contract-shape:bounded-change`
   - Given Ossprey errors or is unreachable,
     when dispatch completes,
     then the operator-facing result does not claim false success.
3. **DepShield and baseline scanners remain intact** `@contract-shape:unbounded-preservation`
   - Given Ossprey is wired,
     when DepShield or baseline scan paths run,
     then prior behaviour is preserved.

## Design / test treatment

- Reuse the pluggable dispatch adapter pattern from slice 34; Ossprey is another
  adapter, not a parallel CLI.
- **Do not start** until slice 35 gate evidence shows PASS (access confirmed).
- Prefer contract tests with fakes; live Ossprey smoke optional after access.
- Coverage target TBD at AT design before `IN PROGRESS`.

**Test inventory (≤7 acceptance tests):** happy dispatch; failure path;
preservation vs DepShield/baseline; config selection if applicable.

## Before-Checks [GATE]

- [ ] `docs/plan/gate-evidence/slice-32.json` has `"verdict": "PASS"` (or waived in DECISIONS)
- [ ] `docs/plan/gate-evidence/slice-35.json` has `"verdict": "PASS"` (Ossprey access confirmed; not BLOCKED)
- [ ] Branch `slice/36-ossprey-dispatch` created from Wave H integration branch
- [ ] Ossprey credentials available out-of-band per DECISIONS (values never in evidence)

## TDD execution

RED: Ossprey adapter GWT scaffolds (success + failure + preservation).
GREEN: implement adapter/wiring only as required.
REFACTOR: share dispatch-port patterns with DepShield.

## After-Checks [GATE]

- [ ] Each GWT clause has an observable output/state assertion; no mock-call-only Then
- [ ] Ossprey dispatch success and failure scenarios pass; commands in evidence
- [ ] Preservation check for DepShield/baseline recorded
- [ ] `./scripts/quality-gates.sh` exit 0 recorded in `docs/plan/gate-evidence/slice-36.json`
- [ ] Coverage target recorded (set at AT design) and met
- [ ] Complexity evidence: **enforcing** for product-code
- [ ] Review APPROVED; evidence verdict `PASS`

## Doc Audit (14-row checklist)

| # | Item | Check |
|-|------|-------|
| 1 | README / badges | Add Ossprey claims only when VERIFIED |
| 2 | Inline comments | Adapter invariants |
| 3 | Function signatures | Dispatch adapter surface |
| 4 | Error paths | Unreachable Ossprey messaging |
| 5 | CHANGELOG | If public scan behaviour changes |
| 6 | Architecture | Pluggable scanners include Ossprey |
| 7 | API / CLI | Selection flags/config |
| 8 | Config/env vars | Key names (no secrets) |
| 9 | Examples | One Ossprey dispatch example |
| 10 | Deprecated features | N/A |
| 11 | Migration guide | N/A |
| 12 | Troubleshooting | Auth/access failures |
| 13 | Related links | 35 → 36 → 38 |
| 14 | No orphaned file references | OK |

## Gate Status

📋 PLANNED — blocked in practice until slice 35 unblocks and PASSes
