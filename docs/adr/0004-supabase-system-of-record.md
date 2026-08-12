# ADR-0004: Supabase/Postgres as system of record

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** storage, supabase, postgres, realtime

## Context

Scan runs, per-scanner status, and findings must be shared between the CLI
(writer), the Modal sandbox (writer), and a browser dashboard (reader) with
near-live updates. A local SQLite file cannot serve the dashboard or the
sandbox. A custom REST API would duplicate what PostgREST already provides.

The product heatmap needs a server-side rollup so the UI does not recompute
risk from raw findings on every poll.

## Decision

Use **hosted Supabase (Postgres + PostgREST + Realtime)** as the Live store.

- Canonical DDL: `db/schema.sql` (items, scan_batches, scan_runs,
  scan_run_scanners, findings, coverage, config).
- Heatmap: `tripwire_rollup_item` in Postgres. `partial-failed` still scores
  completed engines; `failed` / `running` / empty partial paint `error`.
- Realtime publication on `scan_runs`, `scan_run_scanners`, `findings` so the
  dashboard can update in ~1s, with an 8s poll fallback.
- HTTP clients use `SUPABASE_URL` + keys; DDL uses `SUPABASE_DB_URL`
  (prefer Session pooler if Direct `db.*` does not resolve).

Raw scanner blobs in Supabase Storage were specified as a dual-write path in
adapter research; they are **not** implemented. Normalized `findings` rows are
the shipped contract.

## Consequences

- Live requires a Supabase project; schema and RLS must be applied together
  ([ADR-0008](./0008-anon-read-service-role-write.md),
  [ADR-0011](./0011-idempotent-sql-schema-bootstrap.md)).
- Application code speaks PostgREST column names; missing columns are handled
  with PGRST204-safe fallbacks in the sandbox.
- Other databases are future package flavors only after the app boundary
  allows it ([ADR-0001](./0001-monk-deployment-and-packaging.md)).

## Alternatives considered

### A. Self-hosted Postgres + custom API

Rejected for Horizon A: extra ops surface; PostgREST + Realtime already match
the dashboard’s read model.

### B. SQLite / JSON files on the operator machine

Rejected: sandbox and browser cannot share that store.

## References

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) §2–3
- [docs/user-guide/supabase-setup.md](../user-guide/supabase-setup.md)
- [docs/research/adapters/scanner-output-adapters.md](../research/adapters/scanner-output-adapters.md) §0
