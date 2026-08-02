# Documentation index

Guides for **Tripwire**, by who you are and what you want to do.

**Repo entry:** [README.md](../README.md) · **Fastest run:** [QUICKSTART.md](../QUICKSTART.md)

> Same personas as [README → Run it](../README.md#run-it). This page is the **doc map**.

---

## Who is this for?

| Persona | Start here | Then |
|---------|------------|------|
| **Demo viewer** | [QUICKSTART → Demo](../QUICKSTART.md#demo-viewer) | [prototypes/README.md](../prototypes/README.md) |
| **Scanner user** | [QUICKSTART → Scanner](../QUICKSTART.md#scanner-user) | [fixtures/README.md](../fixtures/README.md) |
| **Platform operator** | [QUICKSTART → Platform](../QUICKSTART.md#platform-operator) | [.env.example](../.env.example) · [OPTIONAL_SCANNER_KEYS.md](../fixtures/OPTIONAL_SCANNER_KEYS.md) |
| **Operate secrets / Modal** | [.env.example](../.env.example) | [OPTIONAL_SCANNER_KEYS.md](../fixtures/OPTIONAL_SCANNER_KEYS.md) |
| **Contributor** | [CONTRIBUTING.md](../CONTRIBUTING.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) · [plan/PROGRESS.md](./plan/PROGRESS.md) |
| **Compliance / audit** | [prototypes/README.md](../prototypes/README.md) | [fixtures/README.md](../fixtures/README.md) · [STATUS.md](./STATUS.md) |
| **Security reporter** | [SECURITY.md](../SECURITY.md) | — |
| **Agent / slice worker** | [AGENTS.md](../AGENTS.md) · [CLAUDE.md](../CLAUDE.md) | [plan/PROGRESS.md](./plan/PROGRESS.md) · [plan/TRAIL.md](./plan/TRAIL.md) |

---

## Core docs

| Doc | What it covers |
|-----|----------------|
| [QUICKSTART.md](../QUICKSTART.md) | Demo / scanner / platform paths |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | C4 L1–L2 diagrams, key flows, repo layout |
| [STATUS.md](./STATUS.md) | RESEARCH / IMPLEMENTED / VERIFIED claims |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Dev setup, hygiene gates, PR conventions |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting |

---

## Research & plan

| Doc | What it covers |
|-----|----------------|
| [research/adapters/scanner-output-adapters.md](./research/adapters/scanner-output-adapters.md) | Scanner CLI output shapes (keep in sync with `sandbox/scanners.py`) |
| [plan/PROGRESS.md](./plan/PROGRESS.md) | Slice status (Horizon A 1–6; coverage wave **7–14** 📋) |
| [plan/DECISIONS.md](./plan/DECISIONS.md) | Planning decisions (incl. ship-path ~95% coverage) |
| [plan/TRAIL.md](./plan/TRAIL.md) | Execution trail + context pack (`internal-docs/00_build/`) |
| [plan/slice-7-coverage-audit-matrix.md](./plan/slice-7-coverage-audit-matrix.md) | Next Must: coverage audit (then 8–14) |

---

## Common tasks → doc

| Task | Doc / command |
|------|----------------|
| Mock dashboard in 2 minutes | [QUICKSTART → Demo](../QUICKSTART.md#demo-viewer) |
| Dry-discover a fixture | [QUICKSTART → Scanner](../QUICKSTART.md#scanner-user) |
| Full stack scan | [QUICKSTART → Platform](../QUICKSTART.md#platform-operator) |
| Understand system shape | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| What is verified today? | [STATUS.md](./STATUS.md) |
| Quality gates / hooks | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Continue a slice | [plan/PROGRESS.md](./plan/PROGRESS.md) |

---

## CI workflows

Status badges (source of truth for partner strip is still the [root README](../README.md)):

[![CI](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/ci.yml?branch=main&label=CI)](https://github.com/neomatrix369/tripwire/actions/workflows/ci.yml)
[![Nightly](https://img.shields.io/github/actions/workflow/status/neomatrix369/tripwire/nightly.yml?branch=main&label=Nightly)](https://github.com/neomatrix369/tripwire/actions/workflows/nightly.yml)

| Workflow | Path | Role |
|----------|------|------|
| CI | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | T1–T3 on PR/push/main |
| Nightly | [`.github/workflows/nightly.yml`](../.github/workflows/nightly.yml) | T4 deep checks (mutation, full history secrets, …) |
| Code Review Graph | [`.github/workflows/code-review-graph.yml`](../.github/workflows/code-review-graph.yml) | PR knowledge-graph assist |

---

<!-- Primary stack -->
[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

<!-- Scanner & partner -->
[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Overmind](https://img.shields.io/badge/Overmind-Phase%205-6B7280?style=flat)](https://overmind.tech)
[![Ossprey](https://img.shields.io/badge/Ossprey-Sponsor-0F766E?style=flat)](https://www.ossprey.com/?utm_source=luma)
