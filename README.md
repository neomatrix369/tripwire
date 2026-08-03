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

## Use Tripwire

Tripwire has one installation, setup, run, and maintenance flow. It suits people
comfortable with command-line setup who have an interest in security findings.
Mock and dry-discover are optional local validation modes; Supabase, Modal, and
scanner keys are needed only for the corresponding Live capabilities.
See [who can set up and run Tripwire](docs/user-guide/prerequisites.md#who-can-set-up-and-run-tripwire)
for the expected technical comfort level.

## Start here

### Baseline prerequisites

Check the shared requirements in:

- [docs/user-guide/prerequisites.md](docs/user-guide/prerequisites.md)
- [docs/user-guide/env-vars.md](docs/user-guide/env-vars.md)

Use the snippets from [prerequisites.md](docs/user-guide/prerequisites.md) to run your own local checks.

### Shared setup command catalog

All one-off setup and periodic maintenance commands are maintained in one place:

- [docs/user-guide/setup-commands.md](docs/user-guide/setup-commands.md)
- [Role-neutral onboarding path](docs/user-guide/path-commands.md)

### Run and validate

Follow [QUICKSTART.md](QUICKSTART.md), including
[path-commands.md](docs/user-guide/path-commands.md#local-validation-node-22--mock-dashboard), for installation,
optional local validation,
Live capability setup, scans, dashboard review, and maintenance. Re-run and
maintenance commands are in [docs/user-guide/setup-commands.md](docs/user-guide/setup-commands.md).

## Troubleshooting and contribution

### Troubleshooting shortcuts

- Live dashboard blank or stale? Switch between **Mock** and **Live** on Guard tab.
- Live selected but no data: ensure `SUPABASE_ANON_KEY` or local proxy is configured.
- Missing scanner output: confirm keys in `.env` and re-run `./scripts/setup-modal.sh --secrets-only`.
- Dry-discover is failing: verify `node_modules` was installed in `cli/` and `npm link` was run.

### Contribute

**Contributors** use Tripwire and also improve or share it. After completing the
shared setup, follow [CONTRIBUTING.md](CONTRIBUTING.md) for development and PR
work. Security reports: [SECURITY.md](SECURITY.md).

### Learn more

- Docs index: [docs/README.md](docs/README.md)
- End-to-end docs smoke test plan: [docs/plan/SMOKE_TESTS.md](docs/plan/SMOKE_TESTS.md)
- New contributor onboarding cheat sheet: [docs/user-guide/onboarding-cheatsheet.md](docs/user-guide/onboarding-cheatsheet.md)
- Architecture (diagrams): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Capability status: [docs/STATUS.md](docs/STATUS.md)
- Fixtures: [fixtures/README.md](fixtures/README.md)
- Dashboard: [prototypes/README.md](prototypes/README.md)
- Slice progress: [docs/plan/PROGRESS.md](docs/plan/PROGRESS.md)
- Agents: [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md)
