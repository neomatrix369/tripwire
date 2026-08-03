# Horizon A Claim Audit (Slice 15)

_Last updated: 2026-08-03_

Purpose: provide the required PASS/FAIL/PARTIAL matrix for public claims used by
Horizon A (`README.md`, `STATUS.md`, `ARCHITECTURE.md`, `QUICKSTART.md`,
`CONTRIBUTING.md`, `prototypes/README.md`).

## Scope

This audit covers project claims that are publicly described as implemented/verified
for Horizon A and that are likely to be checked before claiming completion.
It is a planning artifact for `docs/plan/slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md`.

## Claim matrix (current assessment snapshot)

| Claim | Source | Evidence path | Current outcome | Notes |
|---|---|---|---|---|
| Tripwire CLI can discover and scan targets (`tripwire scan`) | `README.md`, `QUICKSTART.md`, `STATUS.md` | `cli/src/*`, `cli/test/*` | PARTIAL | Command flow is documented and unit coverage exists, but 3B live execution proof still pending by execution run. |
| Schema bootstrap (`tripwire setup`) supports scan-run tables and publication | `STATUS.md`, `coverage-audit.md`, `cli/src/ensureSchema.js`, `db/schema.sql` | `cli/src/ensureSchema.js`; `db/schema.sql` | PASS | Documented and tested via setup path; live direct-DB path explicitly marked "not verified here". |
| Modal scan path runs scanners and writes findings to DB | `STATUS.md`, `docs/ARCHITECTURE.md`, `sandbox/scanners.py` | `sandbox/scanners.py` | PARTIAL | Implementation files/docs match; live Modal execution still requires environment/infrastructure to prove end-to-end. |
| CLI supports idempotent scans (`--force`, `content-hash`, retries) | `STATUS.md`, `coverage-audit.md`, `cli/` | `cli/src/*`, `cli/test/*` | PASS | Unit checks are documented as implemented; still needs final execution confirmation in claim run. |
| Dashboard can render scan results in live mode | `README.md`, `prototypes/dc-dashboard/`, `STATUS.md`, `prototypes/README.md` | `prototypes/dc-dashboard/*`, `scripts/serve-dashboard.mjs` | PARTIAL | Docs and tests cover structure; no fresh live 3B proof yet. |
| Dashboard supports fallback to mock mode | `README.md`, `QUICKSTART.md`, `prototypes/dc-dashboard/` | `prototypes/dc-dashboard/*`, `scripts/sync-dashboard-config.sh` | PASS | Marked in docs as Mock default selector; mock path can be validated without cloud credentials. |
| Coverage thresholds are achieved for ship-path (python, cli, live ACL) | `coverage-audit.md`, `GATE_CONTRACT.md`, `docs/plan/gate-evidence/slice-11.json`, `slice-12.json`, `slice-13.json` | gate-evidence files + `coverage-audit.md` | PASS | Values already captured; gates are recorded and used by `TRAIL` + `PROGRESS`. |
| Nightly mutation checks are non-gating | `CONTRIBUTING.md`, `coverage-audit.md` | `CONTRIBUTING.md` Nightly note; `coverage-audit.md` parity matrix | PASS | mutmut and Chalk remain informational (`|| true`); this audit does not make mutation testing a Horizon A closure gate. |
| Snyk/Tessl/scanner adapter output shape is verified against research | `STATUS.md` (RESEARCH), `docs/research/adapters/scanner-output-adapters.md`, `docs/plan/slices/05-E-ship-path-coverage/slice-11-python-ship-path-coverage-95.md` | `docs/research/adapters/*`, `sandbox/` | PARTIAL | Research remains unsynced; slice 11 includes tests, but this claim still depends on fixture/verification outcomes. |
| Live dashboard poll cadence includes realtime + poll fallback | `STATUS.md`, `ARCHITECTURE.md` | `prototypes/dc-dashboard/*` | PARTIAL | Architecture/docs carry both modes, but public claims in README/STATUS have drift risk and need a single authoritative update. |
| Guard/PreToolUse is not production shipped for Horizon A | `STATUS.md`, `ARCHITECTURE.md`, `coverage-audit.md` | `guard/`, `docs/STATUS.md`, `docs/ARCHITECTURE.md` | PASS | Repeatedly marked out-of-scope for Horizon A and handled as `Future`. |
| Vendor/demo badges only show shipped or decided claims | `README.md`, `STATUS.md`, `CONTRIBUTING.md` | `slice-7` gate evidence and doc grep checks in `slice-14` | PARTIAL | Gate A is claimed in docs; needs final execution of slice 14 to lock the cleaned state. |

## Command protocol for slice-15 execution

- Audit command preference:
  - If repo module exists: `uv run python -m tripwire.audit`
  - Fallback minimum: `./scripts/security-scan.sh --dry-run` and then
    `./scripts/security-scan.sh` (record pass/fail explicitly).
- Unit commands:
  - `cd cli && npm test`
  - `uv run pytest`
  - `cd prototypes/dc-dashboard && npm test` (if deps present)
  - `cd prototypes/dc-dashboard && npm run test:coverage`
- Use this command log format for slice-15 execution:
  - `status:` PASS | FAIL | BLOCKED
  - `command:`
  - `exit_code:`
  - `stdout: |`
  - `stderr: |`
- 3B command log target:
  - `cp .env.example .env && tripwire setup`
  - `tripwire scan ./fixtures/skills/safe-csv-cleaner`
  - `node scripts/serve-dashboard.mjs`

## 3B / 3C tracking (to be filled in slice-15)

| Timestamp | Outcome | Blocker | Owner | Evidence |
|---|---|---|---|---|
| 2026-08-03 | PENDING | Not executed yet | — | Add command transcript or 3C blocker row from `slice-15-horizon-a-claim-audit.md`. |

## Review status

- `/nw-review` pre-checks are expected to set this file to `verdict` outcome.
- `docs/plan/gate-evidence/slice-15.json` and `DECISIONS.md` must reference this file as the final evidence artifact before `slice 15` can move to ✅ PASSED.
