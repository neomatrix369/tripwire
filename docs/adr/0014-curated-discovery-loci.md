# ADR-0014: Curated discovery loci, not a filesystem crawl

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** discovery, cli, privacy, security

## Context

Zero-arg `tripwire scan` is a useful operator story (“scan what this machine
already installed”). An unconstrained home-directory crawl would mix unrelated
projects, leak private paths into Supabase `items.identifier`, and surprise
people who expected a fixture scan.

Skill and MCP install locations are conventional (Cursor, Claude, Codex agent
folders and MCP manifests), not arbitrary.

## Decision

Discover only **curated loci** (`cli/src/discovery.js`).

- Default skill roots: `.cursor/skills`, `.claude/skills`, `.agents/skills`,
  and the matching directories under `$HOME` for Cursor/Claude/Codex.
- Default MCP manifests: `.cursor/mcp.json`, `.mcp.json`,
  `~/.cursor/mcp.json`.
- Explicit path/URL arguments and `--targets` still win.
- `--no-defaults` errors instead of scanning machine defaults when args are
  empty.
- `--dry-discover` prints the same expansion without spawning.
- Type detection: `SKILL.md` → skill; git-looking HTTPS → cloneable MCP;
  other HTTPS → introspection-only MCP; else local MCP heuristics.

Zero-arg agent-loci scan is a Could, not an unconstrained search.

## Consequences

- Skills installed outside those folders are invisible until the operator
  passes a path.
- Manifest parse failures are skipped, not fatal.
- Identifiers stored in Postgres are relative/normalized paths from those
  loci — still potentially sensitive; the project is a single-operator trust
  domain ([ADR-0008](./0008-anon-read-service-role-write.md)).

## Alternatives considered

### A. Walk `$HOME` for `SKILL.md`

Rejected: privacy, performance, and surprise scope.

### B. Fixtures-only discovery (no defaults)

Rejected: the operator machine *is* a legitimate target; defaults are opt-out
via `--no-defaults`.

## References

- `cli/src/discovery.js`
- [docs/plan/interview_summary.md](../plan/interview_summary.md) (zero-arg not
  on critical path)
- [QUICKSTART.md](../../QUICKSTART.md) dry-discover
