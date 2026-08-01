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
| 4 | Modal app `tripwire-scan` deployed **with** `scanners.py` packaged | Live `tripwire scan` runs in Modal; import of `scanners` must succeed | `modal app list` shows `tripwire-scan` **deployed**; then `tripwire scan ./fixtures/skills/vuln-prompt-injection-notes` | Sandbox runs scanners; JSON reports `scan_run_ids` | **PASS (packaging)** — fixed via `add_local_python_source("scanners", copy=True)` in `sandbox/scan_app.py`; redeployed 2026-08-01. Live run mounts `PythonPackage:scanners`, no import error. |
| 5 | Dashboard mock path (no live config) | Guaranteed visual if live data is empty/broken | `node scripts/serve-dashboard.mjs` (or static-serve `dc-dashboard`); open `Tripwire.dc.html`; choose **Mock (demo data)** | Heatmap + findings from `tripwire-data.js` (12 items) | **PASS** — HTTP 200 for HTML/`tripwire-live.js`/`tripwire-data.js`; mock import → 12 items; config file correctly **404** until synced |

### P1 — High (core demo path)

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 6 | Dry-discover fixtures | Proves discovery without spending Modal time | `tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner` and `... ./fixtures/mcp/mcp_manifest.json` | JSON list of skill / MCP targets | **PASS** |
| 7 | Full fixture scan (after P0#4 fix) | End-to-end story: findings in Supabase | `tripwire scan ./fixtures/skills/vuln-prompt-injection-notes` (or green baseline). Idempotent skip if unchanged — scan a fresh fixture or change content | Non-empty `scan_run_ids`; findings rows | **PASS** — packing **VERIFIED** (`[acquire] packed local target (720 bytes)`); scan_run `896a3c11-…` `partial-failed` (Tessl/Snyk unreachable); Cisco×3 **completed**; **7 findings** incl. red `prompt_injection`. Idempotent skip still applies for unchanged content. |
| 8 | Live dashboard config | Shows real scan results in UI | `./scripts/sync-dashboard-config.sh` then serve `dc-dashboard`; or `node scripts/serve-dashboard.mjs`. Unit: `cd prototypes/dc-dashboard && npm test` | Chip **Live · Supabase** (or **Live · empty**) | **PASS** — was empty anon → “Not configured”; anon now in `.env` + synced config; Live REST returns items; tests **9/9** |
| 9 | Scanner secrets synced to Modal | Without keys, engines report `skipped_missing_credential` | `./scripts/setup-modal.sh --secrets-only` (or full setup); confirm keys you need are in `.env` per `fixtures/OPTIONAL_SCANNER_KEYS.md` | Secrets present; demos still narrate skips as OK | **SKIP** — not re-synced this session; README notes prior operator deploy 2026-08-01. Re-run before demo if keys changed |
| 10 | `_acquire_target` unit tests | Confidence local/git/MCP/archive dispatch works | `.venv/bin/python -m pytest sandbox/test_acquire_target.py -v` (install `pytest` if needed) | All tests pass | **PASS** — **30/30** (includes archive pack/extract + filesystem-path guard) |

### P2 — Medium

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 11 | Fixture set for green/amber/red narrative | Storytelling across heatmap states | See `fixtures/README.md`; dry-discover or scan subset | Fixtures present on disk | **PASS** — skills + MCP fixtures listed |
| 12 | Drift pair demo | Shows content-hash / drift story | Scan `safe-changelog-writer` then `safe-changelog-writer-v2-drifted` | Distinct hashes / amber drift narrative | **SKIP** — packing ready; not filmed this session |
| 13 | Dashboard Live ↔ Mock dropdown | Operator can recover mid-demo | Toggle data-source dropdown; chip updates | Modes persist via `sessionStorage` | **SKIP** — manual browser check; assets load OK |
| 14 | `pyproject.toml` / Python 3.12+ | Local sandbox tests and tooling | `python3 --version`; optional `pip install -e ".[dev]"` | ≥3.12 | **PASS** — Python 3.12.x; `.venv` present |

### P3 — Nice-to-have

| # | Item | Why it matters | How to smoke-test | Expected | Status |
|---|------|----------------|-------------------|----------|--------|
| 15 | Guard hook (`guard/`) | Phase 4 story only | Mention as roadmap; do not block demo | N/A | **SKIP** — not required for Phase 1–3 demo |
| 16 | Full scanner depth (Snyk / Cisco / Tessl) | Richer findings | Optional keys in `.env`; re-sync Modal | More completed scanners, fewer skips | **IN PROGRESS** — Cisco **VERIFIED**; image fix (Node 20 + preinstalled Snyk) **IMPLEMENTED** — redeploy + `TESSL_TOKEN` still required |
| 17 | Hygiene gates | Pre-demo confidence | `cd cli && npm test`; optional `./scripts/quality-gates.sh --quick` | Green | **PARTIAL** — CLI tests PASS; full quality-gates **SKIP** |

---

## Smoke results summary

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| Env + `tripwire setup` | P0 | PASS | `{"status":"ready"}` |
| CLI help + unit tests | P0 | PASS | 10/10 |
| Schema / `items` probe | P0 | PASS | Reachable |
| Modal `tripwire-scan` deploy | P0 | **PASS** | `scanners` packaged (`copy=True`); redeployed |
| Dashboard mock assets | P0 | PASS | Serve folder; Mock mode |
| Dry-discover fixtures | P1 | PASS | Skill + MCP manifest |
| Live fixture scan | P1 | **PASS** | Packing **VERIFIED**; Cisco findings (7) incl. red prompt_injection; Tessl/Snyk still unreachable |
| Live dashboard config | P1 | **PASS** | Anon key synced; Live reads items (5); `npm test` 9/9 |
| Modal secret sync | P1 | SKIP | Re-run if keys changed |
| `test_acquire_target` | P1 | PASS | 30/30 |
| Fixtures on disk | P2 | PASS | See `fixtures/README.md` |
| Drift / full scanners / guard | P2–P3 | SKIP | Redeploy Node20+Snyk image; Tessl needs `TESSL_TOKEN` |

### Top blockers right now

1. **Redeploy Modal image** after Node 20 + preinstalled `snyk-agent-scan` (`./scripts/setup-modal.sh --deploy-only`). Until then Tessl/Snyk may still show `unreachable` on the old image.
2. **Apply rollup DDL** — `tripwire setup` (or re-run `db/schema.sql`) so `partial-failed` computes risk instead of hard `error`, and `scan_run_scanners.detail` exists.
3. **Idempotent skip** — re-scanning unchanged fixtures yields no new run; bump content or pick another fixture for a fresh Modal run.
4. **Tessl auth** — even with Node ≥20, Tessl still needs a valid `TESSL_TOKEN` (and upload/workspace access) in Modal secrets.

Orphan `status=running` rows: `node scripts/reconcile-stuck-scan-runs.mjs` (known prefixes from 2026-08-01 crashes).

Live dashboard (direct anon or `node scripts/serve-dashboard.mjs`) is **no longer a blocker**. Local-path upload is **no longer a blocker**.

---

## CLI → Modal sandbox (filming beat)

**Verdict: READY** — film **CLI kickoff → `[acquire] packed` → Cisco findings** (red prompt_injection on the vuln fixture). After redeploy (Node 20 + preinstalled Snyk) and `tripwire setup --force` (softened rollup), heatmap should show risk colors even if Tessl/Snyk stay `unreachable`. Narrate Cisco as the detection beat; Mock remains a denser heatmap safety net.

### Path (IMPLEMENTED)

1. `tripwire scan <target>` → `cli/src/orchestrator.js` `runScan`
2. Inserts `scan_runs` row → `spawnScanSandbox` in `cli/src/modalClient.js`
3. Shells: `modal run sandbox/scan_app.py --target … --item-type … --item-id … --scan-run-id …`
   (**not** `::scan_item` — that skips host packing)
4. Host `main` (`local_entrypoint`) tars local dirs → remote `scan_item(..., target_archive=…)` extracts → `run_all_scanners` → Supabase → teardown

### Exact demo command

```bash
# From repo root, after Modal deploy. Bump fixture content if last scan was identical.
printf '\n<!-- demo %s -->\n' "$(date -u +%Y%m%dT%H%M%SZ)" \
  >> ./fixtures/skills/vuln-prompt-injection-notes/SKILL.md

tripwire scan ./fixtures/skills/vuln-prompt-injection-notes
```

Redeploy when `scan_app.py` / packaging / packing path changed:

```bash
./scripts/setup-modal.sh --deploy-only
```

### What to capture on screen

| Moment | Expect to see |
|--------|----------------|
| Kickoff | `✓ Initialized. View run at https://modal.com/apps/...` |
| Packaging | `Created mount PythonPackage:scanners` + `Created function scan_item` |
| Acquire | `[acquire] packed local target (N bytes) → remote sandbox` |
| Progress | Scanner log lines (`[Cisco Skill Scanner:…]`, `[Tessl]`, etc.) |
| Finish | `✓ App completed` + JSON `{"batch_id": null, "scan_run_ids": ["…"]}` |

Cisco findings are **VERIFIED** in Supabase for the packed fixture run. Use **Mock dashboard** only if you need Tessl/Snyk rows or a denser heatmap than live data.

### Smoke evidence (this session, 2026-08-01)

| Check | Result |
|-------|--------|
| Packaging fix | `sandbox/scan_app.py` → `.add_local_python_source("scanners", copy=True)` — **VERIFIED** |
| Local-path upload | `local_entrypoint` packs host dir → `target_archive` bytes → remote extract — **VERIFIED** |
| Deploy | `./scripts/setup-modal.sh --deploy-only` → success (~4s; `scan_item` + `PythonPackage:scanners`) — **VERIFIED** |
| Unit tests | `_acquire_target` + pack/extract — **30/30** PASS — **VERIFIED** |
| Live scan (pre-packing CLI) | ~70s; `ap-utwiKBCwsQRPsDLO0Wz48i`; **0 findings** (`::scan_item`, no archive) — **SUPERSEDED** |
| Live scan (with packing) | ~86s; `ap-CUbekfRqi7emCo5LmXeQqC`; `[acquire] packed local target (720 bytes)`; scan_run `896a3c11-…` **`partial-failed`**; Cisco×3 **completed**; **7 findings** (red `prompt_injection` + green license); Tessl/Snyk **unreachable** — **VERIFIED** |

### Capture tips

- Film a tall terminal; Modal URL lines wrap — zoom so `PythonPackage:scanners` and `[acquire] packed` are readable.
- If you see `[skip] … content unchanged`, bump `SKILL.md` (or pick another fixture) before rolling.
- Narrate Cisco red findings as the detection beat; mention Tessl/Snyk skips as optional engines if logs show `unreachable`.
- Keep Mock dashboard as a visual safety net for a denser heatmap.

---

## Demo day runbook (~15–30 min cold start)

Do these in order. Live CLI→Modal + Cisco findings are demo-ready; keep Mock as heatmap safety net.

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
   ./scripts/setup-modal.sh          # or --deploy-only if secrets already synced
   modal app list                    # tripwire-scan = deployed
   ```

6. **Discovery sanity (1 min)**
   ```bash
   tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
   tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
   ```

7. **Live scan (3–8 min)** — *host packing + Cisco findings VERIFIED*
   ```bash
   # Bump content if prior scan of same fixture was unchanged:
   printf '\n<!-- demo %s -->\n' "$(date -u +%Y%m%dT%H%M%SZ)" \
     >> ./fixtures/skills/vuln-prompt-injection-notes/SKILL.md
   tripwire scan ./fixtures/skills/vuln-prompt-injection-notes
   ```
   Expect `[acquire] packed local target …`, `scan_run_ids`, and Cisco red `prompt_injection` in Supabase. Tessl/Snyk may still be `unreachable`. If you see `[skip] … content unchanged`, bump again or pick another fixture.

8. **Dashboard (2–3 min)**
   ```bash
   # Direct Live (anon key in .env — preferred when set):
   ./scripts/sync-dashboard-config.sh
   cd prototypes/dc-dashboard && python3 -m http.server 8765
   # open http://127.0.0.1:8765/Tripwire.dc.html → Live (Supabase)

   # Or local proxy (works with SERVICE_ROLE if anon unset):
   # node scripts/serve-dashboard.mjs
   ```
   - **Safe default:** dropdown → **Mock (demo data)**.
   - **Live:** chip **Live · Supabase** or **Live · empty** (not Missing API key).
   - Unit tests: `cd prototypes/dc-dashboard && npm test`

9. **Talk track (optional)**
   Green baseline → vuln red → drift pair (`fixtures/README.md`) → dashboard heatmap.

### Mid-demo recovery

| Failure | Recovery |
|---------|----------|
| Modal / scan fails | `--dry-discover` + Mock dashboard |
| Live fetch fails | Chip **Connection error** or **Missing API key**; run `node scripts/serve-dashboard.mjs` or switch to Mock |
| Idempotent skip | Different fixture or explain “unchanged content” |
| Supabase paused | Resume project in Supabase UI; re-run `tripwire setup` |

---

## Related docs

- Root [README.md](../README.md) — setup and “what’s real vs stubbed”
- [prototypes/README.md](../prototypes/README.md) — dashboard live vs mock
- [fixtures/README.md](../fixtures/README.md) — green/amber/red fixtures
- [fixtures/OPTIONAL_SCANNER_KEYS.md](../fixtures/OPTIONAL_SCANNER_KEYS.md) — Modal secret allowlist
- `.env.example` — required and optional credentials
