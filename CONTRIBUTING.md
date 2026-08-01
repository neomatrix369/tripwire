# Contributing

## Dev setup

1. Copy `.env.example` → `.env` and fill Supabase (+ optional scanner keys — see `fixtures/OPTIONAL_SCANNER_KEYS.md`).
2. `cd cli && npm install && npm link`
3. `tripwire setup` (needs `SUPABASE_DB_URL`) and `./scripts/setup-modal.sh`
4. Run checks: `pre-commit run --all-files` and `./scripts/quality-gates.sh --quick`

Full layout and commands: [README.md](README.md). Scanner CLI details: `docs/research/adapters/scanner-output-adapters.md` and the platform spec §8.

## PR conventions

- Prefer small, focused PRs; include tests when behaviour changes.
- Do not commit secrets. Intentional vuln fixtures under `fixtures/` are excluded from secrets scanners.
- Keep capability claims labelled (RESEARCH / DECIDED / IMPLEMENTED / VERIFIED).

## CI

`.github/workflows/ci.yml` runs secrets scanning, SAST, Trivy, ruff/bandit, and CLI tests.

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
