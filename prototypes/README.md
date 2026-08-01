# Prototypes

Reference UX and demo assets. Not the shipped product UI.

| Path | What |
|------|------|
| `dc-dashboard/` | Data Commons HTML simulator (`Tripwire.dc.html` + `support.js` + mock `tripwire-data.js`). Open `Tripwire.dc.html` in a browser from that folder (needs the three files side by side). Use for screenshots, walkthroughs, and Phase 3 design reference. Wired to mock data — **not live Supabase**. |

## Database bootstrap (shared with CLI)

The mock dashboard does not apply schema. First-time Supabase setup is:

```bash
tripwire setup                 # or ./scripts/setup-supabase.sh
# also auto-runs on the first real `tripwire scan` when tables are missing
```

Requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_URL` in `.env`.
When Phase 3 ships a live dashboard, it should call the same bootstrap path (not a separate DDL copy).
