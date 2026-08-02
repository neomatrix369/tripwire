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

Tripwire discovers AI skills and MCP servers, runs them through upstream scanners
in an isolated sandbox, stores results in Supabase, and surfaces them on a
Live/Mock dashboard. Use the CLI for discovery and scans; open the dashboard to
watch findings. System shape: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it

| Persona | Start here | What you will do |
|---------|------------|------------------|
| Demo in 2 min | [QUICKSTART → Demo](QUICKSTART.md#demo-viewer) | Open Mock dashboard, no cloud |
| Scan skills/MCP | [QUICKSTART → Scanner](QUICKSTART.md#scanner-user) | `npm link` + `--dry-discover` |
| Full platform | [QUICKSTART → Platform](QUICKSTART.md#platform-operator) | Supabase + Modal + Live scan |
| Operate secrets | [.env.example](.env.example) | Fill keys — [OPTIONAL_SCANNER_KEYS](fixtures/OPTIONAL_SCANNER_KEYS.md) |
| Compliance / audit | [prototypes/README.md](prototypes/README.md) | Mock UI + [fixtures](fixtures/README.md) |
| Security reporter | [SECURITY.md](SECURITY.md) | Private disclosure path |

**Demo viewer**

```bash
node scripts/serve-dashboard.mjs
# Guard tab → Mock (demo data)
```

**Scanner user**

```bash
cd cli && npm install && npm link && cd ..
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
```

**Platform operator**

```bash
cp .env.example .env   # SUPABASE_* + optional scanner keys
cd cli && npm install && npm link && cd ..
tripwire setup && ./scripts/setup-modal.sh
tripwire scan ./fixtures/skills/safe-csv-cleaner
```

Details for every path: [QUICKSTART.md](QUICKSTART.md).

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## Learn more

- Docs index: [docs/README.md](docs/README.md)
- Architecture (diagrams): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Capability status: [docs/STATUS.md](docs/STATUS.md)
- Fixtures: [fixtures/README.md](fixtures/README.md)
- Dashboard: [prototypes/README.md](prototypes/README.md)
- Slice progress: [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md)
- Agents: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)
