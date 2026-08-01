# Demo readiness

Checklist and runbook for a live Tripwire demo (CLI scan → Supabase → dashboard).
Smoke results below were recorded **2026-08-01** against this workspace.

Evidence labels: **VERIFIED** = observed this session · **IMPLEMENTED** = reachable in code · **SKIP** = not exercised here (manual steps given).

---

## Priority tiers

| Tier | Meaning |
|------|---------|
| **P0 Critical** | Demo fails without this |
| **P1 High** | Core demo path (scan → store → show) |
| **P2 Medium** | Polish / secondary stories |
| **P3 Nice-to-have** | Optional depth |

---

## Prioritized checklist

### P0 — Critical

| # | Item | Why it matters | How to smoke-test | Expected | Status (2026-08-01) |
|---|------|----------------|-------------------|----------|---------------------|
| 1 | `.env` from `.env.example` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` | CLI setup/scan cannot talk to Supabase or apply DDL | Confirm non-empty keys exist (do not print values). `tripwire setup` → `{"status":"ready"}` | Setup ready; no auth/DB errors | **PASS** — setup returned ready; `items` table reachable |
| 2 | Node CLI installed (`cd cli && npm install && npm link`) | `tripwire` is the demo entry point | `tripwire --help`; `cd cli && npm test` | Help lists `setup` / `scan`; 10 tests pass | **PASS** — CLI on PATH; **10/10** unit tests |
| 3 | Schema applied (`db/schema.sql`) | Scans and dashboard need tables + `tripwire_rollup_item` | `tripwire setup`; or probe `items` via Supabase client | Tables present; setup idempotent | **PASS** — setup ready; `items` probe OK (count≥1) |
| 4 | Modal app `tripwire-scan` deployed **with** `scanners.py` packaged | Live `tripwire scan` runs in Modal; import of `scanners` must succeed | `modal app list` shows `tripwire-scan` **deployed**; then `tripwire scan ./fixtures/skills/vuln-prompt-injection-notes` | Sandbox runs scanners; JSON reports `scan_run_ids` | **FAIL** — app **deployed**, but live scan raised `ModuleNotFoundError: No module named 'scanners'`. Image in `sandbox/scan_app.py` does not mount/copy local `sandbox/scanners.py`. **Re-deploy after fixing image** (e.g. Modal `add_local_python_source` / copy local files), then re-scan. |
| 5 | Dashboard mock path (no live config) | Guaranteed visual if live data is empty/broken | Serve `prototypes/dc-dashboard/`; open `Tripwire.dc.html`; choose **Mock (demo data)** | Heatmap + findings from `tripwire-data.js` (12 items) | **PASS** — HTTP 200 for HTML/`tripwire-live.js`/`tripwire-data.js`; mock import → 12 items; config file correctly **404** until copied |

### P1 — High (core demo path)

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 6 | Dry-discover fixtures | Proves discovery without spending Modal time | `tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner` and `... ./fixtures/mcp/mcp_manifest.json` | JSON list of skill / MCP targets | **PASS** |
| 7 | Full fixture scan (after P0#4 fix) | End-to-end story: findings in Supabase | `tripwire scan ./fixtures/skills/vuln-prompt-injection-notes` (or green baseline). Idempotent skip if unchanged — scan a fresh fixture or change content | Non-empty `scan_run_ids`; row in `scan_runs` / `findings` | **FAIL / blocked** by P0#4. Secondary note: unchanged `safe-csv-cleaner` correctly **skipped** (idempotency) |
| 8 | Live dashboard config | Shows real scan results in UI | Copy `tripwire-dashboard.config.example.js` → `tripwire-dashboard.config.js`; set `SUPABASE_URL` + **anon** key (`SUPABASE_ANON_KEY` in `.env.example`). Open HTML; select **Live (Supabase)** | Chip **Live · Supabase** when items exist | **FAIL** — `tripwire-dashboard.config.js` missing; `SUPABASE_ANON_KEY` empty/absent in `.env`. Mock/fallback still works |
| 9 | Scanner secrets synced to Modal | Without keys, engines report `skipped_missing_credential` | `./scripts/setup-modal.sh --secrets-only` (or full setup); confirm keys you need are in `.env` per `fixtures/OPTIONAL_SCANNER_KEYS.md` | Secrets present; demos still narrate skips as OK | **SKIP** — not re-synced this session; README notes prior operator deploy 2026-08-01. Re-run before demo if keys changed |
| 10 | `_acquire_target` unit tests | Confidence local/git/MCP dispatch works | `.venv/bin/python -m pytest sandbox/test_acquire_target.py -v` (install `pytest` if needed) | 15 passed | **PASS** — **15/15** |

### P2 — Medium

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 11 | Fixture set for green/amber/red narrative | Storytelling across heatmap states | See `fixtures/README.md`; dry-discover or scan subset | Fixtures present on disk | **PASS** — skills + MCP fixtures listed |
| 12 | Drift pair demo | Shows content-hash / drift story | Scan `safe-changelog-writer` then `safe-changelog-writer-v2-drifted` | Distinct hashes / amber drift narrative | **SKIP** — blocked until live scan works |
| 13 | Dashboard Live ↔ Mock dropdown | Operator can recover mid-demo | Toggle data-source dropdown; chip updates | Modes persist via `sessionStorage` | **SKIP** — manual browser check; assets load OK |
| 14 | `pyproject.toml` / Python 3.12+ | Local sandbox tests and tooling | `python3 --version`; optional `pip install -e ".[dev]"` | ≥3.12 | **PASS** — Python 3.12.x; `.venv` present |

### P3 — Nice-to-have

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 15 | Guard hook (`guard/`) | Phase 4 story only | Mention as roadmap; do not block demo | N/A | **SKIP** — not required for Phase 1–3 demo |
| 16 | Full scanner depth (Snyk / Cisco / Tessl) | Richer findings | Optional keys in `.env`; re-sync Modal | More completed scanners, fewer skips | **SKIP** — keys may be set; not validated end-to-end while Modal import fails |
| 17 | Hygiene gates | Pre-demo confidence | `cd cli && npm test`; optional `./scripts/quality-gates.sh --quick` | Green | **PARTIAL** — CLI tests PASS; full quality-gates **SKIP** |

---

## Smoke results summary

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| Env + `tripwire setup` | P0 | PASS | `{"status":"ready"}` |
| CLI help + unit tests | P0 | PASS | 10/10 |
| Schema / `items` probe | P0 | PASS | Reachable |
| Modal `tripwire-scan` deploy | P0 | PASS (deploy) / **FAIL (runtime)** | Missing `scanners` module in container |
| Dashboard mock assets | P0 | PASS | Serve folder; Mock mode |
| Dry-discover fixtures | P1 | PASS | Skill + MCP manifest |
| Live fixture scan | P1 | FAIL | Blocked by Modal import |
| Live dashboard config | P1 | FAIL | No config.js; no anon key in `.env` |
| Modal secret sync | P1 | SKIP | Re-run if keys changed |
| `test_acquire_target` | P1 | PASS | 15/15 |
| Fixtures on disk | P2 | PASS | See `fixtures/README.md` |
| Drift / full scanners / guard | P2–P3 | SKIP | After P0#4 |

### Top blockers right now

1. **Modal image missing `sandbox/scanners.py`** — live scans crash on import. Fix packaging in `scan_app.py` image build, then `./scripts/setup-modal.sh --deploy-only` (or full setup).
2. **Live dashboard not wired** — create gitignored `prototypes/dc-dashboard/tripwire-dashboard.config.js` with URL + **anon** key; add `SUPABASE_ANON_KEY` to `.env` for documentation consistency.
3. **Idempotent skip** — re-scanning unchanged fixtures yields no new run; pick an unscanned fixture or alter content when you need a fresh Modal run.

---

## Demo day runbook (~15–30 min cold start)

Do these in order. Prefer Mock dashboard if live scan is still broken.

1. **Repo + toolchain (2 min)**
   `cd` to repo root. Confirm `node -v` (≥18), `python3 -v` (≥3.12), `tripwire --help`, `modal --help`.

2. **Env (3 min)**
   Ensure `.env` exists (from `.env.example`) with at least `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`. Prefer Session pooler URI if Direct `db.*` fails DNS.

3. **CLI (2 min)**
   ```bash
   cd cli && npm install && npm link && npm test && cd ..
   ```

4. **Database (1–2 min)**
   ```bash
   tripwire setup   # expect {"status":"ready"}
   ```

5. **Modal (5–10 min)** — *required for live scan*
   ```bash
   # After scanners.py is included in the Modal image:
   ./scripts/setup-modal.sh          # or --deploy-only if secrets already synced
   modal app list                    # tripwire-scan = deployed
   ```

6. **Discovery sanity (1 min)**
   ```bash
   tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
   tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
   ```

7. **Live scan (3–8 min)** — *after Modal fix*
   ```bash
   tripwire scan ./fixtures/skills/vuln-prompt-injection-notes
   # or a green baseline: ./fixtures/skills/safe-csv-cleaner
   ```
   If you see `[skip] … content unchanged`, pick another fixture.

8. **Dashboard (2–3 min)**
   ```bash
   # Live (optional):
   cp prototypes/dc-dashboard/tripwire-dashboard.config.example.js \
      prototypes/dc-dashboard/tripwire-dashboard.config.js
   # edit URL + anon key — never service_role

   cd prototypes/dc-dashboard && python3 -m http.server 8765
   # open http://127.0.0.1:8765/Tripwire.dc.html
   ```
   - **Safe default:** dropdown → **Mock (demo data)**.
   - **Live:** dropdown → **Live (Supabase)** after a successful scan.

9. **Talk track (optional)**
   Green baseline → vuln red → drift pair (`fixtures/README.md`) → dashboard heatmap.

### Mid-demo recovery

| Failure | Fallback |
|---------|----------|
| Modal / scan fails | `--dry-discover` + Mock dashboard |
| Live fetch fails | Chip shows fallback reason; switch to Mock |
| Idempotent skip | Different fixture or explain “unchanged content” |
| Supabase paused | Resume project in Supabase UI; re-run `tripwire setup` |

---

## Related docs

- Root [README.md](../README.md) — setup and “what’s real vs stubbed”
- [prototypes/README.md](../prototypes/README.md) — dashboard live vs mock
- [fixtures/README.md](../fixtures/README.md) — green/amber/red fixtures
- [fixtures/OPTIONAL_SCANNER_KEYS.md](../fixtures/OPTIONAL_SCANNER_KEYS.md) — Modal secret allowlist
- `.env.example` — required and optional credentials
