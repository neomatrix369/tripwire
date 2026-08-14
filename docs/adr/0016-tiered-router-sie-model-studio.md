# ADR-0016: Tiered post-scan router via SIE and Model Studio

- **Status:** Accepted
- **Date:** 2026-08-14
- **Deciders:** Tripwire maintainers
- **Tags:** cli, routing, sie, model-studio, findings

## Context

Multi-scanner runs can disagree, time out, or leave coverage gaps. Operators need
a post-scan signal that is separate from raw scanner findings. Sample CLIs under
`prototypes/model-studio/` and `prototypes/sie-studio/` already talk to Alibaba
Cloud Model Studio and Superlinked SIE; the product path needed a reachable
orchestration entry point, not only standalone prototypes.

## Decision

After a completed scan batch, Tripwire runs a **tiered router**:

1. Call Superlinked SIE (required) to triage each item.
2. Optionally escalate to Model Studio when SIE signals conflict, unusual status,
   or low confidence.
3. Persist one `findings` row per item with `scanner_source = tiered_router`
   (`routing_review` / `routing_decision` / `routing_triage`). Replace that
   item's prior router row only after a successful SIE decision — never
   batch-delete first, so a SIE outage cannot wipe existing dashboard strips
   (`Scan → SIE → ■` / Model Studio).
4. Exclude `tiered_router` rows from severity rollup so router output does not
   inflate red/amber counts from scanners.

Production entry points: `tripwire route --batch-id …` and auto-route at the end
of `tripwire scan` (`cli/src/orchestrator.js` → `cli/src/router.js`). Missing
router credentials warn and skip; they do not fail the scan.

Sample CLIs remain prototypes; the router is the integrated product path.

## Consequences

- Operators need optional SIE + Model Studio keys in `.env` for routing (see
  [env-vars.md](../user-guide/env-vars.md)).
- Dashboard surfaces router strips (`Scan → ■` when SIE was not called,
  `Scan → SIE → ■` when SIE-only, Model Studio when escalated) and SIE-only /
  escalated filters.
- Router unit tests cover SIE-skip strip preservation and non-escalation
  `routing_review` writes (`cli/test/router.test.js`).

## Alternatives considered

- Leave routing in prototypes only — rejected; no production path for operators.
- Always call Model Studio — rejected; cost and latency; escalate only on signal.
- Fold router severity into rollup — rejected; would mix scanner risk with triage.
