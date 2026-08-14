# Coverage audit matrix (slice 7)

> Last updated: 2026-08-14 · Horizon A · Ship-path target ~95% (DECIDED);
> CLI enforced floors temporarily 60/60/80/60 while `router.js` lacks unit tests
> Context: private references SoT + public STATUS/ARCHITECTURE

## Altitude / targets

| Layer | Target | Status |
|-------|--------|--------|
| Python `sandbox/` (ship path; omit `guard/`) | ≥95% branch when gated | ✅ gate achieved — slice 11 (`95.91%`, fail_under=95; branch/lines/statements aligned to gate policy) |
| Full Node CLI (`cli/src` + `cli/bin/tripwire.js`) | ≥95% lines/stmts, with 100% funcs and 85% branches where justified (**DECIDED** / ADR-0013) | ✅ historically achieved (`98.60%` lines); **current enforced** floors are **60/60/80/60** until `cli/src/router.js` has unit tests |
| Prototype dashboard (`prototypes/dc-dashboard`) | Normal tests run; excluded from coverage and complexity gates | Excluded by scope decision |
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
| Tiered SIE / Model Studio router | IMPLEMENTED | missing unit (`router.js`) | `tripwire route` + auto-route; ADR-0016; soft-fail if keys absent |
| Live dashboard Realtime + poll | IMPLEMENTED / VERIFIED (unit) | unit | Poll: 8s fallback **and** 30s while Realtime+running — STATUS under-claims → slice 16 📦 (reinstate) or note in 15 |
| Normal-user dashboard path | IMPLEMENTED | unit | Default source is **Live**; select Mock for local demo → slice **17** (onboarding); prose remediations were 16 📦 |
| Dashboard as ship UI | DECIDED (dc-dashboard as-is) | — | prototypes README “not shipped” tension → slice 16 📦 / claim audit 15 |
| Guard PreToolUse | Future / Won't for A | missing | ARCHITECTURE Future (Gate A); exclude from coverage bar |
| Overmind Phase 5 / Ossprey | Won't / unwired | n/a | Badges stripped Gate A |
| Coverage floors documented | DECIDED | docs | CONTRIBUTING + STATUS; raise in 11–13 |

## Acceptance catalog (current governed path)

The scenarios below are executable, human-readable checks for the currently governed CLI and sandbox path. They are deliberately maintained with the code, not copied from private planning references.

| Requirement | Executable scenario | Level | Status |
|-------------|---------------------|-------|--------|
| A schema probe must never certify an unavailable database | Given `completed_at` probe returns an auth/network error, when preflight runs, then it aborts rather than reporting schema ready | CLI acceptance | Verified |
| User input cannot create an empty successful scan | Given invalid concurrency or malformed target JSON, when `tripwire scan` starts, then it exits nonzero before discovery/persistence | CLI process acceptance | Verified |
| Multi-target dispatch is observable | Given two discovered targets, when a batch is dispatched, then one batch stores its count/concurrency and reports its batch/run IDs | CLI persistence contract | Verified |
| A per-target dispatch failure is not hidden | Given one sandbox dispatch fails, when scan orchestration completes, then its run is marked failed, the item rolls up, failed target detail is output, and the CLI exits nonzero | CLI orchestration acceptance | Verified |
| Scanner output must contain usable evidence | Given Cisco Skill, Cisco MCP, or Tessl returns a zero-exit malformed/empty payload, when results are mapped, then that scanner is unreachable rather than clean | Sandbox adapter acceptance | Verified |
| Partial Snyk results are not clean | Given one Snyk path succeeds and another errors, when results are mapped, then findings persist but the scanner is unreachable so the roll-up is partial-failed | Sandbox adapter acceptance | Verified |
| Local input remains bounded to the sandbox | Given a path-traversal archive, when the sandbox extracts it, then extraction fails and nothing is written outside the workdir | Sandbox safety acceptance | Verified |
| Local source reaches the real remote boundary | Given a packable local target, when the host Modal entrypoint runs, then `scan_item.remote` receives the archive and item/run identity | Sandbox wiring acceptance | Verified |

Deferred, future-tracked work: full drift/trend/diff behavior and Guard enforcement. Prototype dashboard behavior remains outside coverage and complexity metrics; it still has its normal test suite.

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
| Trust strip + this matrix | **7** | [slices/03-C-trust-coverage-audit/](slices/03-C-trust-coverage-audit/) | Must ✅ |
| Onboarding (prereqs/env) | **17** | [slices/04-D-operator-onboarding/](slices/04-D-operator-onboarding/) | Must |
| Cisco skill parse fixtures | **8** | [slices/05-E-ship-path-coverage/](slices/05-E-ship-path-coverage/) | Must |
| Snyk/Tessl parse fixtures | 9/11 | same | Should |
| `scan_item_inner` characterization | 10/11 | same | Should |
| Raise floors ≥95% (py / cli / Live ACL) | **11–13** | same | Must |
| STATUS sync after uplift | 14 | same | Must |
| Full claim-audit canvas + Live 3B | 15 | [slices/06-F-claim-audit/](slices/06-F-claim-audit/) | Must |
| Realtime/demo/prototype prose | 16 | same | Won't (A) 📦 |
| VO/Remotion demo video | 4 | [slices/01-A-live-path-gwt/](slices/01-A-live-path-gwt/) | Won't (A) 📦 |

Folder map: [README.md](README.md). Critical path after 7 ✅: **8 → 11 → 12 → 13 → 14 → 15**.
