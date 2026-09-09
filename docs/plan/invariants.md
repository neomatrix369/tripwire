# Project Invariants
> Self-contained reference — key constraints extracted here. Links provided for traceability only.
> Created by plan-health-check on 2026-09-09 — populate remaining TODO bullets before execution where marked.

## Key constraints
- Brownfield Flow D; planning only → execution via `/nw-execute` / slice-workflow; public plan under `docs/plan/`.
- Coverage defaults (Horizon A): statement ≥90%, function ≥95%, branch ≥85%; ship-path floors may differ per DECISIONS.
- Live honesty: workstation Live path (local `.env`, CLI, QUICKSTART) remains supported until Monk Kit ships; do not claim deployable-via-Monk on main until ADR-0001 is Accepted **and** Kit is VERIFIED.
- Vendor tiers for packaged Live (ADR-0001 intent): Tier 1 Supabase+Modal (MVL); Tier 2 Snyk+Cisco+Tessl (full coverage); Tier 3 SIE + Alibaba Model Studio + Ossprey (env pass-through).
- Stack freeze for ship UI: Node CLI + Modal + Supabase + `prototypes/dc-dashboard` (redesign only via explicit slices).
→ Source: docs/plan/interview_summary.md § Constraints; docs/adr/0001-monk-deployment-and-packaging.md

## Architecture decisions (non-negotiable)
- Supabase is system of record (ADR-0004); Modal is isolated scanner execution SaaS (ADR-0003) — not an in-cluster workload.
- Monk Kit (ADR-0001) is **Proposed** packaging path: in-cluster bootstrap + dashboard + HTTPS ingress; SaaS for Supabase/Modal/scanners.
- Never commit secrets; Kit collects Tier 1–3 secrets via Monk — workstation `.env` path stays additive.
→ Source: docs/plan/DECISIONS.md; docs/adr/

## Tech stack & runtime
- Python (uv) + Node CLI; Modal sandboxes; Supabase/PostgREST; dashboard prototype HTML/JS.
- Model split (live override): Planning gpt-5.6-sol (high) · Execution gpt-5.6-terra (medium) — see TRAIL.md harness-scout note.
→ Source: docs/plan/TRAIL.md § Original Material

## Project rules
- Slice stub + branch before any product code; never commit directly to `main`.
- Gate evidence required at PASSED; health-check must not invent `gate_status: PASSED`.
- Decision ownership matrix: → `docs/plan/DECISION-OWNERSHIP.md` (fill if TBD).
→ Source: CLAUDE.md / AGENTS.md; ~/.claude/rules/decision-ownership

## Decision ownership
→ `docs/plan/DECISION-OWNERSHIP.md`

## Monk Kit (Wave O)
- Operator secrets and infra approvals go through Monk local dashboard (`127.0.0.1:7419`) — never agent chat ([Security](https://docs.monk.io/features/security), [Local Dashboard](https://docs.monk.io/getting-started/local-dashboard)).
- In-repo Kit uses Monk package patterns: compose + `inherits`, immutable `*-v1` + mutable `latest` track ([Package Ecosystem](https://docs.monk.io/features/service-templates)).
- MVL-complete (Tier 1) before full-coverage claims; Capsules/CI/CD are follow-ups after VERIFIED MVL.
→ Source: docs/adr/0001-monk-deployment-and-packaging.md; docs.monk.io
