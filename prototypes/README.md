# Prototypes

Reference UX and demo assets. Not the shipped product UI.

| Path | What |
|------|------|
| `dc-dashboard/` | Data Commons HTML dashboard (`Tripwire.dc.html` + `support.js`). Supports **live Supabase** data or mock data (`tripwire-data.js`). |

## Viewing the dashboard

The **data-source dropdown** lives on the **Guard** tab (the control page for monitoring settings). Switching between Live (Supabase) and Mock (demo data) there applies globally — Dashboard, CLI, and Guard tabs all use the selected source. The choice persists via `sessionStorage`, defaulting to **Live**.

A **status chip** appears next to the data-source dropdown on the **Guard** tab, showing the resolved connection state. It is not displayed on the main Dashboard header.

Status chip meanings:

- **Live · Realtime** — Supabase Realtime subscribed; updates within ~1s of Modal writes
- **Live · Supabase** — items loaded from Supabase (poll-only or initial load)
- **Live · empty** — connected; 0 items (not demo data)
- **Demo data** — Mock selected
- **Missing API key** — Live selected but browser config has no usable key (shows demo data)
- **Connection error** — configured but fetch failed (shows demo data)

There is no “fallback…” chip wording. When Realtime is unavailable, in-flight scans still
refresh via an **8s poll** (or 30s while Realtime is connected and a run is `running`).

### Why you may see “Live” + “Missing API key”

Dropdown = **Live**; chip = **Missing API key** when `tripwire-dashboard.config.js` loads with empty `SUPABASE_ANON_KEY` (common if only `SUPABASE_SERVICE_ROLE_KEY` is in `.env`). Live mode does **not** call Supabase in that case.

### Demo data

Select **Mock (demo data)**, or open the HTML without a working Live config.

### Live Supabase data

**Recommended (works with service_role already in `.env`):**

```bash
node scripts/serve-dashboard.mjs
# http://127.0.0.1:8765/Tripwire.dc.html → Live (Supabase)
```

Writes a local-only config pointing at the 127.0.0.1 REST proxy (never puts `service_role` in the browser).

**Direct browser → Supabase** (needs `SUPABASE_ANON_KEY` in `.env`):

```bash
./scripts/sync-dashboard-config.sh
cd prototypes/dc-dashboard && python3 -m http.server 8765
```

If the chip says **Missing API key**, `tripwire-dashboard.config.js` has URL but an empty anon key — Live never calls Supabase. Set anon + sync, or use `serve-dashboard.mjs`.

Also run `tripwire setup --force` once so anon SELECT policies + GRANTs + Realtime
publication from `db/schema.sql` are applied. The CLI probe also checks
`scan_run_scanners.completed_at` — stale DBs without console/timestamp columns trigger
re-apply on the next setup or first scan.

**Never put `service_role` in the browser config.**

### In-flight scans (Live)

While Modal writes results, cards show **SCANNING** (execution status wins over stale
heatmap). Open a card’s scanner drawer to see per-engine progress, **Modal console
output** (`console_output`), and durations from `started_at`/`completed_at`. Partial
failures surface copy like “**n out of m scanners unreachable — risk from completed
engines**”. Without the schema migration, scans still complete but console columns and
Realtime may be absent (Modal falls back to legacy-safe inserts).

## Database bootstrap

```bash
tripwire setup                 # or ./scripts/setup-supabase.sh
tripwire setup --force         # re-apply after schema.sql changes (console + Realtime)
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` in `.env`.

## Tests

```bash
cd prototypes/dc-dashboard && npm test
```

Covers Live config gating, mocked Supabase fetches, SCANNING/in-flight mapping,
console output relay, Realtime module wiring, unreachable partial-failed copy, and chip
labels. Optional Live smoke runs only when `tripwire-dashboard.config.js` has a real URL
+ key (skipped otherwise — not a CI failure). `npm test` — 36 pass, 1 skipped.

---

<!-- Primary stack -->
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

<!-- Scanner & partner -->
[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Overmind](https://img.shields.io/badge/Overmind-Phase%205-6B7280?style=flat)](https://overmind.tech)
[![Ossprey](https://img.shields.io/badge/Ossprey-Sponsor-0F766E?style=flat)](https://www.ossprey.com/?utm_source=luma)
