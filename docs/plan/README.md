# Plan artifacts

Horizon A trackers and slice stubs. **Slice files live in wave folders** (execution order), not at this directory root.

| Wave | Folder | Group |
|-----:|--------|-------|
| 1 | [01-A-live-path-gwt/](01-A-live-path-gwt/) | Live path + GWT (1–4) |
| 2 | [02-B-characterization-evidence/](02-B-characterization-evidence/) | Characterization + evidence (6, 5) |
| 3 | [03-C-trust-coverage-audit/](03-C-trust-coverage-audit/) | Trust + coverage audit (7) |
| 4 | [04-D-operator-onboarding/](04-D-operator-onboarding/) | Operator onboarding (17) — **next** |
| 5 | [05-E-ship-path-coverage/](05-E-ship-path-coverage/) | Ship-path coverage (8–14) |
| 6 | [06-F-claim-audit/](06-F-claim-audit/) | Claim audit (15–16) |

| Tracker | Role |
|---------|------|
| [TRAIL.md](TRAIL.md) | Full slice index + execute priority |
| [PROGRESS.md](PROGRESS.md) | Status + open execution order |
| [DECISIONS.md](DECISIONS.md) | Planning decisions |
| [GATE_CONTRACT.md](GATE_CONTRACT.md) | Before/After close rule |
| [coverage-audit.md](coverage-audit.md) | Ship-path coverage matrix (slice 7) |
| [gate-evidence/](gate-evidence/) | Per-slice evidence JSON |

Do not recreate `docs/plan/slice-N-*.md` at the plan root — use the wave folder for that slice.
