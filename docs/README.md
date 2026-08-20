# Documentation index

Use this map to move from a first look to the setup or project detail you need.

Start here: [QUICKSTART](../QUICKSTART.md) · Repo entry: [README](../README.md)

[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)
[![Complexity](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/complexity-report.yml?branch=main&label=Complexity)](https://github.com/neomatrix369/tripwire/actions/workflows/complexity-report.yml)

## Choose a task

| Your task | Start here | Then |
|---|---|---|
| Try demo (no accounts) | [QUICKSTART — demo](../QUICKSTART.md#try-the-demo-recommended) | [Setup commands](./user-guide/setup-commands.md) · [screenshots](./screenshots/README.md) |
| Check tools and fit | [Prerequisites](./user-guide/prerequisites.md) | [QUICKSTART](../QUICKSTART.md) |
| Create Supabase / deploy Modal | [Supabase setup](./user-guide/supabase-setup.md) | [Modal setup](./user-guide/modal-setup.md) → [environment keys](./user-guide/env-vars.md) |
| Run a first Live scan | [QUICKSTART — Live](../QUICKSTART.md#live-advanced) | [Setup commands](./user-guide/setup-commands.md) |
| Enable optional tiered routing | [Tiered router setup](./user-guide/tiered-router-setup.md) | [`tripwire route`](./user-guide/setup-commands.md#tiered-router-optional) → [read router results](./user-guide/reading-router-results.md) |
| Understand results and system shape | [Capability status](./STATUS.md) | [Architecture](./ARCHITECTURE.md) · [ADRs](./adr/README.md) · [router UI](./user-guide/reading-router-results.md) |
| Claude Code agent hooks | [agent-hooks README](../agent-hooks/README.md) | [CONTRIBUTING](../CONTRIBUTING.md) |
| Contribute or maintain | [Contributing](../CONTRIBUTING.md) | [Setup and maintenance commands](./user-guide/setup-commands.md) |
| Report a vulnerability | [SECURITY](../SECURITY.md) | — |

## Setup and operation

| Guide | What it covers |
|---|---|
| [QUICKSTART.md](../QUICKSTART.md) | Demo (Recommended) then Live (Advanced) |
| [user-guide/prerequisites.md](./user-guide/prerequisites.md) | Required tools, technical fit, capability prerequisites |
| [user-guide/setup-commands.md](./user-guide/setup-commands.md) | Command SSOT: bootstrap, flags, fails, maintenance |
| [user-guide/env-vars.md](./user-guide/env-vars.md) | Account and credential procurement for `.env` keys |
| [user-guide/supabase-setup.md](./user-guide/supabase-setup.md) | Supabase project, API keys, schema bootstrap |
| [user-guide/modal-setup.md](./user-guide/modal-setup.md) | Modal auth, secrets sync, scan app deploy |
| [user-guide/tiered-router-setup.md](./user-guide/tiered-router-setup.md) | Optional SIE + Model Studio routing |
| [user-guide/reading-router-results.md](./user-guide/reading-router-results.md) | Pathway strips, Escalated / SIE-only filters, glossary |
| [STATUS.md](./STATUS.md) | Evidence-labelled capability claims |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagrams, key flows, and repository layout |
| [adr/README.md](./adr/README.md) | Formal architecture decision records |
| [screenshots/](./screenshots/README.md) | CLI + dashboard gallery |
| [agent-hooks/README.md](../agent-hooks/README.md) | Claude Code hooks + `/tw-*` skills |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting |

## Project records

| Need | Reference |
|---|---|
| Contribute code or documentation | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Run the documentation smoke path | [SMOKE_TESTS.md](./plan/SMOKE_TESTS.md) |
| Review CI and Nightly workflows | [CI workflows](#ci-workflows) |
| Inspect project planning | [plan README](./plan/README.md) · [progress](./plan/PROGRESS.md) |
| Check scanner adapter research | [scanner output adapters](./research/adapters/scanner-output-adapters.md) |

## CI workflows

| Workflow | Role |
|---|---|
| [CI](../.github/workflows/ci.yml) | PR and main checks |
| [Nightly](../.github/workflows/nightly.yml) | Deep, non-blocking checks |
| [Code Review Graph](../.github/workflows/code-review-graph.yml) | PR knowledge-graph analysis (unprivileged; fork-safe) |
| [Code Review Graph Comment](../.github/workflows/code-review-graph-comment.yml) | Trusted sticky PR comment from the analysis artifact |
