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

> **Never toggle RLS via the Supabase UI.** Enabling or disabling row-level
> security through the dashboard creates the lock without the matching policies
> and grants, which silently blocks the browser dashboard (anon key) while the
> CLI still works (service role bypasses RLS). Always manage schema through
> `tripwire setup --force` or `./scripts/setup-supabase.sh --force` — these
> apply RLS, policies, and grants together in one idempotent step.

## 5. Verify

Confirm the anon key (what the browser uses) can reach all tables:

```bash
./scripts/check-supabase.sh
```

Expected output:

```
  ✓ anon SELECT items
  ✓ anon SELECT scan_runs
  ✓ anon SELECT scan_run_scanners
  ✓ anon SELECT findings

OK: all tables readable by the anon key.
```

If any table shows HTTP 401 or 403, the script prints the fix command
(`tripwire setup --force`).

## 6. Data API max rows (Live dashboard fleet size)

Supabase’s **Data API** (PostgREST) caps every REST response at **Max rows**
(default **1000**). Tripwire’s Live dashboard reads **`dashboard_latest_runs`**
(one row per item) and **batches** `scan_run_scanners` / `findings` fetches (~40
run IDs per request). With a large fleet, a low Max rows setting can still
truncate responses. Symptoms:

- Detail drawer shows **`Scanner outputs (0)`** even though Supabase has rows for
  that scan run
- Card shows a recent **Last scan** time but no scanner list
- New Tessl rows (`Tessl: Lint`, `Tessl: Review (Quality)`,
  `Tessl: Scenario Generation`, `Tessl: Eval`) missing while older `"Tessl"` rows
  still appear on other items

This limit is **not** in `.env` or repo config — it is a **project setting** on
Supabase.

### Raise Max rows (Tripwire live project)

1. Open **Integrations → Data API → Settings** for the live project:
   [Data API settings](https://supabase.com/dashboard/project/pdvaedgtternbfkztpkq/integrations/data_api/settings)
2. Find **Max rows** — *“The maximum number of rows returned from a view,
   table, or function. Limits payload size for accidental or malicious requests.”*
3. Set it **above your fleet’s latest-run scanner row count** (e.g. **2000** or
   **5000** when you have hundreds of items). Save.

For another Supabase project: **Dashboard → your project → Integrations → Data
API → Settings → Max rows**.

After raising the cap, hard-refresh the Live dashboard (`serve-dashboard.mjs`,
Guard → Live). Run `tripwire setup --force` once if upgrading to a release that
adds the `dashboard_latest_runs` view (required for per-item latest state).

> **Note:** The dashboard queries `dashboard_latest_runs` instead of a global
> `scan_runs?limit=2000` page, and batches child-table fetches. Historic
> `scan_runs` rows remain in Postgres until you define a retention policy.

## Next

→ [modal-setup.md](./modal-setup.md) · optional router:
[tiered-router-setup.md](./tiered-router-setup.md) ·
full run: [QUICKSTART → Live](../../QUICKSTART.md#live-advanced)
