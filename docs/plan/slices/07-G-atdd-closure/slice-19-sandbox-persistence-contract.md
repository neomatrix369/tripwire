# Slice 19: Sandbox Persistence State Contract

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

Each sandbox scan leaves an exact, auditable Supabase state: scanner progress and outcomes, findings, item quality, final run state, and a single rollup all agree.

## GWT acceptance specification

1. **Operator gets one coherent completed-scan record** `@contract-shape:bounded-change`
   - Given scanner start and completion events containing a finding and quality score, when the public sandbox scan composition runs, then each announced scanner row transitions from running to its exact final row, the finding has the correct item/run IDs, the item quality is updated, and the run finishes with one rollup.
2. **Operator sees a failed scan rather than false completion** `@contract-shape:bounded-change`
   - Given acquisition or scanner execution raises, when the public sandbox scan composition ends, then the run is failed with a completion timestamp, exactly one failure rollup occurs, and no completed write follows.
3. **Retries preserve one coherent scanner record** `@contract-shape:bounded-change`
   - Given repeated scanner completion callbacks or a retry after the running placeholder was not written, when the result is persisted, then exactly one final row exists for that `(scan_run_id, scanner_source)` identity and it contains the final status, timestamps, checks, detail, and console evidence.
4. **An existing installation upgrades before a scan starts** `@contract-shape:bounded-change`
   - Given the legacy schema probe is ready but migration version `20260807` is absent, when the public setup/preflight path runs, then it applies the migration transactionally and records the version before allowing a scan.
5. **A finalization fault cannot leave a mixed scan state** `@contract-shape:bounded-change`
   - Given scanner result persistence succeeds but finalization faults, when the scan ends, then the finalization transaction rolls back its run/item/rollup changes and the compensating failure path records one failed run with one rollup.

## Design / test treatment

- Extract the current public scan composition behind an injected Supabase port, while retaining `scan_item` as the Modal/environment adapter. Drive that production composition—not the private `_scan_item_inner` helper—through a deterministic scanner callback fake.
- Add a small in-memory Supabase port fake in sandbox tests; record rows, upserts, timestamps, and RPC events rather than asserting `MagicMock.called`.
- Add versioned migration `db/migrations/20260807_scan_run_scanner_identity.sql`, recorded in `schema_migrations` and applied transactionally by the setup/preflight migration runner even when the legacy `completed_at` probe is ready. It retains the duplicate survivor ordered by `completed_at DESC NULLS LAST, started_at DESC NULLS LAST, id DESC`, then adds the `(scan_run_id, scanner_source)` unique constraint.
- Add one transactional `tripwire_persist_scanner_result` RPC: lock/upsert the scanner row on `(scan_run_id, scanner_source)`, replace that scanner’s findings for the run, insert its supplied findings, and return a durable result. A persistence/RPC error marks the scan failed and rolls it up; it must never be log-only success.
- Add transactional `tripwire_finalize_scan`: lock the run, set final status/completion time and item quality, invoke the rollup, and commit as one operation. If finalization fails, its transaction rolls back and the worker uses one explicit compensating `tripwire_fail_scan` transaction; fault injection proves no durable mixed running/completed state.
- New acceptance tests carry `CONTRACT_SHAPE: bounded-change` and `Outcome anchor: Operator gets one coherent scan record` in their docstrings.

| Expected observable event | Completed scan | Failed scan | Retry |
|---|---|---|---|
| scanner record | running → final | no completed row | one final row |
| scan run | final overall status | failed + completion time | unchanged final status |
| item rollup | once in finalization | once in compensating failure | no duplicate rollup |

**Test inventory (≤8 acceptance tests):** completed record; acquisition failure; scanner failure; replayed callback; public ready-probe upgrade; migration survivor/constraint; persistence-RPC failure; finalization-fault compensation.
- Keep unit tests for helper error translation; classify them as implementation regressions, not acceptance evidence.

## Before-Checks [GATE]

- [ ] `uv run pytest sandbox/tests -q --cov=sandbox` output is recorded in `docs/plan/gate-evidence/slice-19.json`
- [ ] The in-memory port fake's accepted operations are listed in `docs/plan/gate-evidence/slice-19.json`
- [ ] `bash scripts/test-schema-contract.sh scan_run_scanner_identity` records duplicate-survivor and version-`20260807` results in evidence

## TDD execution

RED: write the five GWT state-contract scenarios against the fake port, public preflight, and a schema assertion for the unique identity.
GREEN: introduce the injected composition seam, versioned migration runner, transactional persistence/finalization RPCs, and conflict-safe upserts required by the contract.
REFACTOR: keep the fake focused on externally observable Supabase behavior, not query-builder implementation detail.

## After-Checks [GATE]

- [ ] Exact rows, IDs, statuses, timestamps, and rollup payloads are asserted for success/failure/retry
- [ ] Schema contract proves `(scan_run_id, scanner_source)` is database-unique and the completed-row upsert cannot create a duplicate
- [ ] Public ready-probe preflight test proves absent version `20260807` applies transactionally before scan dispatch
- [ ] Finalization fault injection proves one compensating failed state and no mixed run/item/rollup state
- [ ] `(cd cli && npm test)` exits 0 for the public setup/preflight acceptance case; literal stdout and exit code are recorded in evidence
- [ ] `uv run pytest sandbox/tests -q` and `./scripts/quality-gates.sh` exit 0; literal stdout and exit codes are recorded in evidence
- [ ] Wrong table, missing finding, duplicate scanner row, incorrect final status, and second rollup each make a scenario fail
- [ ] Coverage target: governed `sandbox/` remains ≥95%; `guard/` remains excluded
- [ ] Complexity evidence: **enforcing** via `./scripts/quality-gates.sh`, with `.reports/complexity/pr-body.md` reviewer summary
- [ ] `docs/plan/gate-evidence/slice-19.json.review` records `acceptance: APPROVED` and `implementation: APPROVED`
- [ ] `docs/plan/gate-evidence/slice-19.json` records commands, coverage, complexity, reviewer verdicts, and `PASS`
- [ ] `docs/plan/gate-evidence/slice-19.json.documentation_audit` records the changed persistence-operation path and `rg` result, or `N/A` with reason

## Gate Status

📋 PLANNED
