# Interview Summary
> Generated: 2026-08-01 | Scenario: Brownfield | Flow: D

## What was provided (explicit inputs)
- Horizon **A only**: gap-close Saturday **3-lite + demo video**; later ask about expanding to **1+C**.
- Product SoT: private references; demo lens: `01_demo_video/00-tripwire-demo-script.md`; gates: `build-day-decisions.md` §8.
- Must-show fixtures: skill `vuln-prompt-injection-notes`, MCP `vuln-command-injection-server`.
- Demo-blocking: **none** — operator reports capture-ready.
- Done = **2b**: filmable 3-lite + dress-rehearsal **and** VO/Remotion assembled (Detection + Sandbox; no Drift/Phase-5 claims).
- GWT-1/2/3 accepted (Detection, Sandbox evidence, demo capture path).
- Stack freeze: Node CLI + Modal + Supabase + `prototypes/dc-dashboard` as ship UI (no redesign).
- Coverage defaults: statement ≥90%, function ≥95%, branch ≥85%.
- No pre-committed scope cuts if clock bites; re-ask then.
- Adversarial: **none** (no phantom problems).
- Agent refs (defaults): slice-execution, software-craft, test-writing-*, project CLAUDE.md.

## What was inferred
- Repo already has `db/`, `cli/`, `sandbox/`, Live/Mock dashboard, `guard/` stub — past morning “docs-only” note; build-day checkboxes likely stale.
- Remotion/VO lives outside this repo (`claude-remotion-kickstart` tripwire project).
- Spec level raised to GWT (level 5) via accepted GWT-1/2/3; full product Drift/Guard/Reconciler out of A.

## What is missing / assumed
- Exact remaining VO/Remotion work unknown — plan as verify + assemble slices, not greenfield video.
- build-day “Phase Done” boxes not re-ticked; treat GWT pass as ship evidence, not checkbox archaeology.
- Expanding to 1+C deferred until A completes.

## Constraints
- Brownfield Flow D; planning only → execution via `/nw-execute`.
- Coverage: defaults above; stack freeze yes.
- private references are gitignored — public plan artifacts go under `docs/plan/`.

## Simplest shape
- Prove GWT-1/2 on Live path + dress-rehearsal; assemble Detection+Sandbox video (GWT-3). Defer Drift, Guard, Reconciler, redesign, blast-radius.

## Divergence result
- Canonical = **spec** (user continued without a/b/c; default + hybrid). Code is ship evidence for today; GWT E2E tests planned in slices; build-day checkboxes sync on GWT pass; VO/Remotion in sibling repo.

---

# Interview Summary — Wave H Frontline (delta)
> Generated: 2026-08-15 | Scenario: Brownfield | Path: Add Wave H | Plan-only

## What was provided
- Brief: `internal-docs/04_frontline/main_prompt.md` (Claude Code only).
- Branch: `frontline-hackathon-london-2026-agent-hooks`.
- Path: **Add** Wave H; keep Horizon A / Waves A–G; Wave G not resumed during H1–H3.
- Mode: plan artifacts + phase gates only — no product execution yet.
- Architecture: PreToolUse → handler → `guard.guard_hook` → Supabase RAG; skills call existing `tripwire scan` + Supabase status.
- Config: `~/.tripwire/config.json` — `enable` default **true**, `scan_validity_days` default **14**.
- Skills: `/tw-verify`, `/tw-scan`, `/tw-enable`, `/tw-disable`, `/tw-self-check` with dual human/JSON output.
- Install: single path `tripwire setup-agent-hooks`.
- Sequence phases: H1 enforcement skeleton → H2 control skills → H3 demos + Phase 1 regression hard gate → H4 DepShield → H5 Ossprey (access OPEN) → H6 monitoring/full-chain; FE/BE Could/deferred.

## What was inferred
- Foundation exists: `guard/guard_hook.py` stub, `tripwire scan`, fixtures; integration layer absent.
- No Claude Code native install-event hook — workaround is setup command.
- Status lookup is Supabase-direct (no status CLI), matching guard pattern.

## Constraints
- Enforcement ON by default from install.
- Unscanned = blocked when enabled; RED blocked; Amber report-only.
- BACKLOG items carried in DECISIONS — do not silently resolve.
- Full DISTILL ATs before any H slice IN PROGRESS.

## Simplest shape
- Ship Phase 1 Musts (23–32) with human test after each phase; Should dispatch after slice 32 PASS; defer FE/BE unless pulled in.
