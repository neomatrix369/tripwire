# Plan artifacts

Horizon A trackers and slice stubs. **Slice files live in wave folders** (execution order), not at this directory root.

| Wave | Folder | Group |
|-----:|--------|-------|
| 1 | [slices/01-A-live-path-gwt/](slices/01-A-live-path-gwt/) | Live path + GWT (1–4) |
| 2 | [slices/02-B-characterization-evidence/](slices/02-B-characterization-evidence/) | Characterization + evidence (6, 5) |
| 3 | [slices/03-C-trust-coverage-audit/](slices/03-C-trust-coverage-audit/) | Trust + coverage audit (7) |
| 4 | [slices/04-D-operator-onboarding/](slices/04-D-operator-onboarding/) | Role-based onboarding (17) — ✅ |
| 5 | [slices/05-E-ship-path-coverage/](slices/05-E-ship-path-coverage/) | Ship-path coverage (8–14) — ✅ |
| 6 | [slices/06-F-claim-audit/](slices/06-F-claim-audit/) | Claim audit (15–16) |
| 7 | [slices/07-G-atdd-closure/](slices/07-G-atdd-closure/) | ATDD closure (18–22) — 📋 planned |
| 8 | [slices/08-H-frontline-agent-hooks/](slices/08-H-frontline-agent-hooks/) | Frontline agent hooks (23–39) — 📋 plan-only |
| 9 | [slices/09-I-landing-intro-restyle/](slices/09-I-landing-intro-restyle/) | Landing intro + visual refresh (41, 43) — ✅ |
| 10 | [slices/10-J-dashboard-data-quality/](slices/10-J-dashboard-data-quality/) | Dashboard data quality fixes (42) — ✅ |
| 11 | [slices/11-K-docs-ux-plain-language/](slices/11-K-docs-ux-plain-language/) | Docs UX plain language + compaction (44) — 🔀 |
| 12 | [slices/12-L-tessl-5-row-expansion/](slices/12-L-tessl-5-row-expansion/) | Tessl 5-row expansion (45–52) — 45–50 ✅ · 51 🔀 · 52 📋 · design: [tessl-5-row-expansion.md](../design/tessl-5-row-expansion.md) |
| 13 | [slices/13-M-llm-usage-tracking/](slices/13-M-llm-usage-tracking/) | **M — LLM usage / cost observability** (53) — 📋 plan-only · ADR-0016 follow-on · **not** J/L/G · design: [llm-usage-tracking.md](../design/llm-usage-tracking.md) |

| Tracker | Role |
|---------|------|
| [EMOJI_LEGEND.md](EMOJI_LEGEND.md) | Canonical meaning of status emojis used by tracker docs |
| [TRAIL.md](TRAIL.md) | Full slice index + execute priority |
| [PROGRESS.md](PROGRESS.md) | Status + open execution order |
| [DECISIONS.md](DECISIONS.md) | Planning decisions (slice waivers, priority) |
| [../adr/README.md](../adr/README.md) | Formal ADRs (runtime/topology/security) |
| [GATE_CONTRACT.md](GATE_CONTRACT.md) | Before/After close rule |
| [coverage-audit.md](coverage-audit.md) | Ship-path coverage matrix (slice 7) |
| [gate-evidence/](gate-evidence/) | Per-slice evidence JSON |

Do not recreate `docs/plan/slice-N-*.md` at the plan root — use the wave folder for that slice.
