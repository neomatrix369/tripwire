# Documentation index

Use this map to move from a safe first look to the level of setup or project detail you need.

## Choose a task

| Your task | Start here | Then |
|---|---|---|
| Try locally | [README: Mock dashboard](../README.md#start-safely) | [Validate locally](../QUICKSTART.md#validate-locally) |
| Set up Live scanning | [Live capabilities](../QUICKSTART.md#live-capabilities) | [Supabase setup](./user-guide/supabase-setup.md) → [Modal setup](./user-guide/modal-setup.md) → [environment keys](./user-guide/env-vars.md) |
| Understand results and system shape | [Capability status](./STATUS.md) | [Architecture](./ARCHITECTURE.md) |
| Contribute or maintain | [Contributing](../CONTRIBUTING.md) | [Setup and maintenance commands](./user-guide/setup-commands.md) |

## Setup and operation

| Guide | What it covers |
|---|---|
| [QUICKSTART.md](../QUICKSTART.md) | Shared setup, local validation, Live scan, and maintenance flow |
| [user-guide/prerequisites.md](./user-guide/prerequisites.md) | Required tools, technical fit, and capability prerequisites |
| [user-guide/path-commands.md](./user-guide/path-commands.md) | Install → local validation → Live setup → maintenance route |
| [user-guide/setup-commands.md](./user-guide/setup-commands.md) | One-off setup and recurring maintenance commands |
| [user-guide/env-vars.md](./user-guide/env-vars.md) | Account and credential procurement for `.env` keys |
| [user-guide/onboarding-cheatsheet.md](./user-guide/onboarding-cheatsheet.md) | Compact shared onboarding reference |
| [STATUS.md](./STATUS.md) | Evidence-labelled capability claims |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System diagrams, key flows, and repository layout |
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

[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)

| Workflow | Role |
|---|---|
| [CI](../.github/workflows/ci.yml) | PR and main checks |
| [Nightly](../.github/workflows/nightly.yml) | Deep, non-blocking checks |
| [Code Review Graph](../.github/workflows/code-review-graph.yml) | PR knowledge-graph assistance |
