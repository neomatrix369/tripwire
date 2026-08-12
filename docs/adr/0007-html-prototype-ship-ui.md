# ADR-0007: HTML prototype dashboard as Horizon A ship UI

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** frontend, dashboard, prototype

## Context

A Data Commons HTML dashboard already existed under `prototypes/dc-dashboard/`
with heatmap, filters, and item drawers. Horizon A needed a filmable Detection
+ Sandbox review surface in hours, not a productized SPA. A frontend redesign
would have consumed the same clock as Live path evidence.

`prototypes/README.md` still says the folder is “not the shipped product UI”;
planning overrode that for Horizon A: the prototype **is** the ship UI.

## Decision

Ship **`prototypes/dc-dashboard` as-is**.

- Static HTML (`Tripwire.dc.html`) + JS modules. No React/Vue rewrite, no
  `/frontend-advisor` pass.
- Live client loads `@supabase/supabase-js` from an ESM CDN so the HTML
  prototype needs no bundler for Realtime.
- Local preview: `node scripts/serve-dashboard.mjs` (binds 127.0.0.1, can
  proxy REST so `service_role` never enters the browser).
- Direct browser → Supabase needs `SUPABASE_ANON_KEY` synced into
  `tripwire-dashboard.config.js` (gitignored).
- Dashboard remains **outside** governed coverage and complexity thresholds;
  normal tests stay mandatory. Live ACL four files are coverage-gated
  ([ADR-0013](./0013-ship-path-quality-gates.md)).

## Consequences

- Path name `prototypes/` is misleading; STATUS and ARCHITECTURE call it the
  Horizon A ship UI. A later product UI would be a new ADR.
- CDN + static HTML is easy to serve and brittle offline; tests inject
  `loadCreateClient` so unit tests do not hit the network.
- UX debt (Guard-tab dropdown, Deep Ops aesthetic) is accepted until a
  dedicated frontend wave.

## Alternatives considered

### A. New SPA (React/Next) as ship UI

Rejected: stack freeze; skip frontend-advisor
([docs/plan/interview_summary.md](../plan/interview_summary.md)).

### B. CLI-only review (no dashboard)

Rejected: the product review step is the heatmap + finding drawers.

## References

- [docs/plan/DECISIONS.md](../plan/DECISIONS.md) frontend skip (2026-08-01)
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) §2
- `scripts/serve-dashboard.mjs`
