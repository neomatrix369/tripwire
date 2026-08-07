# Slice 18: CLI Operator Evidence Contracts

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

The operator can trust the public `tripwire scan` command: it reports a real
discovery result without dispatching in preview mode, and reports correlated
successes/failures instead of a false success.

## GWT acceptance specification

1. **Operator is protected from an unsafe scan start** `@contract-shape:bounded-change`
   - Given the `completed_at` schema probe returns an authentication or network error,
     when an operator starts a scan, then the command fails before persistence or sandbox dispatch.
2. **Operator can preview without starting work** `@contract-shape:bounded-change`
   - Given an explicit target, when the operator uses `--dry-discover`, then the target list is emitted and no scan dispatch occurs.
3. **Operator receives an accountable batch result** `@contract-shape:bounded-change`
   - Given two targets and one sandbox dispatch fails, when the batch completes, then the output contains one batch ID, the successful target's distinct run ID, and one exact failed-target `{target,error}` entry; the command exits nonzero.
   - Given two targets both dispatch successfully, when the batch completes, then exactly one batch row persists its count and requested concurrency, and each target is correlated with a distinct run ID.
4. **Operator receives usable invalid-input guidance** `@contract-shape:bounded-change`
   - Given an invalid `--concurrency` value, when an operator invokes `tripwire scan`, then the executable exits nonzero with an actionable validation message before discovery, persistence, or dispatch.
5. **Operator receives usable target-input guidance** `@contract-shape:bounded-change`
   - Given malformed `--targets` JSON, when an operator invokes `tripwire scan`, then the executable exits nonzero with an actionable parsing message and never reports a successful scan.
6. **Installed command remains reachable** `@contract-shape:unbounded-preservation` `@walking_skeleton`
   - Given a supported local command environment, when an operator invokes installed `tripwire scan --dry-discover`, then the displayed preview identifies the selected target and confirms that no scan starts.

## Design / test treatment

- Extract the Commander composition into an injectable production program/runner; `cli/bin/tripwire.js` remains the thin executable adapter.
- Treat console output and exit status as the driving-port contract. Drive scenarios 1–5 in-process through the real injectable program/runner with fake output, Supabase, and Modal ports; retain scenario 6 as the sole installed-command walking skeleton.
- Extend the existing orchestrator fake so distinct target runs have distinct IDs and persisted batch/run correlation can be asserted.
- Define one authoritative program result and exit mapping: all-success returns `{batch_id, successful_run_ids, failures: []}` and exits 0; any target failure returns `{batch_id, successful_run_ids, failures: [{target,error}]}` and exits 1. Validate concurrency as a positive safe integer before `discoverTargets` (reject zero, negatives, decimal, NaN, and overflow).
- New acceptance tests carry `CONTRACT_SHAPE: bounded-change` (or `unbounded-preservation` for the walking skeleton) and `Outcome anchor: Operator receives an accountable scan result` in their docstrings.

**Test inventory (≤6 acceptance tests):** schema error; dry preview; partial batch; successful two-target batch; invalid-input table; installed-command walking skeleton.

## Before-Checks [GATE]

- [ ] Branch `slice/18-cli-operator-evidence` created from current `main`
- [ ] Existing CLI coverage baseline recorded
- [ ] Existing `runScan` public result shape documented in test fixture

## TDD execution

RED: add the six GWT scenarios at the program boundary.  
GREEN: introduce only the composition/output seam required to make the public contract observable.  
REFACTOR: preserve the published CLI arguments and the ≥95% lines/statements/functions and ≥85% branch floors.

## After-Checks [GATE]

- [ ] CLI program acceptance scenarios and the one installed-command walking skeleton pass
- [ ] Each GWT clause has an observable output/state assertion; no mock-call-only Then clause
- [ ] `(cd cli && npm run lint && npm run test:coverage)` passes
- [ ] Coverage target: CLI source plus bin remains ≥95% lines/statements/functions and ≥85% branches
- [ ] Complexity evidence: **enforcing**; `./scripts/quality-gates.sh` writes `.reports/complexity/pr-body.md`, and CI replaces its stable PR marker
- [ ] nWave acceptance and software-crafter reviewers approve the slice before implementation closes
- [ ] `docs/plan/gate-evidence/slice-18.json` records commands, coverage, complexity, reviewer verdicts, and `PASS`
- [ ] Documentation audit: command help/user docs reviewed; N/A outcome recorded if unchanged

## Gate Status

📋 PLANNED
