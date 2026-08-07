# Slice 21: Dashboard Latest-State Accuracy

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

Every dashboard card reflects its actual latest scan, regardless of unrelated global scan history.

## GWT acceptance specification

1. **Every dashboard card has a trustworthy newest result** `@contract-shape:bounded-change`
   - Given an ephemeral repository-supported Postgres/Supabase schema with more than 200 newer runs for other items and two timestamp-tied runs for a target item, when `dashboard_latest_runs` is queried as dashboard roles, then it returns exactly one row per item and the target's deterministic latest row.
2. **An operator sees the item’s actual newest scan** `@contract-shape:bounded-change`
   - Given more than 200 newer runs belonging to other items, when the dashboard loads an item whose latest run lies outside that former global page, then its card shows that item’s real latest state.

## Design / test treatment

- Add `CREATE OR REPLACE VIEW dashboard_latest_runs WITH (security_invoker = true)` through the existing schema mechanism. It uses `DISTINCT ON (item_id)` with deterministic `ORDER BY item_id, started_at DESC, id DESC`, projects every `scan_runs` column used by `tripwire-live.js`, and grants `SELECT` to `anon, authenticated`; add matching authenticated RLS read policy alongside the existing anon policy.
- Query `dashboard_latest_runs` from `tripwire-live.js`; prohibit only REST `/scan_runs?` latest-state fetches. Realtime continues to subscribe to its base scan tables because the view is not a publication stream.
- Add `scripts/test-schema-contract.sh dashboard_latest_runs`, which starts pinned `postgres:16.6-alpine` in Docker, applies `db/schema.sql`, creates `anon`/`authenticated` roles, seeds contract rows, runs `SET ROLE anon` and `SET ROLE authenticated` view assertions, and removes the named temporary container in a trap. The executable gate is `bash scripts/test-schema-contract.sh dashboard_latest_runs`. Use a mock HTTP port for browser rendering; neither test requires hosted Supabase.
- New acceptance tests carry `CONTRACT_SHAPE: bounded-change` and `Outcome anchor: Every dashboard card shows its newest scan` in their docstrings.

**Test inventory (≤5 acceptance tests):** migration/view shape; anon access; authenticated access; >200/tie latest result; REST view rendering/no base-table fetch.

## Before-Checks [GATE]

- [ ] Existing dashboard test baseline recorded
- [ ] View migration/policy compatibility checked against current schema and dashboard read access

## TDD execution

RED: add the database view/access and browser rendering GWTs; replace the `limit=200` expectation with the latest-per-item assertion.  
GREEN: add the view and query it from the Live dashboard adapter.  
REFACTOR: keep dashboard source boundaries unchanged except the latest-run data source.

## After-Checks [GATE]

- [ ] >200 unrelated-run scenario proves per-item latest state
- [ ] Migration test proves security-invoker access, deterministic tie-breaking, and one latest row per item
- [ ] Live adapter requests `dashboard_latest_runs` and never `scan_runs`
- [ ] `bash scripts/test-schema-contract.sh dashboard_latest_runs` passes
- [ ] `(cd prototypes/dc-dashboard && npm test && npm run lint)` and `./scripts/quality-gates.sh` pass
- [ ] Coverage/complexity policy: dashboard remains **excluded** from governed thresholds by the recorded scope decision; tests remain mandatory
- [ ] Complexity evidence: **reporting only** for prototype dashboard; `cd prototypes/dc-dashboard && npx eslint -c eslint.complexity.config.js *.js` passes or its warnings are recorded verbatim in gate evidence, without changing excluded thresholds
- [ ] nWave acceptance and software-crafter reviewers approve the slice before implementation closes
- [ ] `docs/plan/gate-evidence/slice-21.json` records commands, test results, complexity report, reviewer verdicts, scope exclusion, and `PASS`
- [ ] Documentation audit: dashboard data behavior reviewed and updated if public behavior changes

## Gate Status

📋 PLANNED
