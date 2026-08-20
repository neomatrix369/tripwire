# Tripwire

> Discover and scan AI skills and MCP servers, then review the findings in one dashboard.

**Tripwire is a metal detector for AI tools.** It finds skills and chat plug-ins,
checks them with safety scanners, and shows the results in one screen.

## Where do you want to go?

| If you want to… | Go here |
|---|---|
| **Try a safe demo** (no cloud accounts) — Recommended | [QUICKSTART — Try the demo](QUICKSTART.md#try-the-demo-recommended) |
| **Run a real Live scan** — Advanced | [QUICKSTART — Live](QUICKSTART.md#live-advanced) |
| **Change the code** | [CONTRIBUTING](CONTRIBUTING.md) |
| **Understand the system** | [docs hub](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Status](docs/STATUS.md) |

<details>
<summary>Badges and stack</summary>

<!-- badges:start -->
<!-- Group 1: Tech stack -->
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Modal](https://img.shields.io/badge/Modal-7C5CFF?logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Cisco Skill/MCP Scanner](https://img.shields.io/badge/Cisco%20Skill%2FMCP%20Scanner-1BA0D7?logo=cisco&logoColor=white)
![Snyk](https://img.shields.io/badge/Snyk-4C4A73?logo=snyk&logoColor=white)
![Tessl](https://img.shields.io/badge/Tessl-111111)
![Superlinked SIE](https://img.shields.io/badge/Superlinked%20SIE-0B1F3A)
![Alibaba Cloud Model Studio](https://img.shields.io/badge/Alibaba%20Cloud%20Model%20Studio-FF6A00)

<!-- Group 2: CI / Quality -->
[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly&logo=githubactions&logoColor=white)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)
[![Complexity](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/complexity-report.yml?branch=main&label=Complexity&logo=githubactions&logoColor=white)](https://github.com/neomatrix369/tripwire/actions/workflows/complexity-report.yml)
[![Code Review Graph](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/code-review-graph.yml?branch=main&label=Code+Review+Graph&logo=githubactions&logoColor=white)](https://github.com/neomatrix369/tripwire/actions/workflows/code-review-graph.yml)
[![Security](https://www.meterian.com/badge/gh/neomatrix369/tripwire/security)](https://www.meterian.com/report/gh/neomatrix369/tripwire)
[![Stability](https://www.meterian.com/badge/gh/neomatrix369/tripwire/stability)](https://www.meterian.com/report/gh/neomatrix369/tripwire)
[![Licensing](https://www.meterian.com/badge/gh/neomatrix369/tripwire/licensing)](https://www.meterian.com/report/gh/neomatrix369/tripwire)
[![Release](https://img.shields.io/github/v/release/neomatrix369/tripwire?label=Release&logo=github)](https://github.com/neomatrix369/tripwire/releases)
[![License](https://img.shields.io/github/license/neomatrix369/tripwire)](https://github.com/neomatrix369/tripwire/blob/main/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/neomatrix369/tripwire)](https://github.com/neomatrix369/tripwire/commits/main)
[![Stars](https://img.shields.io/github/stars/neomatrix369/tripwire?style=social)](https://github.com/neomatrix369/tripwire)
<!-- badges:end -->

Meterian **Security** / **Stability** / **Licensing** badges mirror the public
[Meterian project report](https://www.meterian.com/report/gh/neomatrix369/tripwire).
CI / Nightly / Complexity badges reflect GitHub Actions on `main`.

</details>

![Tripwire banner](./Tripwire-Banner.png)

## Who this is for

You should be comfortable with a terminal, `.env` files, and creating cloud
accounts when you want **Live** scans. A no-account **Mock** preview is available
to look at the dashboard first.

| You are… | You want to… |
|---|---|
| An AI-tooling developer or team | Assess skills and MCP servers before using them |
| A platform / ops / security practitioner | Run and maintain scans for a team |
| A contributor | Extend scanners, CLI, or dashboard — start [Dev hygiene](CONTRIBUTING.md#dev-hygiene) after clone |

## How it works (short)

| Step | Plain words | Stack |
|---|---|---|
| Discover | Find skills / MCP servers | Node.js CLI |
| Scan | Check them in an isolated sandbox | Modal + Cisco / Snyk / Tessl |
| Store | Save results for the dashboard | Supabase |
| Route (optional) | Smart sorter; second checker only when needed | Superlinked SIE → Model Studio |
| Review | One dashboard (Live or Mock) | [reading-router-results](docs/user-guide/reading-router-results.md) |

```mermaid
flowchart LR
  discover["Discover"] --> scan["Scan"]
  scan --> store["Store"]
  store --> route["Route optional"]
  route --> review["Review"]
```

Full setup, vendor keys, and commands: **[QUICKSTART](QUICKSTART.md)** · task map: **[docs/README](docs/README.md)**.

### Screenshots

[CLI scan](docs/screenshots/01-cli/02-cli-real-scan-modal-sandbox.png) ·
[Dashboard](docs/screenshots/02-dashboard/02-dashboard-overview-grid.png) ·
[Escalated filter](docs/screenshots/02-dashboard/14-filter-escalated.png) ·
Full gallery → [docs/screenshots/](docs/screenshots/README.md)

Visual identity (cream paper, tan CTA): [PR #96](https://github.com/neomatrix369/tripwire/pull/96).

## Report a vulnerability

See [SECURITY.md](SECURITY.md).
