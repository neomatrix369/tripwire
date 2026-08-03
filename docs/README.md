# Documentation index

Guides for **Tripwire**, by who you are and what you want to do.

**Repo entry:** [README.md](../README.md) · **Fastest run:** [QUICKSTART.md](../QUICKSTART.md)

> Same personas as [README → Choose your path](../README.md#choose-your-path). This page is the **doc map**.

---

## Who is this for?

| Role | Start here | Then |
|------|------------|------|
| **Normal users** | [user-guide/onboarding-cheatsheet](./user-guide/onboarding-cheatsheet.md) | [QUICKSTART → Normal users](../QUICKSTART.md#normal-users) (select **Mock**) |
| **Developers** | [onboarding-cheatsheet](./user-guide/onboarding-cheatsheet.md) → [prerequisites](./user-guide/prerequisites.md) → [setup-commands](./user-guide/setup-commands.md) | [Persona commands](./user-guide/persona-commands.md#developers) |
| **Security experts** | [prerequisites](./user-guide/prerequisites.md) → [env-vars](./user-guide/env-vars.md) → [setup-commands](./user-guide/setup-commands.md) → [supabase-setup](./user-guide/supabase-setup.md) → [modal-setup](./user-guide/modal-setup.md) | [persona-commands.md#security-experts](./user-guide/persona-commands.md#security-experts) |
| **Maintainers** | [CONTRIBUTING.md](../CONTRIBUTING.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) · [plan/PROGRESS.md](./plan/PROGRESS.md) |
| **Security and reporting stakeholders** | [SECURITY.md](../SECURITY.md) · [prototypes/README.md](../prototypes/README.md) | [fixtures/README.md](../fixtures/README.md) · [STATUS.md](./STATUS.md) |
| **Planning / slice workflows** | [AGENTS.md](../AGENTS.md) · [CLAUDE.md](../CLAUDE.md) | [plan/PROGRESS.md](./plan/PROGRESS.md) · [plan/TRAIL.md](./plan/TRAIL.md) |

### Choose Your Path

| Path | Cloud? | First docs |
|------|--------|------------|
| Normal users | No | [onboarding-cheatsheet](./user-guide/onboarding-cheatsheet.md) → [setup-commands](./user-guide/setup-commands.md) → [QUICKSTART](../QUICKSTART.md#normal-users) |
| Developers | No (optional cloud later) | [onboarding-cheatsheet](./user-guide/onboarding-cheatsheet.md) → [setup-commands](./user-guide/setup-commands.md) → [QUICKSTART](../QUICKSTART.md#developers) → [persona-commands](./user-guide/persona-commands.md#developers) |
| Security experts | Yes | [setup-commands](./user-guide/setup-commands.md) → [supabase-setup](./user-guide/supabase-setup.md) → [modal-setup](./user-guide/modal-setup.md) → [env-vars](./user-guide/env-vars.md) |

---

## Core docs

| Doc | What it covers |
|-----|----------------|
| [user-guide/onboarding-cheatsheet.md](./user-guide/onboarding-cheatsheet.md) | Persona route map for role-first onboarding |
| [QUICKSTART.md](../QUICKSTART.md) | Normal users / Developers / Security experts paths |
| [user-guide/prerequisites.md](./user-guide/prerequisites.md) | Role × tool matrix; Node 22 / Python 3.12 |
| [user-guide/setup-commands.md](./user-guide/setup-commands.md) | Shared one-off setup and maintenance command catalog |
| [user-guide/env-vars.md](./user-guide/env-vars.md) | Procurement SSOT for `.env.example` keys |
| [user-guide/persona-commands.md](./user-guide/persona-commands.md) | Persona-specific command playbooks |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | C4 L1–L2 diagrams, key flows, repo layout |
| [STATUS.md](./STATUS.md) | RESEARCH / IMPLEMENTED / VERIFIED claims |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Dev setup, hygiene gates, PR conventions |
| [SECURITY.md](../SECURITY.md) | Vulnerability reporting |

---

## Research & plan

| Doc | What it covers |
|-----|----------------|
| [research/adapters/scanner-output-adapters.md](./research/adapters/scanner-output-adapters.md) | Scanner CLI output shapes (keep in sync with `sandbox/scanners.py`) |
| [plan/EMOJI_LEGEND.md](./plan/EMOJI_LEGEND.md) | Emoji meanings used across plan/status docs |
| [plan/README.md](./plan/README.md) | Wave folders `01-A-…` … `06-F-…` + tracker map |
| [plan/PROGRESS.md](./plan/PROGRESS.md) | Slice groups A–F (execution order); next **E/8** → 11–13 |
| [plan/DECISIONS.md](./plan/DECISIONS.md) | Planning decisions (incl. ship-path ~95%; demo/hackathon closed) |
| [plan/GATE_CONTRACT.md](./plan/GATE_CONTRACT.md) | Before/After close rule — ✅ only when all gates met |
| [plan/TRAIL.md](./plan/TRAIL.md) | Execution trail + context pack (private references) |
| [plan/slices/04-D-operator-onboarding/](./plan/slices/04-D-operator-onboarding/) | Wave D / slice 17 onboarding ✅ · next E coverage |

---

## Common tasks → doc

| Task | Doc / command |
|------|----------------|
| Mock dashboard in 2 minutes | [QUICKSTART → Normal users](../QUICKSTART.md#normal-users) |
| Dry-discover a fixture | [QUICKSTART → Developers](../QUICKSTART.md#developers) |
| Full stack scan | [QUICKSTART → Security experts](../QUICKSTART.md#security-experts) |
| Setup + commands by tempo | [user-guide/onboarding-cheatsheet.md](./user-guide/onboarding-cheatsheet.md) |
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
