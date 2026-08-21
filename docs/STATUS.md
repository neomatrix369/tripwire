# Capability status

Evidence-labelled claims for Tripwire.

Start here: [QUICKSTART](../QUICKSTART.md) · Hub: [docs/README](./README.md) · Repo: [README.md](../README.md)

### Evidence-state legend

| Label | Meaning |
|---|---|
| **RESEARCH** | Investigated; no delivery commitment |
| **PROPOSED** | Candidate awaiting approval |
| **DECIDED** | Approved direction; may not exist in code yet |
| **IMPLEMENTED** | Reachable through a production entry point or config |
| **VERIFIED** | Observed with a dated command, test, probe, or runtime result |
| **SUPERSEDED** | Replaced by newer evidence or decision |

RESEARCH · PROPOSED · DECIDED · IMPLEMENTED · VERIFIED · SUPERSEDED.

[![Cursor](https://img.shields.io/badge/Cursor-000000?style=flat)](https://cursor.com)
[![Modal](https://img.shields.io/badge/Modal-7C5CFF?style=flat)](https://modal.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)

[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Superlinked SIE](https://img.shields.io/badge/Superlinked%20SIE-0B1F3A?style=flat)](https://superlinked.com)
[![Alibaba Cloud Model Studio](https://img.shields.io/badge/Alibaba%20Cloud%20Model%20Studio-FF6A00?style=flat)](https://www.alibabacloud.com/product/modelstudio)

---

## IMPLEMENTED

Reachable through production entry points / config:

- Full schema + rollup function + anon SELECT policies/GRANTs + Realtime
  publication on `scan_runs` / `scan_run_scanners` / `findings` — `db/schema.sql`,
  applied via `tripwire setup` / `cli/src/ensureSchema.js`
- `scan_run_scanners` incremental writes from Modal (`running` placeholders,
  `console_output`, `started_at`/`completed_at`; PGRST204-safe fallback when
  columns missing) — `sandbox/`
- CLI discovery / hashing / idempotency / batching — `cli/` (`tripwire scan`)
- `tripwire setup` / first-scan schema bootstrap (probes `completed_at` column) —
  `cli/src/ensureSchema.js`
- `./scripts/setup-modal.sh` secret sync + deploy
- Scanner adapters shell out to upstream CLIs (`skill-scanner`, `mcp-scanner`,
  `snyk-agent-scan`, `tessl`) with real flags and parse documented output shapes —
  `sandbox/scanners.py`
- DepShield dependency-audit adapter (`depshield-mcp` over MCP stdio;
  npm + PyPI via OSV.dev; zero credentials — nothing synced to
  `tripwire-scan-secrets`; runs for both item types, appended last in the
  `SCANNER_GROUPS` registry) — `sandbox/scanners.py`, unit-tested in
  `sandbox/tests/`. IMPLEMENTED only: no live-Modal run recorded yet, so no
  VERIFIED (operator) claim — see
  [scanner-output-adapters.md](./research/adapters/scanner-output-adapters.md) §7
- Fixture set under `fixtures/` — see [fixtures/README.md](../fixtures/README.md)
- `_acquire_target` dispatch (git clone, local copy, host→sandbox tar upload via
  `local_entrypoint`, MCP introspection-only empty workdir) — `sandbox/`
- Dashboard Live/Mock with Supabase Realtime (~1s) + 8s poll fallback, SCANNING
  in-flight UI, scanner console in drawer, partial-failed “n out of m scanners
  unreachable” copy — `prototypes/dc-dashboard/`;
  `scripts/serve-dashboard.mjs` / `scripts/sync-dashboard-config.sh`
- Dashboard visual identity v2 (FolderGate cream/tan × Tripwire HUD): paper
  `#F5F2EA`, tan CTA `#C4A574`, Fraunces on intro `h1`/`h2`, AA ink tokens,
  cyan as live signal only; partial-scan / Guard banners use violet/status ink
  (not dark-theme pastels) — `prototypes/dc-dashboard/Tripwire.dc.html`,
  `tripwire-status.js` (slice 43 ✅, [PR #96](https://github.com/neomatrix369/tripwire/pull/96);
  alert-ink pile-on on slice 42 branch). Screenshot gallery regenerated 2026-08-20
- Landing intro screen (threat stats, SEC/01–05 sections, sessionStorage
  `tripwire-intro-dismissed`, About toggle) — `prototypes/dc-dashboard/Tripwire.dc.html`
  (slice 41 ✅)
- Tessl `quality_score` (0–100 skill-review) persisted on `items`, mapped by Live
  to `item.quality` / Tessl `output.quality_score`, and surfaced on skill cards as
  compact `Q N` / `Q —` / `Q ?` badges with fixed `#score-tip-portal` hover/focus
  tips + schedule cues — `sandbox/scanners.py`, `tripwire-live.js`,
  `tripwire-status.js`, `Tripwire.dc.html` (slice 42 A9–A13 ✅,
  [PR #98](https://github.com/neomatrix369/tripwire/pull/98))
- `risk_score` weighted finding density from `tripwire_rollup_item`; cards show
  compact `R N.NN` badges with density-formula portal tips (list header **Risk density**);
  card colour remains worst-of `heatmap_status`, not density (slice 42 A11/A13)
- Tiered post-scan router (SIE triage + optional Model Studio escalation) —
  `tripwire route`, auto-route after `tripwire scan`
  (`cli/src/router.js`, `cli/src/orchestrator.js`); dashboard router strip +
  SIE-only / escalated filters — `prototypes/dc-dashboard/`; sample CLIs —
  `prototypes/sie-studio/`, `prototypes/model-studio/` ([ADR-0016](./adr/0016-tiered-router-sie-model-studio.md))

---

## VERIFIED (unit)

- `cd cli && npm test` — discovery, content-hash, schema-probe (incl. `completed_at`),
  `--force`, tiered router (`cli/test/router.test.js`)
- `pytest sandbox/tests/test_acquire_target.py` — acquire-target dispatch
- `cd prototypes/dc-dashboard && npm test` — Live gating, Realtime wiring,
  SCANNING/console/unreachable mapping; optional Live smoke skipped without config

---

## VERIFIED (operator, 2026-08-01)

- Modal secrets + `tripwire-scan` deploy with `scanners` packaged
  (`add_local_python_source(..., copy=True)`)
- Host tar packing (`modal run sandbox/scan_app.py` → `[acquire] packed …`)
  delivers fixture `SKILL.md` to scanners — Cisco completed with findings
  (incl. red prompt_injection); Tessl/Snyk may still be unreachable
  (Node≥20 / `uvx` cold-install)
- Live dashboard reads items when anon key synced (or via local proxy)
- Live `tripwire setup` against Direct `db.*` host was **not** verified here
  (`ENOTFOUND`); use Session pooler URI when needed

---

## VERIFIED (coverage gates) · ON BRANCH (documentation sync)

Ship-path coverage uplift (~95% instrumented on `cli/src`, `sandbox/`, Live ACL JS;
omit `guard/` and `support.js`) is verified: slice 11 ✅, 12 ✅, 13 ✅ (CLI and
live bars from `plan/gate-evidence/slice-12.json` / `slice-13.json`; slice 11
status via `slice-11` evidence). audit matrix ✅ (slice 7); onboarding Phase 1 ✅
(17); Wave K public docs UX (slice 44) on branch — Setup vs Configure framing,
services inventory + journey/dependency diagrams;
skill parse ✅ (8). The coverage gates are verified; their final documentation
sync (slice 14) is on branch and awaits merge. Groups:
[plan/PROGRESS.md](./plan/PROGRESS.md),
[plan/DECISIONS.md](./plan/DECISIONS.md), [plan/GATE_CONTRACT.md](./plan/GATE_CONTRACT.md).

Measured ship-path floors are: Python `sandbox/` **95.91%**; Live ACL
**98.48%** lines. CLI coverage floors are temporarily **60%** lines/functions/
statements and **80%** branches in `cli/package.json` while overall CLI
instrumented coverage is still climbing back toward the ADR-0013 ≥95% target
after the router land. Unit coverage for the router **does** exist:
[`cli/test/router.test.js`](../cli/test/router.test.js). Temporary floors are a
gate-policy choice, not “missing tests.” [ADR-0013](./adr/0013-ship-path-quality-gates.md)
still records the intended ≥95% CLI ship-path target. Exact gate matrix:
[plan/coverage-audit.md](./plan/coverage-audit.md).

Heatmap note: card `heatmap_status` is **worst-of** actionable scanner findings
(any red → red; amber-only → amber); finding-count chips are density, not colour.
Router rows (`tiered_router`) are excluded from severity rollup.
`risk_score` = `(3×red + 1×amber) / Σ completed checks_run` (unbounded ≥0) for
sort/trend only — see [ARCHITECTURE.md](./ARCHITECTURE.md) § Quality attributes.

---

## ON BRANCH (awaiting merge)

Wave K — Docs UX plain language + compaction (slice 44) on
`slice/44-docs-ux-plain-language`: GWT-44.1–44.4 compaction plus pile-ons
GWT-44.5–44.8 (Setup vs Configure beats, MVP Live, Maintain hub, screenshots
`R`/`Q`, ARCHITECTURE External services inventory + operator journey +
dependency-order Mermaid). Documentarist APPROVED for compaction; pile-on
re-review before merge. Gate evidence
`docs/plan/gate-evidence/slice-44.json` (`gate_status: ON_BRANCH`).

Live Modal/Supabase E2E as a CI Must remains **Won't** for this wave (slow/optional
skip-without-config stays). Demo/hackathon film day (VO/Remotion slice 4; film-day
prose slice 16) is **Won't (A)** — reinstate only if a new demo need arises.

---

## DECIDED

Architecture boundaries and quality/security trade-offs are recorded as formal
ADRs ([adr/README.md](./adr/README.md)): runtimes (0002), Modal (0003),
Supabase (0004), scanner adapters (0005), Live/Mock ACL (0006), ship UI (0007),
anon-read / service-role-write (0008), fail-closed evidence (0009), content-hash
idempotency (0010), schema bootstrap (0011), target acquisition (0012),
ship-path quality gates (0013), curated discovery (0014), Horizon A
excluding Guard/Drift (0015), and tiered SIE/Model Studio router (0016). Slice
waivers stay in [plan/DECISIONS.md](./plan/DECISIONS.md). ADR number 0001 is
reserved for a Proposed Monk Live packaging / deployment draft that is **not**
on `main` yet (side-branch only); it is omitted from the catalog until accepted.

**Wave J delta — dashboard metric surfacing (2026-08-20):** A9–A13
**IMPLEMENTED** on `main` via [PR #98](https://github.com/neomatrix369/tripwire/pull/98)
(nw-review APPROVED). Spec:
[plan/slices/10-J-dashboard-data-quality/slice-42-dashboard-data-quality-fixes.md](./plan/slices/10-J-dashboard-data-quality/slice-42-dashboard-data-quality-fixes.md).

**Wave K — docs UX (2026-08-20/21):** Slice 44 compaction + Setup/Configure framing
+ services/diagrams pile-ons are **IMPLEMENTED** on branch (public docs);
see [ON BRANCH](#on-branch-awaiting-merge). Spec:
[plan/slices/11-K-docs-ux-plain-language/slice-44-docs-ux-plain-language.md](./plan/slices/11-K-docs-ux-plain-language/slice-44-docs-ux-plain-language.md).

**Wave H — Frontline agent hooks (2026-08-15):** Claude Code PreToolUse handlers,
`tripwire setup-agent-hooks`, and five `/tw-*` skills are **DECIDED** as plan-only
slices 23–39 on branch `frontline-hackathon-london-2026-agent-hooks`. See
[plan/TRAIL.md](./plan/TRAIL.md) Wave H and [plan/DECISIONS.md](./plan/DECISIONS.md).
Not IMPLEMENTED — no production hook install path or `/tw-*` skills yet. ADR-0015
Horizon A exclusion remains in force until Wave H lands and a superseding ADR
records the new production entry.

---

## PROPOSED

Claude Code agent-hooks integration layer
([ADR-0017](./adr/0017-claude-code-agent-guard-integration.md), which amends
[ADR-0015](./adr/0015-horizon-a-excludes-guard-and-drift.md); this section is
the STATUS evidence its reopening rule requires — the Future note below
predates it, and Drift/trend remains Won't (A)):

- PreToolUse enforcement handler at `~/.tripwire/hooks/` (`pre-tool-use.sh` +
  `_guard_entry.py`; repo source `agent-hooks/hooks/`) — fail-closed decision
  JSON with internal timeout budget, identifier lookup + CLI-compatible hash
  comparison, 14-day staleness window — PROPOSED
- Five `/tw-*` skills (`tw-verify`, `tw-scan`, `tw-enable`, `tw-disable`,
  `tw-self-check`; repo source `agent-hooks/skills/`, installed to
  `~/.claude/skills/`) — PROPOSED
- `tripwire setup-agent-hooks` installer (preflight, `~/.tripwire/config.json`
  init, handler install, env pre-warm, `~/.claude/settings.json` JSON-merge,
  skill copy, bootstrap scan sweep) — PROPOSED
- Local `enable` kill switch AND-ed with Supabase `monitoring_enabled`;
  missing/corrupt local config denies (tamper signal) — PROPOSED

These entries flip to IMPLEMENTED/VERIFIED only with the Phase-1
regression-gate evidence (live block/allow matrix, tamper case, fail-closed
refusal+hang pair, settings diff) — see ADR-0017 Consequences.

---

## RESEARCH (not VERIFIED)

Exact JSON field names in `sandbox/scanners.py` — cross-check against the pinned
CLI version's `--help`/output before this blocks a merge. See
[scanner-output-adapters.md](./research/adapters/scanner-output-adapters.md).
Adapter fixture tests (slices 8–9) are planned to tighten this.

---

## Future (not current behaviour)

Known fixture gaps (not urgent) are listed under
[fixtures/README.md](../fixtures/README.md) (“Not yet built”). Do not treat those
as shipped capabilities. Guard PreToolUse and Drift/trend remain Future /
Won't (A) for the Horizon A ship path — see
[ADR-0015](./adr/0015-horizon-a-excludes-guard-and-drift.md). Frontline Guard
integration is **DECIDED** as Wave H (plan-only; not shipped) — see DECIDED
above.

Coverage audit matrix: [plan/coverage-audit.md](./plan/coverage-audit.md)
(slice 7 ✅). Slice stubs: [plan/README.md](./plan/README.md) (`01-A-…` …
`08-H-frontline-agent-hooks/`). Wave G (slices 18–22) is planned ATDD closure
(parked while Wave H Musts run). Wave H (23–39) is Frontline plan-only. Claim
audit (slice 15) and slice 16 remediations are deferred; retain their artifacts
for a future live/demo release.
