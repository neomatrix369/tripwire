# Prototypes

Reference UX and demo assets. Not the shipped product UI.

| Path | What |
|------|------|
| `dc-dashboard/` | Data Commons HTML dashboard (`Tripwire.dc.html` + `support.js`). Open `Tripwire.dc.html` in a browser from that folder. Supports **live Supabase** data or falls back to mock data (`tripwire-data.js`). |

## Viewing the dashboard

A **data-source dropdown** in the header lets you switch between Live (Supabase) and Mock (demo data). The choice persists across refreshes via `sessionStorage`, defaulting to **Live** when no preference is stored.

The status chip next to the dropdown always reflects the actual data state:

- **Live · Supabase** — successfully fetching from Supabase
- **Demo data** — user selected Mock in the dropdown
- **Fallback · no config** — Live selected but Supabase not configured
- **Fallback · live fetch failed** — Supabase configured but the fetch errored
- **Fallback · no live items** — Supabase returned 0 items

### Demo data (no config needed)

Select **Mock (demo data)** in the dropdown, or open `dc-dashboard/Tripwire.dc.html` without a config file — the dashboard loads demo data from `tripwire-data.js`.

### Live Supabase data

1. Copy `tripwire-dashboard.config.example.js` → `tripwire-dashboard.config.js` (gitignored).
2. Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` (anon/public key from Supabase → Project Settings → API).
3. Open `Tripwire.dc.html` in a browser and ensure **Live (Supabase)** is selected in the dropdown.
4. If the live fetch fails or returns no items, data falls back to demo data automatically (chip shows the reason).

**Never use the service_role key in the browser config** — only the anon/public key (RLS-gated).

## Database bootstrap (shared with CLI)

The dashboard does not apply schema. First-time Supabase setup is:

```bash
tripwire setup                 # or ./scripts/setup-supabase.sh
# also auto-runs on the first real `tripwire scan` when tables are missing
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` in `.env`.
