# Tripwire

> Discover and scan AI skills and MCP servers, then review the findings in one dashboard.

## Start safely

With [Node 22](docs/user-guide/prerequisites.md) installed, open the credential-free
Mock dashboard:

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
node scripts/serve-dashboard.mjs
```

Open [http://127.0.0.1:8765/Tripwire.dc.html](http://127.0.0.1:8765/Tripwire.dc.html).
It starts with Mock demo data when Supabase is not configured; select Live only after
you have configured it. No account or secret is needed for this first look.

| Instead of… | You can… |
|---|---|
| Starting with provider credentials | Explore a local Mock dashboard first |
| Guessing what to scan | Discover skills and MCP servers with the CLI |
| Losing scan evidence across tools | Review findings in one dashboard |

## What happens next

The workflow is deliberately small: discover the target, scan it with the enabled
adapters, then review the result. Mock lets you explore the final step safely; Live
adds Supabase, Modal, and optional scanner providers when you need real scans.

```mermaid
flowchart LR
    discover[Discover skills and MCP servers] --> scan[Scan enabled targets]
    scan --> review[Review findings in the dashboard]
```

## Find the right guide

| Your task | Start here |
|---|---|
| Try Tripwire locally | [Validate locally in QUICKSTART](QUICKSTART.md#validate-locally) |
| Set up Live scanning | [Live capabilities in QUICKSTART](QUICKSTART.md#live-capabilities) |
| Understand results and system shape | [Capability status](docs/STATUS.md) · [Architecture](docs/ARCHITECTURE.md) |
| Contribute or maintain the project | [Contributing](CONTRIBUTING.md) · [command catalog](docs/user-guide/setup-commands.md) |

For the full documentation map, see [docs/README.md](docs/README.md). The
[prerequisites](docs/user-guide/prerequisites.md), [environment-variable guide](docs/user-guide/env-vars.md),
and [setup command catalog](docs/user-guide/setup-commands.md) hold the detailed setup
and maintenance instructions.

## Proof and integrations

[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat&logo=cursor&logoColor=white)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Cisco Skill/MCP Scanner](https://img.shields.io/badge/Cisco%20Skill%2FMCP%20Scanner-1BA0D7?style=flat&logo=cisco&logoColor=white)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
