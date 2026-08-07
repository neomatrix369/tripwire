# Slice 22: Dashboard Realtime Recovery

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

The Live indicator reflects actual subscription state, and the dashboard safely falls back to polling until a later realtime subscription succeeds.

## GWT acceptance specification

1. **The Live indicator turns off when the service reports an error** `@contract-shape:bounded-change`
   - Given a connected Live dashboard loses event delivery through an error, when the error is reported, then the Live indicator shows unavailable and running work continues to refresh through fallback polling.
2. **The Live indicator turns off when the subscription times out** `@contract-shape:bounded-change`
   - Given a connected Live dashboard receives no timely subscription response, when it times out, then the Live indicator shows unavailable and running work continues to refresh through fallback polling.
3. **The Live indicator turns off when the channel closes** `@contract-shape:bounded-change`
   - Given a connected Live dashboard has its event channel closed, when it closes, then the Live indicator shows unavailable and running work continues to refresh through fallback polling.
4. **The Live indicator returns when realtime recovers** `@contract-shape:bounded-change`
   - Given Live updates recover after an interruption, when delivery resumes, then the Live indicator shows available and the dashboard returns to its normal refresh policy.
5. **Dashboard loading recovers if no subscription confirmation arrives** `@contract-shape:bounded-change`
   - Given the dashboard cannot confirm Live updates during initialization, when the confirmation deadline passes, then it presents an unavailable indicator and continues to refresh running work through one fallback policy.
6. **Replacing a pending subscription does not leave stale work behind** `@contract-shape:bounded-change`
   - Given an operator changes Live data context while connection is pending, when the dashboard reconnects, then the newest connection alone controls the displayed availability and fallback refresh.
7. **A removed channel cannot mislead the dashboard** `@contract-shape:bounded-change`
   - Given the dashboard has replaced an older Live connection, when a late event arrives from the old connection, then the operator sees no change to the current availability or refresh behavior.

## Design / test treatment

- Extract an importable `tripwire-live-controller.js` from the embedded component with an injected clock, interval port, loader, and realtime channel port. Its public API is `start({mode,data,config})`, `onRealtimeStatus(token,status)`, `replaceSubscription()`, and `dispose()`; it owns one active-channel token and one poll timer.
- Track explicit subscription state in `tripwire-realtime.js`; `connected()` is true only for `SUBSCRIBED`. A subscribe operation has a 10-second callback deadline and notifications include the active channel token so stale callbacks are ignored.
- Make `Tripwire.dc.html` a thin adapter to the controller. The controller starts an 8-second fallback only for Live data with running work and non-`SUBSCRIBED` state; on `SUBSCRIBED` it cancels that fallback and retains the existing 30-second running-item safeguard only.
- New acceptance tests carry `CONTRACT_SHAPE: bounded-change` and `Outcome anchor: Live dashboard status remains honest during connection loss` in their docstrings.

| Expected observable state | Error / timeout / close | Recovery | Pending replacement | Late obsolete event |
|---|---|---|---|---|
| Live indicator | unavailable | available | unavailable until confirmation | unchanged |
| poll timer | one 8-second fallback | fallback stopped or 30-second running safeguard | one fallback | unchanged |
| active channel | removed | current only | replacement only | current only |

**Test inventory (≤8 acceptance tests):** error; timeout; close; recovery; no callback; pending unsubscribe; late stale callback; running-item 30-second safeguard.

## Before-Checks [GATE]

- [ ] `(cd prototypes/dc-dashboard && npm run test:coverage)` output is recorded in `docs/plan/gate-evidence/slice-22.json`
- [ ] `rg -n "_startPollFallback|30000|8000" prototypes/dc-dashboard/Tripwire.dc.html` output is recorded in evidence

## TDD execution

RED: add each failure status, recovery, pending-unsubscribe, no-callback, replacement, and late-obsolete-event scenario.
GREEN: add the minimum explicit state/notification seam.
REFACTOR: ensure repeated subscribe removes the obsolete channel before registering the replacement.

## After-Checks [GATE]

- [ ] Each of error, timeout, close, recovery, repeated subscribe, unsubscribe-during-pending, no-callback recovery, and late obsolete events is tested independently
- [ ] Live status and polling fallback are driven by explicit subscription state, not channel object presence
- [ ] `(cd prototypes/dc-dashboard && npm test && npm run lint)` and `./scripts/quality-gates.sh` pass
- [ ] Coverage/complexity policy: dashboard remains **excluded** from governed thresholds; normal tests remain mandatory
- [ ] Complexity evidence: **reporting only** for prototype dashboard; `cd prototypes/dc-dashboard && npx eslint -c eslint.complexity.config.js *.js` passes or its warnings are recorded verbatim in gate evidence, without changing excluded thresholds
- [ ] `docs/plan/gate-evidence/slice-22.json.review` records `acceptance: APPROVED` and `implementation: APPROVED`
- [ ] `docs/plan/gate-evidence/slice-22.json` records commands, test results, complexity report, reviewer verdicts, scope exclusion, and `PASS`
- [ ] `docs/plan/gate-evidence/slice-22.json.documentation_audit` records the updated Live-status path and `rg` result, or `N/A` with reason

## Gate Status

📋 PLANNED
