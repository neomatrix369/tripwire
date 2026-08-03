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
| **Normal users** | Node 22 only | [docs/user-guide/persona-commands.md#normal-users](docs/user-guide/persona-commands.md#normal-users) |
| **Developers** | Node 22 + Python 3.12 + CLI + git | [docs/user-guide/persona-commands.md#developers](docs/user-guide/persona-commands.md#developers) |
| **Security experts** | Node 22 + Python 3.12 + scanner tooling | [docs/user-guide/persona-commands.md#security-experts](docs/user-guide/persona-commands.md#security-experts) |

## Start here

### Baseline prerequisites

Check all role requirements in:

- [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md)
- [docs/user-guide/env-vars.md](docs/user-guide/env-vars.md)

Use the snippets from [prerequisites.md](docs/user-guide/prerequisites.md) to run your own local checks.

### Shared setup command catalog

All one-off setup and periodic maintenance commands are maintained in one place:

- [docs/user-guide/setup-commands.md](docs/user-guide/setup-commands.md)

### Persona commands

- [Normal users](docs/user-guide/persona-commands.md#normal-users): demo-only onboarding
- [Developers](docs/user-guide/persona-commands.md#developers): fixture discovery and local checks
- [Security experts](docs/user-guide/persona-commands.md#security-experts): Live setup, scan, and dashboard validation

### Path-specific entrypoints

See [QUICKSTART.md](QUICKSTART.md) for role-specific start points and objective-based sequencing.

## Troubleshooting and contribution

### Troubleshooting shortcuts

- Live dashboard blank or stale? Switch between **Mock** and **Live** on Guard tab.
- Live selected but no data: ensure `SUPABASE_ANON_KEY` or local proxy is configured.
- Missing scanner output: confirm keys in `.env` and re-run `./scripts/setup-modal.sh --secrets-only`.
- Dry-discover is failing: verify `node_modules` was installed in `cli/` and `npm link` was run.

### Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

### Learn more

- Docs index: [docs/README.md](docs/README.md)
- New operator onboarding cheat sheet: [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md)
- Architecture (diagrams): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Capability status: [docs/STATUS.md](docs/STATUS.md)
- Fixtures: [fixtures/README.md](fixtures/README.md)
- Dashboard: [prototypes/README.md](prototypes/README.md)
- Slice progress: [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md)
- Agents: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)
