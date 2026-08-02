# Coverage audit matrix (slice 7)

> Last updated: 2026-08-02 · Horizon A · Ship-path target ~95% (DECIDED)
> Context: `internal-docs/00_build/*` SoT + public STATUS/ARCHITECTURE

## Altitude / targets

| Layer | Target | Status |
|-------|--------|--------|
| Python `sandbox/` (ship path; omit `guard/`) | ≥95% branch when gated | DECIDED — floor today 45% (~47% measured) |
| Node `cli/src` | ≥95% when gated | DECIDED — no gate yet |
| Live ACL JS (`tripwire-live/status/realtime/data`) | ≥95% when gated | DECIDED — no gate yet |
| `guard/`, `support.js`, Remotion, scripts | Out of bar | Won't for this wave |
| Live Modal/Supabase E2E as CI Must | Won't | optional skip-without-config |

## Ship-path / Done-when / demo matrix

| Capability | Evidence label | AT / unit / missing | Notes |
|------------|----------------|---------------------|-------|
| Discover skills/MCP + dry-discover | IMPLEMENTED / VERIFIED (unit) | unit (`cli/test`) | AT: GWT-1 path via dashboard tests |
| Schema bootstrap `tripwire setup` | IMPLEMENTED / VERIFIED (unit) | unit | Operator VERIFIED caveats on Direct DB |
| Modal scan + findings write | IMPLEMENTED / VERIFIED (operator) | AT partial + unit acquire | Slices 8–10 fill parse/`scan_item_inner` |
| Cisco skill/MCP adapters | IMPLEMENTED | unit status/cmd; **parse missing** | Slice 8 |
| Snyk / Tessl adapters | IMPLEMENTED (may be unreachable) | unit status; **parse missing** | Slice 9 |
| Idempotency / `--force` spawn | IMPLEMENTED / VERIFIED (unit) | unit (slice 6) | — |
| Live dashboard Realtime + poll | IMPLEMENTED / VERIFIED (unit) | unit | Poll: 8s fallback **and** 30s while Realtime+running — STATUS under-claims → slice 16 |
| Mock / Demo path | IMPLEMENTED | unit | Default source is **Live**; QUICKSTART must select Mock → slice 16 |
| Dashboard as ship UI | DECIDED (dc-dashboard as-is) | — | prototypes README “not shipped” tension → slice 16 |
| Guard PreToolUse | Future / Won't for A | missing | ARCHITECTURE Future (Gate A); exclude from coverage bar |
| Overmind Phase 5 / Ossprey | Won't / unwired | n/a | Badges stripped Gate A |
| Coverage floors documented | DECIDED | docs | CONTRIBUTING + STATUS; raise in 11–13 |

## Internal ↔ public parity deltas

| Topic | SoT / code | Public | Action |
|-------|------------|--------|--------|
| Phase 4/5 | Won't for A (PROGRESS/TRAIL) | Badges claimed partners | **Gate A done** — badges removed |
| Guard | Stub + Phase 4 | Was in C4 L2 | **Gate A done** — Future section |
| Branch for coverage wave | merged PR #25 | STATUS said `plan/coverage-slices-7-14` | **Gate A done** — per-slice branches |
| Nightly mutmut/Chalk | `\|\| true` | Listed as Nightly checks | **Gate A done** — non-gating note |
| Adapter JSON field names | RESEARCH | RESEARCH in STATUS | Slices 8–9 + research sync |
| Realtime poll timing | 8s + 30s paths | “~1s + 8s” only | Slice 16 |
| Demo default | `live` default | Demo path implies Mock | Slice 16 |

## Slice ownership (after this audit)

| Work | Slice | MoSCoW |
|------|-------|--------|
| Trust strip + this matrix | **7** | Must |
| Cisco skill parse fixtures | **8** | Must |
| Snyk/Tessl parse fixtures | 9 | Should |
| `scan_item_inner` characterization | 10 | Should |
| Raise floors ≥95% (py / cli / Live ACL) | **11–13** | Must |
| STATUS sync after uplift | 14 | Should |
| Full claim-audit canvas + Live 3B | 15 | Should |
| Realtime/demo/prototype prose | 16 | Could |
| VO/Remotion demo video | 4 | Could (blocked) |
