# Tripwire

AI skill / MCP server security scanning platform.

Local build notes (gitignored): `internal-docs/00_build/security-scanning-platform-spec.md`
and `internal-docs/00_build/build-day-decisions.md`.

## Layout
- `db/schema.sql` — Postgres/Supabase DDL + `tripwire_rollup_item` rollup function (spec §4); idempotent (`IF NOT EXISTS`); anon SELECT policies + GRANTs for dashboard Live mode.
- `cli/` — the `tripwire` Node CLI: discovery, content hashing, idempotency, schema bootstrap (`setup` / first-scan), Supabase writes, Modal spawn, batching.
- `sandbox/` — Modal Python app (`scan_app.py`) + scanner adapters (`scanners.py`). Local dirs are packed on the host (`local_entrypoint`) and extracted in the sandbox.
- `scripts/` — `setup-supabase.sh`, `setup-modal.sh`, `serve-dashboard.mjs`, `sync-dashboard-config.sh`, and trimmed hygiene gates (`install-git-hooks.sh`, `quality-gates.sh`, …).
- `guard/` — PreToolUse-style hook (Phase 4, `guard_hook.py`).
- `fixtures/` — scan targets for smoke tests (spec §8 table). See `fixtures/README.md` for the
  current green/amber/red set (safe baselines, drift pair, vuln skills/MCP servers).
- `prototypes/dc-dashboard/` — Data Commons HTML dashboard (Live Supabase or Mock). See `prototypes/README.md`; prefer `node scripts/serve-dashboard.mjs`.
- `docs/DEMO_READINESS.md` — prioritized smoke checklist + demo-day runbook (cold start → demo-ready).
- `docs/DEMO_VIDEO_SCRIPT.md` — shot map + capture runbook; stills + VO live in Remotion (`claude-remotion-kickstart/public/projects/tripwire/`).
- `docs/research/adapters/scanner-output-adapters.md` — scanner output shapes the
  `sandbox/scanners.py` adapters are built from; update both together.

## Dev hygiene (trimmed)

Security-first local gates — not the full serious-tier stack:

```bash
./scripts/install-git-hooks.sh   # pre-commit + pre-push
pre-commit run --all-files       # gitleaks, bandit, ruff, cli tests
./scripts/quality-gates.sh --quick
```

CI (`.github/workflows/ci.yml`): secrets (gitleaks), SAST (Semgrep + OSV), Trivy, TruffleHog, ruff/bandit, CLI tests.
Intentional vuln fixtures under `fixtures/` and mock data under `prototypes/` are excluded from secrets scanners.

## Setup

```bash
# Copy .env.example → .env; set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
# Optional for direct browser Live dashboard: SUPABASE_ANON_KEY (or use serve-dashboard.mjs)

cd cli && npm install && npm link   # gives you the `tripwire` command locally
npm test                            # discovery + hashing + schema probe + --force unit tests (17)

# First-run DB bootstrap (also runs automatically on the first real `tripwire scan`):
tripwire setup                      # or: ./scripts/setup-supabase.sh
# Needs SUPABASE_DB_URL (postgresql://) to apply DDL; HTTP URL alone cannot.
# If db.<ref>.supabase.co does not resolve, use the Session pooler URI from
# Supabase → Project Settings → Database (and confirm the project is not paused).

# sandbox side (Modal) — fill scanner keys in .env as needed
pip install modal
./scripts/setup-modal.sh   # auth + sync tripwire-supabase / tripwire-scan-secrets + deploy
# Flags: --secrets-only | --deploy-only | --non-interactive | --env-file PATH
# Key allowlist: fixtures/OPTIONAL_SCANNER_KEYS.md

# Dashboard (Live or Mock): see prototypes/README.md
#   node scripts/serve-dashboard.mjs
#   # or: ./scripts/sync-dashboard-config.sh  then static-serve dc-dashboard
```

## Try it against the existing fixtures
```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
```

`--dry-discover` prints discovered targets and exits without spawning Modal. A full `scan`
needs Supabase (auto-bootstrapped on first scan / `tripwire setup`) + a deployed sandbox.

## What's real vs stubbed
- **IMPLEMENTED:** full schema + rollup function + anon SELECT policies/GRANTs; CLI
  discovery/hashing/idempotency/batching; `tripwire setup` / first-scan schema bootstrap
  (`cli/src/ensureSchema.js`); `./scripts/setup-modal.sh` secret sync + deploy; scanner
  adapters shell out to the actual upstream CLIs (`skill-scanner`, `mcp-scanner`,
  `snyk-agent-scan`, `tessl`) with real flags and parse their documented output shapes;
  fixture set under `fixtures/` (see `fixtures/README.md`); `_acquire_target` dispatch
  (git clone, local copy, host→sandbox tar upload via `local_entrypoint`, MCP
  introspection-only empty workdir); dashboard Live/Mock + `serve-dashboard.mjs` /
  `sync-dashboard-config.sh`.
- **VERIFIED (unit):** `cd cli && npm test` — 17 pass (discovery, content-hash, schema-probe, `--force`);
  `pytest sandbox/test_acquire_target.py` — 30 pass; `cd prototypes/dc-dashboard && npm test`
  — 9 pass (Live gating / chip copy; optional Live smoke skipped without config).
- **VERIFIED (operator, 2026-08-01):** Modal secrets + `tripwire-scan` deploy with
  `scanners` packaged (`add_local_python_source(..., copy=True)`); host tar packing
  (`modal run sandbox/scan_app.py` → `[acquire] packed …`) delivers fixture `SKILL.md` to
  scanners — Cisco completed with findings (incl. red prompt_injection); Tessl/Snyk may
  still be unreachable (Node≥20 / `uvx` cold-install). Live dashboard reads items when anon
  key synced (or via local proxy). Live `tripwire setup` against Direct `db.*` host was
  **not** verified here (`ENOTFOUND`); use Session pooler URI when needed.
- **RESEARCH, not VERIFIED:** the exact JSON field names in `sandbox/scanners.py` — cross-check
  against the pinned CLI version's own `--help`/output before this blocks a merge (mirrors the
  evidence labeling already used in `docs/research/adapters/scanner-output-adapters.md`).
