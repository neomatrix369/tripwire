# Tripwire

AI skill / MCP server security scanning platform.

<!-- Primary stack (what runs Tripwire) -->
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=for-the-badge)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=for-the-badge)](https://github.com/neomatrix369/tripwire)

<!-- Scanner & partner (who we scan with / who sponsors) -->
[![Cisco Skill/MCP Scanner](https://img.shields.io/badge/Cisco%20Skill%2FMCP%20Scanner-1BA0D7?style=flat&logo=cisco&logoColor=white)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Overmind](https://img.shields.io/badge/Overmind-Phase%205-6B7280?style=flat)](https://overmind.tech)
[![Ossprey](https://img.shields.io/badge/Ossprey-Sponsor-0F766E?style=flat)](https://www.ossprey.com/?utm_source=luma)

Local build notes (gitignored): `internal-docs/00_build/security-scanning-platform-spec.md`
and `internal-docs/00_build/build-day-decisions.md`.

## Who is this for?

| Persona | Start here |
|---------|------------|
| See it in 2 minutes | [prototypes/README.md](prototypes/README.md) (Mock dashboard) |
| Scan my skills/MCP | [Setup](#setup) → `tripwire scan --dry-discover` |
| Run the full platform | [Setup](#setup) + [fixtures/README.md](fixtures/README.md) |
| Operate Modal/Supabase | [.env.example](.env.example) + [OPTIONAL_SCANNER_KEYS.md](fixtures/OPTIONAL_SCANNER_KEYS.md) |
| Contribute | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Compliance / audit | [prototypes/README.md](prototypes/README.md) + [fixtures/README.md](fixtures/README.md) |
| Security reporter | [SECURITY.md](SECURITY.md) |

## Layout
- `db/schema.sql` — Postgres/Supabase DDL + rollup; anon SELECT + Realtime publication for Live dashboard.
- `cli/` — `tripwire` Node CLI (discovery, hashing, idempotency, bootstrap, Modal spawn).
- `sandbox/` — Modal app + adapters; host packs dirs, sandbox extracts.
- `scripts/` — setup (Supabase/Modal), `serve-dashboard.mjs`, hygiene gates.
- `guard/` — PreToolUse-style hook (Phase 4). `fixtures/` — smoke targets (see `fixtures/README.md`).
- `prototypes/dc-dashboard/` — Live/Mock dashboard (`node scripts/serve-dashboard.mjs`).
- Demo docs: Remotion repo `…/claude-remotion-kickstart/public/projects/tripwire/docs/`.
- `docs/research/adapters/scanner-output-adapters.md` — keep in sync with `sandbox/scanners.py`.

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
npm test                            # discovery + hashing + schema probe + --force unit tests (18)

# First-run DB bootstrap (also runs automatically on the first real `tripwire scan`):
tripwire setup                      # or: ./scripts/setup-supabase.sh
# Needs SUPABASE_DB_URL (postgresql://) to apply DDL; HTTP URL alone cannot.
# If db.<ref>.supabase.co does not resolve, use the Session pooler URI from
# Supabase → Project Settings → Database (and confirm the project is not paused).
# Re-run `tripwire setup --force` after pulling schema changes (console columns,
# Realtime publication) — probe also checks scan_run_scanners.completed_at exists.

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
- **IMPLEMENTED:** full schema + rollup function + anon SELECT policies/GRANTs + Realtime
  publication on `scan_runs` / `scan_run_scanners` / `findings`; `scan_run_scanners`
  incremental writes from Modal (`running` placeholders, `console_output`,
  `started_at`/`completed_at`; PGRST204-safe fallback when columns missing); CLI
  discovery/hashing/idempotency/batching; `tripwire setup` / first-scan schema bootstrap
  (`cli/src/ensureSchema.js`, probes `completed_at` column); `./scripts/setup-modal.sh`
  secret sync + deploy; scanner adapters shell out to the actual upstream CLIs
  (`skill-scanner`, `mcp-scanner`, `snyk-agent-scan`, `tessl`) with real flags and parse
  their documented output shapes; fixture set under `fixtures/` (see `fixtures/README.md`);
  `_acquire_target` dispatch (git clone, local copy, host→sandbox tar upload via
  `local_entrypoint`, MCP introspection-only empty workdir); dashboard Live/Mock with
  Supabase Realtime (~1s) + 8s poll fallback, SCANNING in-flight UI, scanner console
  output in drawer, partial-failed “n out of m scanners unreachable” copy;
  `serve-dashboard.mjs` / `sync-dashboard-config.sh`.
- **VERIFIED (unit):** `cd cli && npm test` — 18 pass (discovery, content-hash,
  schema-probe incl. `completed_at`, `--force`); `pytest sandbox/test_acquire_target.py`
  — 30 pass; `cd prototypes/dc-dashboard && npm test` — 36 pass, 1 skipped (Live
  gating, Realtime wiring, SCANNING/console/unreachable mapping; optional Live smoke
  skipped without config).
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

## Contribute
See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).
