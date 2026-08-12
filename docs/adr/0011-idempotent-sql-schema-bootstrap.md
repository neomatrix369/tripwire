# ADR-0011: Idempotent SQL schema bootstrap

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** schema, migrations, cli, supabase

## Context

Horizon A has one Postgres schema and a small set of additive columns
(`detail`, `console_output`, timestamps, widened scanner status). A migration
framework (Flyway, Prisma, supabase db push as the only path) would add
tooling without solving the real operator problem: a fresh project must become
queryable from `tripwire setup` or the first Live scan.

PostgREST schema cache can lag; the CLI must probe both table existence and
migration columns (`completed_at`) before declaring ready.

## Decision

Treat `db/schema.sql` as an **idempotent bootstrap script**, not a versioned
migration history.

- Apply via `tripwire setup` / first-scan auto-bootstrap (`cli/src/ensureSchema.js`)
  using `SUPABASE_DB_URL` (HTTP URL cannot run DDL).
- `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded policy
  creation, `GRANT`s, replaceable rollup function, Realtime `ALTER PUBLICATION`
  with exception handlers.
- `--force` re-applies when the probe sees missing tables **or** missing
  columns.
- Probe distinguishes missing-schema (PGRST204/205, missing relation) from
  auth/network failure ([ADR-0009](./0009-fail-closed-incomplete-evidence.md)).
- Injectable `ClientImpl` / `applySchemaFn` so unit tests never talk to live
  Postgres.

## Consequences

- There is no down-migration. Destructive changes need a new, carefully
  ordered SQL file and an operator `--force`.
- Re-running setup is safe and is the fix for RLS/GRANT drift
  ([ADR-0008](./0008-anon-read-service-role-write.md)).
- Multiple environments (dev vs demo project) are just multiple `.env` files
  pointing at different `SUPABASE_DB_URL`s.

## Alternatives considered

### A. Numbered migration files

Deferred until schema churn is high enough to need history. Today additive
`IF NOT EXISTS` is the whole story.

### B. Manual SQL Editor as the only apply path

Rejected: operators miss GRANTs/Realtime; first scan must auto-heal.

## References

- `db/schema.sql` header comment
- `cli/src/ensureSchema.js`
- [docs/user-guide/supabase-setup.md](../user-guide/supabase-setup.md)
