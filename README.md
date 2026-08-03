# Tripwire

> AI skill / MCP server security scanning platform.

<!-- Primary stack (what runs Tripwire) -->
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=for-the-badge)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=for-the-badge)](https://github.com/neomatrix369/tripwire)
[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)

<!-- Scanner & partner -->
[![Cisco Skill/MCP Scanner](https://img.shields.io/badge/Cisco%20Skill%2FMCP%20Scanner-1BA0D7?style=flat&logo=cisco&logoColor=white)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)

## What it does

Tripwire discovers and scans AI skills and MCP servers, writes findings to Supabase,
and displays results in a Live/Mock dashboard.
Run discovery with the CLI, then watch results in the dashboard.
System shape: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Choose your path

| Role / path | Expected setup | Start here |
|---------|----------------|------------|
| **Normal users** | Node 22 only | [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md#normal-users) |
| **Developers** | Node 22 + Python 3.12 + CLI + git | [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md#developers) |
| **Security experts** | Node 22 + Python 3.12 + scanner tooling | [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md#security-experts) |

## One-time prerequisites (before first use)

Use this checklist first:

```bash
git --version
node -v      # must match .nvmrc (v22)
python3 -V   # must match .python-version (3.12)
```

- **Baseline docs:** [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md)
- **Environment keys:** [docs/user-guide/env-vars.md](docs/user-guide/env-vars.md)
- **Role overlap note:** people can be both security experts and developers. Pick the path that matches your current goal.

## One-off setup and command categories

### Setup (normal users)

No credentials required.

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
node scripts/serve-dashboard.mjs
```

Open: `http://127.0.0.1:8765/Tripwire.dc.html`, then set Guard → Data source → **Mock (demo data)**.

### Setup (developers)

Install CLI dependencies and run a fixture-only dry scan.

```bash
cd cli && npm install && npm link && cd ..
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
```

### Setup (security experts)

Provision accounts + keys first, then bootstrap schema and Modal.

```bash
cp .env.example .env
# fill keys from:
# docs/user-guide/env-vars.md
cd cli && npm install && npm link && cd ..
tripwire setup
# or: ./scripts/setup-supabase.sh
pip install modal
./scripts/setup-modal.sh
tripwire scan ./fixtures/skills/safe-csv-cleaner
```

## Regular commands (day-to-day use)

### Normal users

```bash
node scripts/serve-dashboard.mjs
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
```

### Developers

```bash
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
```

### Security experts

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
tripwire scan ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

## Maintenance commands (periodic)

Use these when something changes (fixtures, schema, scanner keys, dependencies).

```bash
tripwire setup --force                     # re-apply latest DB schema
./scripts/setup-modal.sh --secrets-only     # sync keys without redeploy
./scripts/setup-modal.sh --deploy-only      # redeploy sandbox
./scripts/quality-gates.sh --quick          # pre-commit check
./scripts/quality-gates.sh                 # full project gates
```

Project-specific cleanup:

```bash
cd cli && npm test                        # CLI tests
cd prototypes/dc-dashboard && npm test     # dashboard coverage checks
pytest sandbox/test_acquire_target.py       # sandbox smoke
```

## Troubleshooting shortcuts

- Live dashboard blank or stale? Switch between **Mock** and **Live** on Guard tab.
- Live selected but no data: ensure `SUPABASE_ANON_KEY` or local proxy is configured.
- Missing scanner output: confirm keys in `.env` and re-run `./scripts/setup-modal.sh --secrets-only`.
- Dry-discover is failing: verify `node_modules` was installed in `cli/` and `npm link` was run.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## Learn more

- Docs index: [docs/README.md](docs/README.md)
- New operator onboarding cheat sheet: [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md)
- Architecture (diagrams): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Capability status: [docs/STATUS.md](docs/STATUS.md)
- Fixtures: [fixtures/README.md](fixtures/README.md)
- Dashboard: [prototypes/README.md](prototypes/README.md)
- Slice progress: [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md)
- Agents: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)
