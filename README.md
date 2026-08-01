# Tripwire

AI skill / MCP server security scanning platform.

Local build notes (gitignored): `internal-docs/00_build/security-scanning-platform-spec.md`
and `internal-docs/00_build/build-day-decisions.md`.

## Layout
- `db/schema.sql` — Postgres/Supabase DDL + `tripwire_rollup_item` rollup function (spec §4).
- `cli/` — the `tripwire` Node CLI: discovery, content hashing, idempotency, Supabase writes, Modal spawn, batching.
- `sandbox/` — Modal Python app (`scan_app.py`) + scanner adapters (`scanners.py`).
- `guard/` — PreToolUse-style hook (Phase 4, `guard_hook.py`).
- `fixtures/` — scan targets for smoke tests (spec §8 table). See `fixtures/README.md` for the
  current green/amber/red set (safe baselines, drift pair, vuln skills/MCP servers).
- `prototypes/dc-dashboard/` — Data Commons HTML dashboard simulator (mock data; for screenshots / Phase 3 UX reference). Open `Tripwire.dc.html` from that folder.
- `docs/research/adapters/scanner-output-adapters.md` — scanner output shapes the
  `sandbox/scanners.py` adapters are built from; update both together.

## Setup
Requires Node ≥18, `psql` against a Supabase/Postgres URL, and (for live scans) Modal + scanner secrets.

```bash
psql "$SUPABASE_DB_URL" -f db/schema.sql

cd cli && npm install && npm link   # gives you the `tripwire` command locally
npm test                            # discovery + hashing unit tests (8), no live credentials needed

# Env for real scans (not needed for unit tests / --dry-discover):
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# sandbox side (Modal) — see fixtures/OPTIONAL_SCANNER_KEYS.md for the full secret list
pip install modal
modal secret create tripwire-supabase SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
modal secret create tripwire-scan-secrets SNYK_TOKEN=...
modal deploy sandbox/scan_app.py
```

## Try it against the existing fixtures
```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
```

`--dry-discover` prints discovered targets and exits without spawning Modal. A full `scan`
needs Supabase + a deployed sandbox.

## What's real vs stubbed
- **IMPLEMENTED:** full schema + rollup function; CLI discovery/hashing/idempotency/batching;
  scanner adapters shell out to the actual upstream CLIs (`skill-scanner`, `mcp-scanner`,
  `snyk-agent-scan`, `tessl`) with real flags and parse their documented output shapes;
  fixture set under `fixtures/` (see `fixtures/README.md`).
- **VERIFIED (unit):** `cd cli && npm test` — discovery + content-hash tests (8 pass).
- **Stubbed (`# STUB`):** the sandbox's `_acquire_target` (git clone / upload / MCP
  introspection dispatch) — needs the real Modal image + credentials wired per
  `fixtures/OPTIONAL_SCANNER_KEYS.md` before it does anything against a live target.
- **RESEARCH, not VERIFIED:** the exact JSON field names in `sandbox/scanners.py` — cross-check
  against the pinned CLI version's own `--help`/output before this blocks a merge (mirrors the
  evidence labeling already used in `docs/research/adapters/scanner-output-adapters.md`).
