# Plan artifacts

Horizon A trackers and slice stubs. **Slice files live in wave folders** (execution order), not at this directory root.

| Wave | Folder | Group |
|-----:|--------|-------|
| 1 | [slices/01-A-live-path-gwt/](slices/01-A-live-path-gwt/) | Live path + GWT (1–4) |
| 2 | [slices/02-B-characterization-evidence/](slices/02-B-characterization-evidence/) | Characterization + evidence (6, 5) |
| 3 | [slices/03-C-trust-coverage-audit/](slices/03-C-trust-coverage-audit/) | Trust + coverage audit (7) |
| 4 | [slices/04-D-operator-onboarding/](slices/04-D-operator-onboarding/) | Role-based onboarding (17) — ✅ |
| 5 | [slices/05-E-ship-path-coverage/](slices/05-E-ship-path-coverage/) | Ship-path coverage (8–14) — **next** |
| 6 | [slices/06-F-claim-audit/](slices/06-F-claim-audit/) | Claim audit (15–16) |

| Tracker | Role |
|---------|------|
| [EMOJI_LEGEND.md](EMOJI_LEGEND.md) | Canonical meaning of status emojis used by tracker docs |
| [TRAIL.md](TRAIL.md) | Full slice index + execute priority |
| [PROGRESS.md](PROGRESS.md) | Status + open execution order |
| [DECISIONS.md](DECISIONS.md) | Planning decisions |
| [GATE_CONTRACT.md](GATE_CONTRACT.md) | Before/After close rule |
| [coverage-audit.md](coverage-audit.md) | Ship-path coverage matrix (slice 7) |
| [gate-evidence/](gate-evidence/) | Per-slice evidence JSON |

Do not recreate `docs/plan/slice-N-*.md` at the plan root — use the wave folder for that slice.
