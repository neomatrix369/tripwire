# Coverage audit matrix (slice 7)

> Last updated: 2026-08-03 · Horizon A · Ship-path target ~95% (DECIDED)
> Context: `internal-docs/00_build/*` SoT + public STATUS/ARCHITECTURE

## Altitude / targets

| Layer | Target | Status |
|-------|--------|--------|
| Python `sandbox/` (ship path; omit `guard/`) | ≥95% branch when gated | ✅ gate achieved — slice 11 (`95.91%`, fail_under=95; branch/lines/statements aligned to gate policy) |
| Node `cli/src` | ≥95% lines/stmts, with 100% funcs and 85% branches where justified | ✅ gate achieved — slice 12 (`99.75%` lines, `100%` funcs, `85%` branches) |
| Live ACL JS (`tripwire-live/status/realtime/data`) | ≥95% lines, with residual funcs/branches justified | ✅ gate achieved — slice 13 (`98.48%` lines, `85%` funcs, `80%` branches) |
| `guard/`, `support.js`, Remotion, scripts | Out of bar | Won't for this wave |
| Live Modal/Supabase E2E as CI Must | Won't | optional skip-without-config |

## Ship-path / Done-when / demo matrix

| Capability | Evidence label | AT / unit / missing | Notes |
|------------|----------------|---------------------|-------|
| Discover skills/MCP + dry-discover | IMPLEMENTED / VERIFIED (unit) | unit (`cli/test`) | AT: GWT-1 path via dashboard tests |
| Schema bootstrap `tripwire setup` | IMPLEMENTED / VERIFIED (unit) | unit | Security expert verified caveats on Direct DB |
| Modal scan + findings write | IMPLEMENTED / VERIFIED (security experts) | AT partial + unit acquire | Slices 8–10 fill parse/`scan_item_inner` |
| Cisco skill/MCP adapters | IMPLEMENTED | unit status/cmd; **parse missing** | Slice 8 |
| Snyk / Tessl adapters | IMPLEMENTED (may be unreachable) | unit status; parse/coverage folded into slice 11 stream | Slice 9/11 |
| Idempotency / `--force` spawn | IMPLEMENTED / VERIFIED (unit) | unit (slice 6) | — |
| Live dashboard Realtime + poll | IMPLEMENTED / VERIFIED (unit) | unit | Poll: 8s fallback **and** 30s while Realtime+running — STATUS under-claims → slice 16 📦 (reinstate) or note in 15 |
| Normal-user dashboard path | IMPLEMENTED | unit | Default source is **Live**; select Mock for local demo → slice **17** (onboarding); prose remediations were 16 📦 |
| Dashboard as ship UI | DECIDED (dc-dashboard as-is) | — | prototypes README “not shipped” tension → slice 16 📦 / claim audit 15 |
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
| Realtime poll timing | 8s + 30s paths | “~1s + 8s” only | Slice 16 📦 / audit 15 |
| Default UI source | `live` default | Normal users should select Mock for local baseline path | Slice **17** + 16 📦 |

## Slice ownership (after this audit)

| Work | Slice | Spec path | MoSCoW |
|------|-------|-----------|--------|
| Trust strip + this matrix | **7** | [03-C-trust-coverage-audit/](03-C-trust-coverage-audit/) | Must ✅ |
| Onboarding (prereqs/env) | **17** | [04-D-operator-onboarding/](04-D-operator-onboarding/) | Must |
| Cisco skill parse fixtures | **8** | [05-E-ship-path-coverage/](05-E-ship-path-coverage/) | Must |
| Snyk/Tessl parse fixtures | 9/11 | same | Should |
| `scan_item_inner` characterization | 10/11 | same | Should |
| Raise floors ≥95% (py / cli / Live ACL) | **11–13** | same | Must |
| STATUS sync after uplift | 14 | same | Must |
| Full claim-audit canvas + Live 3B | 15 | [06-F-claim-audit/](06-F-claim-audit/) | Must |
| Realtime/demo/prototype prose | 16 | same | Won't (A) 📦 |
| VO/Remotion demo video | 4 | [01-A-live-path-gwt/](01-A-live-path-gwt/) | Won't (A) 📦 |

Folder map: [README.md](README.md). Critical path after 7 ✅: **8 → 11 → 12 → 13 → 14 → 15**.
