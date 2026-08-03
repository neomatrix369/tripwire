# Supabase setup

> Required for Live scans. Do this **before** `cp .env.example .env` when you
> want to store findings in Supabase.

## 1. Create a project

1. Sign in at [supabase.com](https://supabase.com).
2. Create a project; wait until it is healthy (not paused).
3. Open **Project Settings → API**.

## 2. Copy API values

| Key | Where in Supabase UI | Used for |
|-----|----------------------|----------|
| `SUPABASE_URL` | Project Settings → API → Project URL (`https://<ref>.supabase.co`) | HTTP clients (CLI probe, Modal, Live dashboard) |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` | Browser Live mode (RLS reads) or omit and use `serve-dashboard.mjs` proxy |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` | Server writes; Modal secret `tripwire-supabase` |

Never put `service_role` in browser-facing config. Prefer `node scripts/serve-dashboard.mjs` (local proxy) if you skip the anon key.

## 3. Database URL (DDL)

`SUPABASE_DB_URL` is a `postgresql://…` URI for `tripwire setup` / first-scan DDL. It is **not** the HTTP API URL.

1. Open **Project Settings → Database**.
2. Prefer **Session pooler** if Direct `db.<ref>.supabase.co` fails DNS (`ENOTFOUND`).
3. Formats (fill password / ref / region):

```text
# Direct
postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres

# Session pooler
postgresql://postgres.<ref>:...@aws-0-<region>.pooler.supabase.com:5432/postgres
```

## 4. Apply schema

After keys are in `.env` (see [env-vars.md](./env-vars.md)):

```bash
cd cli && npm install && npm link && cd ..
tripwire setup
# or: ./scripts/setup-supabase.sh
# After schema pulls: tripwire setup --force
```

## Next

→ [modal-setup.md](./modal-setup.md) · full run: [QUICKSTART → Live capabilities](../../QUICKSTART.md#live-capabilities)
