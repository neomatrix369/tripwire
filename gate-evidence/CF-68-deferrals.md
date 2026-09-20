# CF deferrals from Gate 4 (slice 68) — shape only

| ID | Finding | Existing target slice | Required end action |
|----|---------|----------------------|---------------------|
| CF-68-1 | Client-only triage persistence (localStorage) is not durable across devices | Slice 69 (Fix propose / operator controls) | Server-backed triage decision store + sync |
| CF-68-2 | Batch autosave of triage overrides | Slice 69 | Batch save on step transition / dirty timer |
| CF-68-3 | Realtime reconnect/backoff hardening | Out of 68; existing realtime module | Improve tripwire-realtime.js in dedicated reliability slice if needed |

Slice 68 GWT-68.6 explicitly: "full controls may complete with 69".
