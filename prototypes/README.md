# Prototypes

Reference UX and demo assets. Not the shipped product UI.

[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)

Came from [QUICKSTART](../QUICKSTART.md)? Use the **Normal users** path, then return here for Live vs Mock detail.

| Path              | What                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `dc-dashboard/`   | Data Commons HTML dashboard (`Tripwire.dc.html` + `support.js`). Supports **live Supabase** data or mock data (`tripwire-data.js`). |
| `model-studio/`   | Sample CLI for Alibaba Cloud Model Studio (chat / image / video). Copy [`.env.example`](.env.example) → `prototypes/.env`, then run `python3 model-studio/model_studio.py`. See [model-studio/README.md](model-studio/README.md). |
| `sie-studio/`     | Sample CLI for Superlinked SIE (encode / score / generate on managed Qwen). Set `SIE_ENDPOINT` + `SIE_API_KEY` in [`.env.example`](.env.example) → `prototypes/.env`, then run `python3 sie-studio/sie_studio.py`. See [sie-studio/README.md](sie-studio/README.md). |

## Viewing the dashboard

The **data-source dropdown** lives on the **Guard** tab (the control page for monitoring settings). Switching between Live (Supabase) and Mock (demo data) there applies globally — Dashboard, CLI, and Guard tabs all use the selected source. The choice persists via `sessionStorage`, defaulting to **Live**.

A **status chip** appears next to the data-source dropdown on the **Guard** tab, showing the resolved connection state. It is not displayed on the main Dashboard header.

Status chip meanings:

- **Live · Supabase** — items loaded from Supabase
- **Live · empty** — connected; 0 items (not demo data)
- **Demo data** — Mock selected
- **Missing API key** — Live selected but browser config has no usable key (shows demo data)
- **Connection error** — configured but fetch failed (shows demo data)

There is no “fallback…” chip wording.

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

Also run `tripwire setup --force` once so anon SELECT policies + GRANTs from `db/schema.sql` are applied.

**Never put `service_role` in the browser config.**

## Database bootstrap

```bash
tripwire setup                 # or ./scripts/setup-supabase.sh
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` in `.env`.

## Tests

```bash
cd prototypes/dc-dashboard && npm test
```

Covers Live config gating, mocked Supabase table fetches, item mapping, empty vs error sources, and chip copy. Optional Live smoke runs only when `tripwire-dashboard.config.js` has a real URL + key (skipped otherwise — not a CI failure).
