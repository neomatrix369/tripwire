# Tripwire

AI skill / MCP server security scanning platform.

Local build notes (gitignored): `internal-docs/00_build/security-scanning-platform-spec.md`
and `internal-docs/00_build/build-day-decisions.md`.

## Layout
- `db/schema.sql` — Postgres/Supabase DDL + `tripwire_rollup_item` rollup function (spec §4); idempotent (`IF NOT EXISTS`).
- `cli/` — the `tripwire` Node CLI: discovery, content hashing, idempotency, schema bootstrap (`setup` / first-scan), Supabase writes, Modal spawn, batching.
- `sandbox/` — Modal Python app (`scan_app.py`) + scanner adapters (`scanners.py`).
- `scripts/` — `setup-supabase.sh`, `setup-modal.sh`, and trimmed hygiene gates (`install-git-hooks.sh`, `quality-gates.sh`, …).
- `guard/` — PreToolUse-style hook (Phase 4, `guard_hook.py`).
- `fixtures/` — scan targets for smoke tests (spec §8 table). See `fixtures/README.md` for the
  current green/amber/red set (safe baselines, drift pair, vuln skills/MCP servers).
- `prototypes/dc-dashboard/` — Data Commons HTML dashboard simulator (mock data; for screenshots / Phase 3 UX reference). Open `Tripwire.dc.html` from that folder.
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

cd cli && npm install && npm link   # gives you the `tripwire` command locally
npm test                            # discovery + hashing + schema probe unit tests (10)

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
- **IMPLEMENTED:** full schema + rollup function; CLI discovery/hashing/idempotency/batching;
  `tripwire setup` / first-scan schema bootstrap (`cli/src/ensureSchema.js`);
  `./scripts/setup-modal.sh` secret sync + deploy; scanner adapters shell out to the actual
  upstream CLIs (`skill-scanner`, `mcp-scanner`, `snyk-agent-scan`, `tessl`) with real flags
  and parse their documented output shapes; fixture set under `fixtures/` (see `fixtures/README.md`).
- **VERIFIED (unit):** `cd cli && npm test` — 10 pass (discovery, content-hash, schema-probe).
- **VERIFIED (operator):** `./scripts/setup-modal.sh` created Modal secrets and deployed
  `tripwire-scan` (2026-08-01). Live `tripwire setup` against Direct `db.*` host was **not**
  verified here (`ENOTFOUND`); use Session pooler URI when needed.
- **Stubbed (`# STUB`):** the sandbox's `_acquire_target` (git clone / upload / MCP
  introspection dispatch) — needs the real Modal image + credentials wired per
  `fixtures/OPTIONAL_SCANNER_KEYS.md` before it does anything against a live target.
- **RESEARCH, not VERIFIED:** the exact JSON field names in `sandbox/scanners.py` — cross-check
  against the pinned CLI version's own `--help`/output before this blocks a merge (mirrors the
  evidence labeling already used in `docs/research/adapters/scanner-output-adapters.md`).
