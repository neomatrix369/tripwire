# Documentation index

Use this map to move from a safe first look to the level of setup or project detail you need.

[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)
[![Complexity](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/complexity-report.yml?branch=main&label=Complexity)](https://github.com/neomatrix369/tripwire/actions/workflows/complexity-report.yml)

## Choose a task

| Your task | Start here | Then |
|---|---|---|
| Check tools and fit | [Prerequisites](./user-guide/prerequisites.md) | [Path commands](./user-guide/path-commands.md) · [onboarding cheatsheet](./user-guide/onboarding-cheatsheet.md) |
| Create Supabase / deploy Modal | [Supabase setup](./user-guide/supabase-setup.md) | [Modal setup](./user-guide/modal-setup.md) → [environment keys](./user-guide/env-vars.md) |
| Run a first Live scan | [Quickstart: ordered Live setup](../QUICKSTART.md#first-live-scan) | [Setup commands](./user-guide/setup-commands.md) → [scan and dashboard](../QUICKSTART.md#live-capabilities) |
| Enable optional tiered routing | [SIE setup](./user-guide/sie-setup.md) | [Model Studio setup](./user-guide/model-studio-setup.md) → [`tripwire route`](./user-guide/setup-commands.md#tiered-router-optional) → [read router results](./user-guide/reading-router-results.md) |
| Preview or validate locally | [Optional local validation](../QUICKSTART.md#validate-locally-optional) | [README: dashboard preview](../README.md#preview-the-dashboard-optional) · [screenshots](./screenshots/README.md) |
| Smoke-test SIE / Model Studio alone | [SIE sample CLI](../prototypes/sie-studio/README.md) | [Model Studio sample CLI](../prototypes/model-studio/README.md) |
| Understand results and system shape | [Capability status](./STATUS.md) | [Architecture](./ARCHITECTURE.md) · [ADRs](./adr/README.md) · [router UI](./user-guide/reading-router-results.md) |
| Contribute or maintain | [Contributing](../CONTRIBUTING.md) | [Setup and maintenance commands](./user-guide/setup-commands.md) |
| Report a vulnerability | [SECURITY](../SECURITY.md) | — |

## Setup and operation

| Guide | What it covers |
|---|---|
| [QUICKSTART.md](../QUICKSTART.md) | Shared setup, local validation, Live scan, and maintenance flow |
| [user-guide/prerequisites.md](./user-guide/prerequisites.md) | Required tools, technical fit, and capability prerequisites |
| [user-guide/path-commands.md](./user-guide/path-commands.md) | Install → local validation → Live setup → maintenance route |
| [user-guide/setup-commands.md](./user-guide/setup-commands.md) | One-off setup and recurring maintenance commands |
| [user-guide/env-vars.md](./user-guide/env-vars.md) | Account and credential procurement for `.env` keys |
| [user-guide/supabase-setup.md](./user-guide/supabase-setup.md) | Supabase project, API keys, schema bootstrap |
| [user-guide/modal-setup.md](./user-guide/modal-setup.md) | Modal auth, secrets sync, scan app deploy |
| [user-guide/sie-setup.md](./user-guide/sie-setup.md) | Optional Superlinked SIE keys for tiered routing |
| [user-guide/model-studio-setup.md](./user-guide/model-studio-setup.md) | Optional Alibaba Cloud Model Studio escalation |
| [user-guide/reading-router-results.md](./user-guide/reading-router-results.md) | Pathway strips, Escalated / SIE-only filters, categories |
| [user-guide/onboarding-cheatsheet.md](./user-guide/onboarding-cheatsheet.md) | Compact shared onboarding reference |
| [STATUS.md](./STATUS.md) | Evidence-labelled capability claims |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagrams, key flows, and repository layout |
| [adr/README.md](./adr/README.md) | Formal architecture decision records |
| [screenshots/](./screenshots/README.md) | CLI + dashboard gallery (Mock UI; live CLI captures) |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting |

## Project records

| Need | Reference |
|---|---|
| Contribute code or documentation | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Run the documentation smoke path | [SMOKE_TESTS.md](./plan/SMOKE_TESTS.md) |
| Review CI and Nightly workflows | [CI workflows](#ci-workflows) |
| Inspect project planning | [plan README](./plan/README.md) · [progress](./plan/PROGRESS.md) |
| Read architecture decisions | [ADR index](./adr/README.md) |
| Check scanner adapter research | [scanner output adapters](./research/adapters/scanner-output-adapters.md) |

## CI workflows

| Workflow | Role |
|---|---|
| [CI](../.github/workflows/ci.yml) | PR and main checks |
| [Nightly](../.github/workflows/nightly.yml) | Deep, non-blocking checks |
| [Code Review Graph](../.github/workflows/code-review-graph.yml) | PR knowledge-graph analysis (unprivileged; fork-safe) |
| [Code Review Graph Comment](../.github/workflows/code-review-graph-comment.yml) | Trusted sticky PR comment from the analysis artifact |
