# Documentation index

Guides for installing, using, maintaining, and contributing to **Tripwire**.

**Repo entry:** [README.md](../README.md) · **Fastest run:** [QUICKSTART.md](../QUICKSTART.md)

> This page is the **doc map**. Start with the shared setup flow; use the
> contributor guide only when you want to change or share the project.

---

## Start here

| Step | Guide |
|------|-------|
| Install and configure | [onboarding cheatsheet](./user-guide/onboarding-cheatsheet.md) → [prerequisites](./user-guide/prerequisites.md) → [setup commands](./user-guide/setup-commands.md) |
| Validate locally | [QUICKSTART → Validate locally](../QUICKSTART.md#validate-locally) |
| Enable Live capabilities | [Supabase setup](./user-guide/supabase-setup.md) → [Modal setup](./user-guide/modal-setup.md) → [environment keys](./user-guide/env-vars.md) |
| Contributor path | Use Tripwire first, then [CONTRIBUTING.md](../CONTRIBUTING.md) → [ARCHITECTURE.md](./ARCHITECTURE.md) to develop and share improvements |
| Report a vulnerability | [SECURITY.md](../SECURITY.md) |

---

## Core docs

| Doc | What it covers |
|-----|----------------|
| [user-guide/onboarding-cheatsheet.md](./user-guide/onboarding-cheatsheet.md) | Shared installation and setup sequence |
| [QUICKSTART.md](../QUICKSTART.md) | Shared setup, validation, Live scan, and maintenance flow |
| [user-guide/prerequisites.md](./user-guide/prerequisites.md) | Tool and capability prerequisites; Node 22 / Python 3.12 |
| [user-guide/setup-commands.md](./user-guide/setup-commands.md) | Shared one-off setup and maintenance command catalog |
| [user-guide/env-vars.md](./user-guide/env-vars.md) | Procurement SSOT for `.env.example` keys |
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
| [plan/PROGRESS.md](./plan/PROGRESS.md) | Slice groups A–F; E Musts ✅ · next **14** (coverage sync) → 15 |
| [plan/DECISIONS.md](./plan/DECISIONS.md) | Planning decisions (incl. ship-path ~95%; demo/hackathon closed) |
| [plan/GATE_CONTRACT.md](./plan/GATE_CONTRACT.md) | Before/After close rule — ✅ only when all gates met |
| [plan/TRAIL.md](./plan/TRAIL.md) | Execution trail + context pack (private references) |
| [plan/slices/04-D-operator-onboarding/](./plan/slices/04-D-operator-onboarding/) | Wave D / slice 17 onboarding ✅ |
| [plan/slices/05-E-ship-path-coverage/](./plan/slices/05-E-ship-path-coverage/) | Wave E ship-path coverage · Musts ✅ · slice 14 open |

---

## Common tasks → doc

| Task | Doc / command |
|------|----------------|
| Mock dashboard | [QUICKSTART → Validate locally](../QUICKSTART.md#validate-locally) |
| Dry-discover a fixture | [QUICKSTART → Validate locally](../QUICKSTART.md#validate-locally) |
| Full stack scan | [QUICKSTART → Live capabilities](../QUICKSTART.md#live-capabilities) |
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
