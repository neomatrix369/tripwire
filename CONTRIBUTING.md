# Contributing

## Dev setup

0. Tools + versions: [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md)
   (Node 22 / Python 3.12). Platform accounts:
   [supabase-setup](docs/user-guide/supabase-setup.md) →
   [modal-setup](docs/user-guide/modal-setup.md) →
   [env-vars](docs/user-guide/env-vars.md) before copying `.env`.

Follow [QUICKSTART.md](QUICKSTART.md) (Platform operator path). Short version:

1. Copy `.env.example` → `.env` using [env-vars.md](docs/user-guide/env-vars.md)
   (`fixtures/OPTIONAL_SCANNER_KEYS.md` for Modal allowlist).
2. `cd cli && npm install && npm link`
3. `tripwire setup` (needs `SUPABASE_DB_URL`) and `./scripts/setup-modal.sh`
4. Run checks below.

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Scanner output notes:
[docs/research/adapters/scanner-output-adapters.md](docs/research/adapters/scanner-output-adapters.md).

## Dev hygiene

```bash
./scripts/install-git-hooks.sh      # pre-commit + pre-push
pre-commit run --all-files          # lint, mypy, bandit, gitleaks, fast tests
./scripts/quality-gates.sh --quick  # T1 static analysis only
./scripts/quality-gates.sh          # T1 + coverage + cli tests + pip-audit
./scripts/quality-gates.sh --full   # above + scripts/security-scan.sh
```

- **Commit:** ruff, mypy, bandit, gitleaks, pytest-testmon, `cli` unit tests
- **Push:** full pytest + coverage floor; conditional pip-audit / npm audit
- **CI** (`.github/workflows/ci.yml`): Semgrep, OSV, Meterian, CodeQL, Trivy, TruffleHog
- **Nightly** (`.github/workflows/nightly.yml`): full TruffleHog, SBOM, Meterian;
  mutmut and Chalk run but are **non-gating** (`|| true` — green Nightly does not mean mutation/Chalk passed)

**Coverage today (VERIFIED config):** Python ship-path `sandbox/` `fail_under=95`
(`pyproject.toml` / CI; `guard/` omitted). CLI `npm run test:coverage` (c8) lines
≥95% (slice 12). Live ACL gate lands in slice 13; `support.js` out of bar.

**Coverage target (DECIDED — slice 13):** Live ACL modules ≥95%.
Track [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md) (stubs under
[docs/plan/README.md](docs/plan/README.md) wave folders); close per
[docs/plan/GATE_CONTRACT.md](docs/plan/GATE_CONTRACT.md).

Intentional vuln fixtures under `fixtures/` and mock data under `prototypes/`
are excluded from secrets scanners.

## PR conventions

- Prefer small, focused PRs; include tests when behaviour changes.
- Do not commit secrets.
- Keep capability claims labelled (RESEARCH / DECIDED / IMPLEMENTED / VERIFIED) —
  see [docs/STATUS.md](docs/STATUS.md).

## CI

- [CI](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml) (`.github/workflows/ci.yml`) — secrets scanning, SAST, Trivy, ruff/bandit, CLI tests
- [Nightly](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml) (`.github/workflows/nightly.yml`) — T4 deep checks
- Workflow map: [docs/README.md § CI workflows](docs/README.md#ci-workflows)

---

[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)
[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
