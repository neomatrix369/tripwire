# Slice 22: Dashboard Realtime Recovery

> Scenario: Brownfield | MoSCoW: Must | Depends on: none

## Outcome

The Live indicator reflects actual subscription state, and the dashboard safely falls back to polling until a later realtime subscription succeeds.

## GWT acceptance specification

1. **The Live indicator turns off when the service reports an error** `@contract-shape:bounded-change`
   - Given a subscribed realtime channel, when fixture status `CHANNEL_ERROR` arrives, then `connected()` is false, the UI reports Live unavailable, and the 8-second fallback poll is active while work remains running.
2. **The Live indicator turns off when the subscription times out** `@contract-shape:bounded-change`
   - Given a subscribed realtime channel, when fixture status `TIMED_OUT` arrives, then `connected()` is false, the UI reports Live unavailable, and the 8-second fallback poll is active while work remains running.
3. **The Live indicator turns off when the channel closes** `@contract-shape:bounded-change`
   - Given a subscribed realtime channel, when fixture status `CLOSED` arrives, then `connected()` is false, the UI reports Live unavailable, and the 8-second fallback poll is active while work remains running.
4. **The Live indicator returns when realtime recovers** `@contract-shape:bounded-change`
   - Given a failed channel later emits `SUBSCRIBED`, when the subscription recovers, then the UI is notified, realtime becomes connected again, fallback polling stops unless the existing 30-second running-item safeguard applies, and no obsolete channel remains registered.
5. **Dashboard loading recovers if no subscription confirmation arrives** `@contract-shape:bounded-change`
   - Given a subscription callback never arrives, when the dashboard initializes, then it resolves into disconnected recovery within 10 seconds and schedules exactly one fallback poll when work is running.
6. **Replacing a pending subscription does not leave stale work behind** `@contract-shape:bounded-change`
   - Given an unsubscribe occurs while a subscription is pending, when the dashboard resubscribes, then only the active channel remains registered and exactly one fallback poll is scheduled when work is running.
7. **A removed channel cannot mislead the dashboard** `@contract-shape:bounded-change`
   - Given a replacement subscription is active, when the removed channel later emits any status, then it cannot change the current connection indicator or polling policy.

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

- [ ] Existing dashboard realtime test baseline recorded
- [ ] Existing polling fallback/running-item safeguard identified before change

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
- [ ] nWave acceptance and software-crafter reviewers approve the slice before implementation closes
- [ ] `docs/plan/gate-evidence/slice-22.json` records commands, test results, complexity report, reviewer verdicts, scope exclusion, and `PASS`
- [ ] Documentation audit: realtime status/recovery behavior reviewed and updated if public behavior changes

## Gate Status

📋 PLANNED
