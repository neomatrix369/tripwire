# Slice 21: Dashboard Latest-State Accuracy

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

Every dashboard card reflects its actual latest scan, regardless of unrelated global scan history.

## GWT acceptance specification

1. **Every dashboard card has a trustworthy newest result** `@contract-shape:bounded-change`
   - Given more than 200 newer runs for other items and two equally timed runs for one target, when Live data is prepared, then the target card has exactly one deterministic newest result.
2. **An operator sees the item’s actual newest scan** `@contract-shape:bounded-change`
   - Given more than 200 newer runs belonging to other items, when the dashboard loads an item whose latest run lies outside that former global page, then its card shows that item’s real latest state.

## Design / test treatment

- Add `CREATE OR REPLACE VIEW dashboard_latest_runs WITH (security_invoker = true)` through the existing schema mechanism. It uses `DISTINCT ON (item_id)` with deterministic `ORDER BY item_id, started_at DESC, id DESC`, projects every `scan_runs` column used by `tripwire-live.js`, and grants `SELECT` to `anon, authenticated`; add matching authenticated RLS read policy alongside the existing anon policy.
- Query `dashboard_latest_runs` from `tripwire-live.js`; prohibit only REST `/scan_runs?` latest-state fetches. Realtime continues to subscribe to its base scan tables because the view is not a publication stream.
- Add `scripts/test-schema-contract.sh dashboard_latest_runs`, which starts pinned `postgres:16.6-alpine` in Docker, applies `db/schema.sql`, creates `anon`/`authenticated` roles, seeds contract rows, runs `SET ROLE anon` and `SET ROLE authenticated` view assertions, and removes the named temporary container in a trap. The executable gate is `bash scripts/test-schema-contract.sh dashboard_latest_runs`. Use a mock HTTP port for browser rendering; neither test requires hosted Supabase.
- New acceptance tests carry `CONTRACT_SHAPE: bounded-change` and `Outcome anchor: Every dashboard card shows its newest scan` in their docstrings.

**Test inventory (≤5 acceptance tests):** migration/view shape; anon access; authenticated access; >200/tie latest result; REST view rendering/no base-table fetch.

## Before-Checks [GATE]

- [ ] `(cd prototypes/dc-dashboard && npm run test:coverage)` output is recorded in `docs/plan/gate-evidence/slice-21.json`
- [ ] `bash scripts/test-schema-contract.sh dashboard_latest_runs` records the view/RLS compatibility result in `docs/plan/gate-evidence/slice-21.json`

## TDD execution

RED: add the database view/access and browser rendering GWTs; replace the `limit=200` expectation with the latest-per-item assertion.
GREEN: add the view and query it from the Live dashboard adapter.
REFACTOR: keep dashboard source boundaries unchanged except the latest-run data source.

## After-Checks [GATE]

- [ ] >200 unrelated-run scenario proves per-item latest state
- [ ] Migration test proves security-invoker access, deterministic tie-breaking, and one latest row per item
- [ ] `tripwire-live.js` has no REST `supabaseGet(..., "scan_runs", ...)` latest-state request; base-table Realtime subscriptions remain permitted
- [ ] `bash scripts/test-schema-contract.sh dashboard_latest_runs` passes
- [ ] `(cd prototypes/dc-dashboard && npm test && npm run lint)` and `./scripts/quality-gates.sh` pass
- [ ] Coverage/complexity policy: dashboard remains **excluded** from governed thresholds by the recorded scope decision; tests remain mandatory
- [ ] Complexity evidence: **reporting only** for prototype dashboard; `cd prototypes/dc-dashboard && npx eslint -c eslint.complexity.config.js *.js` passes or its warnings are recorded verbatim in gate evidence, without changing excluded thresholds
- [ ] `docs/plan/gate-evidence/slice-21.json.review` records `acceptance: APPROVED` and `implementation: APPROVED`
- [ ] `docs/plan/gate-evidence/slice-21.json` records commands, test results, complexity report, reviewer verdicts, scope exclusion, and `PASS`
- [ ] `docs/plan/gate-evidence/slice-21.json.documentation_audit` records the updated public dashboard path and `rg` result, or `N/A` with reason

## Gate Status

📋 PLANNED
