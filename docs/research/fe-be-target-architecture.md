# FE/BE Target Architecture Note (slice 39 — deferred by default)

> Status: RESEARCH · slice 39 is **Could / 📦 DEFERRED** per the Wave-H MoSCoW
> DECISIONS row — this note is the backlog architecture spike deliverable, not
> a commitment. Execute only after a recorded pull-in decision (owner +
> time-box) and a slice-38 PASS, per the slice's own Before-Checks.

## Where the integration layer's boundaries actually are today

The Frontline agent-hooks work grew three surfaces around the existing
CLI + Modal + Supabase + dashboard core:

1. **Enforcement plane** — `~/.tripwire/hooks/pre-tool-use.sh` →
   `guard/entry.py` → `guard/guard_hook.py` / `guard/status.py` (Python,
   fail-closed, per-call).
2. **Operator plane** — the five `/tw-*` skills + `tripwire status`
   (Node + SKILL.md drivers, read-mostly).
3. **Install plane** — `tripwire setup-agent-hooks` +
   `scripts/install-demo-artifacts.sh` (Node + bash, write-once).

All three read the same two truth stores (`~/.tripwire/config.json` locally,
Supabase remotely) — that discipline (no third store) is the main thing the
current shape gets right and any rearchitecture must preserve.

## The two boundary pressures worth solving (when pulled in)

1. **Duplicated status logic across languages.** The six-state machine
   (fresh/stale/unscanned/scanning/not-found/red) lives once in Python
   (`guard/status.py`, authoritative for enforcement) and is re-derived in
   Node (`cli/src/statusCommand.js`) and in the SKILL.md drivers. Target: one
   queryable backend surface — either a `tripwire status --artifact <id>`
   JSON contract the Python layer shells to, or a small PostgREST view
   (`item_effective_status`) both languages read — so the state machine has
   exactly one implementation.
2. **Read-path credentials.** Every consumer currently uses the service-role
   key because the `config` table has no anon read policy (ADR-0008 tension,
   recorded in ADR-0017's limits). Target: an anon-readable view exposing
   only `monitoring_enabled`/`threshold` + item statuses, so the client-side
   enforcement plane stops carrying a write-capable secret.

## Explicit non-goals

Rewriting the dashboard, replacing SKILL.md drivers with a daemon, or moving
enforcement out of the PreToolUse hook — the hook is the only pre-execution
interception point Claude Code offers (ADR-0017), and slice-39's GWT 2 pins
behavioural equivalence under the existing characterization suites anyway.
