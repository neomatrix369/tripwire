# ADR-0006: Live vs Mock strangler ACL

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** dashboard, acl, strangler, live, mock

## Context

The dashboard existed as a prototype fed by static mock data
(`tripwire-data.js`) before Live Supabase writes were reliable. Rewriting the
UI against PostgREST shapes would block shipping Detection + Sandbox. Operators
also need a no-account preview that must not be mistaken for a scan result.

Horizon A planning locked a strangler: keep the mock-shaped UI, introduce an
anti-corruption layer for Live, and use an explicit kill switch.

## Decision

Keep one dashboard document and two data sources.

- **ACL:** `prototypes/dc-dashboard/tripwire-live.js` fetches
  `items` / `scan_runs` / `scan_run_scanners` / `findings` and reshapes them
  into the mock item structure.
- **Kill switch:** data-source dropdown (Live vs Mock), persisted in
  `sessionStorage`, default **Live**.
- Live with missing URL/anon key or a failed fetch falls back to mock data
  with an honest status chip (`Missing API key`, `Connection error`,
  `Live · empty`). Empty successful responses stay on Live.
- Mock is preview only; it does not replace Live setup or produce a scan.

Shadow traffic and cut-over to a second UI are **N/A** for Horizon A.

## Consequences

- UI components stay coupled to the mock schema; schema changes require ACL
  mapping updates and Live ACL tests (coverage gated on the four ACL modules).
- `support.js` stays out of the coverage bar (glue around the prototype).
- Operators can evaluate the UI without accounts; onboarding must say Mock is
  not a scan result.

## Alternatives considered

### A. Rewrite the dashboard against PostgREST types

Rejected for Horizon A: stack freeze — ship `dc-dashboard` as-is
([ADR-0007](./0007-html-prototype-ship-ui.md)).

### B. Two separate apps (demo vs live)

Rejected: doubles UX drift; the dropdown is the explicit seam.

## References

- [docs/plan/DECISIONS.md](../plan/DECISIONS.md) Strangler+ACL (2026-08-01)
- [prototypes/README.md](../../prototypes/README.md)
- `prototypes/dc-dashboard/tripwire-live.js`
