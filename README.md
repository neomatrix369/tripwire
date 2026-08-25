# Tripwire

> Discover and scan AI skills and MCP servers, then review the findings in one dashboard.

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
![DepShield](https://img.shields.io/badge/DepShield-2F6F4E)
![Ossprey](https://img.shields.io/badge/Ossprey-1A1A2E)
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
[Meterian project report](https://www.meterian.com/report/gh/neomatrix369/tripwire)
(dependency and policy scan for this GitHub repo — not a Tripwire scan adapter).
CI / Nightly / Complexity badges reflect GitHub Actions on `main`.

![Tripwire banner](./Tripwire-Banner.png)

## Where do you want to go?

| If you want to… | Go here |
|---|---|
| **Try a hosted dashboard** (no clone) | [Live demo on neomatrix369.github.io](https://neomatrix369.github.io/demos/tripwire-dashboard/) |
| **Try a safe demo** (no cloud accounts) — Recommended | [QUICKSTART — Try the demo](QUICKSTART.md#try-the-demo-recommended) |
| **Run a real Live scan** — Advanced | [QUICKSTART — Live](QUICKSTART.md#live-advanced) |
| **Change the code** | [CONTRIBUTING](CONTRIBUTING.md) |
| **Understand the system** | [Architecture](docs/ARCHITECTURE.md) · [docs hub](docs/README.md) · [Status](docs/STATUS.md) |

## What Tripwire does

Tripwire helps technical teams assess AI skills and MCP servers before they rely
on them. It discovers targets, runs the enabled scanner adapters in an isolated
Modal sandbox, stores findings in Supabase, and brings them together in one
dashboard (Live or Mock).

Optionally, after each scan batch it runs a tiered router: **Superlinked SIE**
triages findings, and **Alibaba Cloud Model Studio** escalates when scanners
disagree or coverage looks incomplete ([ADR-0016](docs/adr/0016-tiered-router-sie-model-studio.md)).

### Providers and scanners

| Layer | Provider / tool | Role |
|---|---|---|
| Platform | **Modal** | Isolated scan sandbox (Docker image + Python adapters) |
| Platform | **Supabase** | Postgres + Realtime store for runs, scanners, findings |
| Scanner | **Cisco** Skill Scanner / MCP Scanner / AI Defense | Skill and MCP security inspection |
| Scanner | **Snyk** (`snyk-agent-scan`) | Depth / agent scan for skills and MCP servers |
| Scanner | **Tessl** | Five skill capabilities: Lint (auth-free), Review (Quality), Scenario Generation, Eval, Review (Security) |
| Scanner | **DepShield** (`depshield-mcp`) | Dependency audit (npm + PyPI via OSV.dev); **no credentials** |
| Scanner | **Ossprey** (`ossprey-cli`) | Malware / malicious-package scan (skills + MCP); needs `OSSPREY_API_KEY` |
| Router (optional) | **Superlinked SIE** | Cheap post-scan triage on every item |
| Router (optional) | **Alibaba Cloud Model Studio** | Escalation only when SIE signals |

Missing Snyk / Cisco / Tessl / Ossprey keys → that scanner reports skipped /
`needs_setup` / `skipped_missing_credential` rather than claiming a complete scan.
DepShield always runs when the sandbox image includes it (no secret sync).
Capability honesty and evidence states: [docs/STATUS.md](docs/STATUS.md) ·
inventory: [ARCHITECTURE §0](docs/ARCHITECTURE.md#0-external-services-inventory) ·
Ossprey key allowlist: [OPTIONAL_SCANNER_KEYS](fixtures/OPTIONAL_SCANNER_KEYS.md).

## Who Tripwire is for

Tripwire is currently an early-adopter tool with a hands-on setup and management
component. It is a good fit if you are comfortable using a terminal and shell,
managing local tooling and environment variables, editing `.env` and other
configuration files carefully, creating cloud/vendor accounts, and using command
output to resolve a setup issue.

| You are... | You want to... |
|---|---|
| An AI-tooling developer or team | Assess skills and MCP servers before using or sharing them |
| A platform, operations, or security practitioner | Run and maintain scans for a team |
| A contributor | Extend scanner support, the CLI, or the dashboard |

You do not need to be a security specialist, but you should be ready to interpret
findings and decide when to escalate them. The optional Mock preview is available
for evaluating the dashboard without accounts; real scans require the setup below.

If you plan to change Tripwire, start the [contributor setup](CONTRIBUTING.md#dev-hygiene)
after cloning: it installs the commit and push hooks before your first change.

## Run your first Live scan

Follow this order before running a scan or opening the Live dashboard. The
[Quickstart](QUICKSTART.md#first-live-scan) supplies the commands; the linked guides
explain each decision before you make it.

1. Check the required tools and [install the CLI](docs/user-guide/setup-commands.md#repository-and-cli-bootstrap).
2. Create the accounts you need: [Supabase](docs/user-guide/supabase-setup.md),
   [Modal](docs/user-guide/modal-setup.md), then add Snyk, Tessl, and Cisco
   (Skill/MCP LLM + optional AI Defense) credentials with the
   [environment-variable procurement guide](docs/user-guide/env-vars.md#vendor-procurement-quick-steps).
   DepShield needs no keys. Add `OSSPREY_API_KEY` when you have Ossprey access
   (otherwise that adapter skips safely). For optional post-scan routing
   ([ADR-0016](docs/adr/0016-tiered-router-sie-model-studio.md)),
   also set up [Superlinked SIE](docs/user-guide/sie-setup.md) (required for routing)
   and optionally [Alibaba Cloud Model Studio](docs/user-guide/model-studio-setup.md)
   (escalation only). Key map for every `.env` name: [env-vars.md](docs/user-guide/env-vars.md)
   (mirrors [`.env.example`](.env.example)).
3. Create `.env` only after you have the values, then fill it with
   [env-vars.md](docs/user-guide/env-vars.md) as the single key reference.
4. Bootstrap Supabase and deploy the Modal scan app with the
   [Live setup commands](docs/user-guide/setup-commands.md#live-environment-bootstrap).
5. Run a fixture scan and open the Live dashboard from the
   [Quickstart](QUICKSTART.md#live-capabilities). After routing, use
   [`tripwire route`](docs/user-guide/setup-commands.md#tiered-router-optional) to
   re-run a batch and [read router results](docs/user-guide/reading-router-results.md)
   for pathway strips and Escalated / SIE-only filters.

Supabase and Modal are required for Live results. If Snyk, Tessl, Cisco, or Ossprey
credentials are absent, Tripwire reports that scanner as skipped rather than calling
the scan complete.
SIE and Model Studio are optional: without SIE keys, scans still complete and auto-route
logs a warning and skips. With SIE but without Model Studio, SIE-only reviews still log.

## Preview the dashboard (optional)

Use Mock demo data only when you want a no-account look at the UI; it does not replace
the Live setup above or produce a scan result. Prefer the
[hosted demo](https://neomatrix369.github.io/demos/tripwire-dashboard/) when you
do not need a local clone.

```bash
git clone https://github.com/neomatrix369/tripwire.git
cd tripwire
node scripts/serve-dashboard.mjs
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

The first visit shows a landing intro screen (threat statistics, architecture overview,
shipped skills, and roadmap). Click **Open Dashboard →** to proceed to the scan results
view. The "About" nav button toggles the intro back on at any time; the choice is
remembered in `sessionStorage`.

> **Visual identity v2:** cream paper, tan primary CTA, and AA-readable ink tokens
> (Fraunces display headings) — shipped via [PR #96](https://github.com/neomatrix369/tripwire/pull/96).
> Screenshots in [docs/screenshots/](docs/screenshots/README.md) regenerated 2026-08-20.

After installing the CLI, you can also validate target discovery locally without
accounts or a scan:

```bash
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
```

## What happens next

Tripwire’s Live path is a short pipeline. Each hop uses a concrete piece of the
stack (same names as the badges above):

| Step | What runs | Stack | Setup |
|---|---|---|---|
| Discover | CLI finds skills / MCP servers (`tripwire scan --dry-discover` or a real scan) | Node.js CLI | [setup-commands](docs/user-guide/setup-commands.md#repository-and-cli-bootstrap) |
| Scan | Adapters run in an isolated sandbox | Modal (+ Docker), Cisco / Snyk / Tessl / DepShield / Ossprey | [modal-setup](docs/user-guide/modal-setup.md) · [env-vars](docs/user-guide/env-vars.md) |
| Store | Findings and scan_run rows land for the dashboard | Supabase / Postgres | [supabase-setup](docs/user-guide/supabase-setup.md) |
| Route (optional) | Every item through SIE; escalate only when signaled | Superlinked SIE → Alibaba Cloud Model Studio via `tripwire route` / auto-route | [sie-setup](docs/user-guide/sie-setup.md) · [model-studio-setup](docs/user-guide/model-studio-setup.md) |
| Review | Heatmap, drawers, pathway strips, Escalated / SIE-only filters | Dashboard (Live or Mock) | [reading-router-results](docs/user-guide/reading-router-results.md) · [screenshots](docs/screenshots/README.md) |

Mock skips Discover→Scan→Store and still shows Review (plus router fixtures).
Without SIE keys, Route warns and skips; scanner results still store. Sample CLIs
for router backends (no full batch): [`prototypes/sie-studio/`](prototypes/sie-studio/README.md),
[`prototypes/model-studio/`](prototypes/model-studio/README.md).

```mermaid
flowchart LR
  discover["Discover<br/>Node CLI"] --> scan["Scan<br/>Modal + Cisco/Snyk/Tessl/DepShield/Ossprey"]
  scan --> store["Store<br/>Supabase"]
  store --> route["Route optional<br/>SIE → Model Studio"]
  route --> review["Review<br/>Dashboard"]
```

How to read strips and filters after Route:
[reading-router-results.md](docs/user-guide/reading-router-results.md).

### Screenshots

<table>
<tr>
  <td align="center" width="20%">
    <a href="docs/screenshots/01-cli/02-cli-real-scan-modal-sandbox.png">
      <img src="docs/screenshots/01-cli/02-cli-real-scan-modal-sandbox.png" width="100%" alt="CLI — real scan with Modal sandbox output">
    </a>
    <sub><b>CLI scan</b> — Modal (live)</sub>
  </td>
  <td align="center" width="20%">
    <a href="docs/screenshots/02-dashboard/02-dashboard-overview-grid.png">
      <img src="docs/screenshots/02-dashboard/02-dashboard-overview-grid.png" width="100%" alt="Dashboard overview grid (Mock demo data)">
    </a>
    <sub><b>Dashboard</b> — Mock overview</sub>
  </td>
  <td align="center" width="20%">
    <a href="docs/screenshots/02-dashboard/14-filter-escalated.png">
      <img src="docs/screenshots/02-dashboard/14-filter-escalated.png" width="100%" alt="Dashboard Escalated filter (Mock)">
    </a>
    <sub><b>Router</b> — Escalated (Mock)</sub>
  </td>
  <td align="center" width="20%">
    <a href="docs/screenshots/03-skills/04-red-skill-detail-vuln-prompt-injection.png">
      <img src="docs/screenshots/03-skills/04-red-skill-detail-vuln-prompt-injection.png" width="100%" alt="Skill detail — prompt injection finding (Mock)">
    </a>
    <sub><b>Skill</b> — Red (Mock)</sub>
  </td>
  <td align="center" width="20%">
    <a href="docs/screenshots/04-mcp-servers/10-red-mcp-detail-vuln-command-injection.png">
      <img src="docs/screenshots/04-mcp-servers/10-red-mcp-detail-vuln-command-injection.png" width="100%" alt="MCP server detail — command injection finding (Mock)">
    </a>
    <sub><b>MCP</b> — Red (Mock)</sub>
  </td>
</tr>
</table>

> Full gallery (SIE-only, severity filters, list view) → [docs/screenshots/](docs/screenshots/README.md)

## Find the right guide

| Your task | Start here |
|---|---|
| Check tools and technical fit | [Prerequisites](docs/user-guide/prerequisites.md) |
| Follow the Install → Live path map | [Path commands](docs/user-guide/path-commands.md) · [onboarding cheatsheet](docs/user-guide/onboarding-cheatsheet.md) |
| Create the Supabase project | [Supabase setup](docs/user-guide/supabase-setup.md) |
| Deploy the Modal scan app | [Modal setup](docs/user-guide/modal-setup.md) |
| Procure scanner and router `.env` keys | [Environment variables](docs/user-guide/env-vars.md) |
| Run your first Live scan | [Quickstart](QUICKSTART.md#first-live-scan) · [setup commands](docs/user-guide/setup-commands.md) |
| Preview Mock UI or dry-discover locally | [Optional local validation](QUICKSTART.md#validate-locally-optional) |
| Enable SIE / Model Studio routing | [SIE setup](docs/user-guide/sie-setup.md) · [Model Studio setup](docs/user-guide/model-studio-setup.md) · [`tripwire route`](docs/user-guide/setup-commands.md#tiered-router-optional) |
| Interpret pathway strips / Escalated / SIE-only | [Reading router results](docs/user-guide/reading-router-results.md) |
| Browse CLI / dashboard screenshots | [Screenshot gallery](docs/screenshots/README.md) |
| Smoke-test SIE or Model Studio alone | [SIE sample CLI](prototypes/sie-studio/README.md) · [Model Studio sample CLI](prototypes/model-studio/README.md) |
| Understand results and system shape | [Capability status](docs/STATUS.md) · [Architecture](docs/ARCHITECTURE.md) · [ADRs](docs/adr/README.md) |
| Contribute or maintain | [Contributing](CONTRIBUTING.md) · [command catalog](docs/user-guide/setup-commands.md) |
| Report a vulnerability | [SECURITY](SECURITY.md) |

Full map (including planning / CI): [docs/README.md](docs/README.md).
