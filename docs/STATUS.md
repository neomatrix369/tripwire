# Capability status

Evidence-labelled claims for Tripwire:
RESEARCH · PROPOSED · DECIDED · IMPLEMENTED · VERIFIED · SUPERSEDED.

Repo entry: [README.md](../README.md) · Get started: [QUICKSTART.md](../QUICKSTART.md)

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
- Tiered post-scan router (SIE triage + optional Model Studio escalation) —
  `tripwire route`, auto-route after `tripwire scan`
  (`cli/src/router.js`, `cli/src/orchestrator.js`); dashboard router strip +
  SIE-only / escalated filters — `prototypes/dc-dashboard/`; sample CLIs —
  `prototypes/sie-studio/`, `prototypes/model-studio/` ([ADR-0016](./adr/0016-tiered-router-sie-model-studio.md))
- Claude Code agent-hooks layer ([ADR-0017](./adr/0017-claude-code-agent-guard-integration.md)):
  `tripwire setup-agent-hooks` (`cli/src/setupAgentHooks.js`), PreToolUse handler
  sources under `agent-hooks/hooks/` (installs to `~/.tripwire/hooks/`), five
  `/tw-*` skills (`agent-hooks/skills/` → `~/.claude/skills/`), guard entry
  (`guard/entry.py`, `guard/status.py`) with Skill/Bash/MCP matcher and
  skill-path Bash attribution — reachable production path on `main` (PRs
  #83/#84). Operator VERIFIED still waits on Phase-1 regression-gate evidence
  (slice 32)

---

## VERIFIED (unit)

- `cd cli && npm test` — discovery, content-hash, schema-probe (incl. `completed_at`),
  `--force`, tiered router (`cli/test/router.test.js`),
  `setup-agent-hooks` (`cli/test/setupAgentHooks.test.js`)
- `pytest sandbox/tests/test_acquire_target.py` — acquire-target dispatch
- `pytest sandbox/tests/test_scanners_depshield.py` /
  `test_scanner_registry.py` — DepShield adapter + registry (unit only)
- `uv run --extra guard pytest guard/tests/` — guard entry, status, hash parity,
  decision matrix (unit; not the live Claude Code block/allow matrix)
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

## VERIFIED (coverage gates)

Ship-path coverage uplift (~95% instrumented on `cli/src`, `sandbox/`, Live ACL JS;
omit `guard/` and `support.js`) is verified: slices 7–8, 11–14, and 17 ✅.
Groups: [plan/PROGRESS.md](./plan/PROGRESS.md),
[plan/DECISIONS.md](./plan/DECISIONS.md), [plan/GATE_CONTRACT.md](./plan/GATE_CONTRACT.md).

Measured ship-path floors are: Python `sandbox/` **95.91%**; Live ACL
**98.48%** lines. CLI coverage floors are temporarily **60%** lines/functions/
statements and **80%** branches in `cli/package.json` while overall CLI
instrumented coverage is still climbing back toward the ADR-0013 ≥95% target
after the router land. Unit coverage for the router **does** exist:
[`cli/test/router.test.js`](../cli/test/router.test.js). Temporary floors are a
gate-policy choice, not “missing tests.” [ADR-0013](./adr/0013-ship-path-quality-gates.md)
still records the intended ≥95% CLI ship-path target. Exact gate matrix:
[plan/coverage-audit.md](./plan/coverage-audit.md). `guard/` remains outside
ADR-0013 bars until a coverage-ratchet follow-up (DECISIONS 2026-08-15).

Heatmap note: card `heatmap_status` is **worst-of** actionable scanner findings
(any red → red; amber-only → amber); finding-count chips are density, not colour.
Router rows (`tiered_router`) are excluded from severity rollup.

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
Guard/Drift exclusions (0015, Guard PreToolUse **amended** by 0017), tiered
SIE/Model Studio router (0016), and Claude Code agent-hooks (0017). Slice
waivers stay in [plan/DECISIONS.md](./plan/DECISIONS.md). ADR number 0001 is
reserved for a Proposed Monk Live packaging / deployment draft that is **not**
on `main` yet (side-branch only); it is omitted from the catalog until accepted.

**Wave H — Frontline agent hooks:** Phase 1 code (handlers, installer, `/tw-*`
skills, Bash skill-path gating) and DepShield sandbox adapter landed on `main`
(PRs #83/#84). Formal slice ✅ closure and operator VERIFIED still require
Phase-1 regression-gate evidence (slice 32) per [GATE_CONTRACT.md](./plan/GATE_CONTRACT.md).
Remaining Shoulds: Ossprey (35–36), CLI monitoring / full-chain (37–38);
slice 33 DepShield install is a documented no-op; slice 39 deferred. See
[plan/TRAIL.md](./plan/TRAIL.md) Wave H and [plan/PROGRESS.md](./plan/PROGRESS.md).

---

## PROPOSED

No active PROPOSED capability rows. Agent-hooks entries moved to IMPLEMENTED
(unit-tested) after PRs #83/#84; operator VERIFIED remains gated on slice 32
(live block/allow matrix, tamper case, fail-closed refusal+hang pair, settings
diff) — [ADR-0017](./adr/0017-claude-code-agent-guard-integration.md) Consequences.

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
as shipped capabilities. **Drift/trend** remains Won't (A) —
[ADR-0015](./adr/0015-horizon-a-excludes-guard-and-drift.md). Guard PreToolUse is
no longer Future: it is IMPLEMENTED via ADR-0017 (operator VERIFIED pending
slice 32).

Coverage audit matrix: [plan/coverage-audit.md](./plan/coverage-audit.md)
(slice 7 ✅). Slice stubs: [plan/README.md](./plan/README.md) (`01-A-…` …
`08-H-frontline-agent-hooks/`). Wave G (slices 18–22) remains planned ATDD
closure (parked). Wave H Must code is on `main`; open work is gate closure
(32) and Should slices 35–38. Claim audit (slice 15) and slice 16 remediations
are deferred; retain their artifacts for a future live/demo release.
