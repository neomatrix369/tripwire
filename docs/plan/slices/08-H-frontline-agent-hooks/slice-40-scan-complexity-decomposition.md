<!-- file: docs/plan/slices/08-H-frontline-agent-hooks/slice-40-scan-type-filter.md -->

## Slice 40: `tripwire scan --type` Filter

Add a `--type <skill|mcp>` option to `tripwire scan` so operators can restrict
machine-wide discovery to a single artifact category without changing any other
scan behaviour.

**Project:** `tools-and-utilities/tripwire`
**Branch:** `slice/40-scan-type-filter`
**MoSCoW:** Must

---

### Context

`tripwire scan` with no arguments already discovers all skills and MCP servers
across known machine loci (`~/.claude/skills`, `~/.cursor/skills`,
`~/.cursor/mcp.json`, etc.) via `discoverDefaults()` in `cli/src/discovery.js`.
The missing UX piece is a way to say "scan only skills" or "scan only MCP
servers" explicitly — useful when an operator wants to audit one category at a
time or pipe results to a type-specific downstream tool.

A `--type` filter on the existing `scan` subcommand is preferred over a new
subcommand because: (a) the behaviour is a scoping concern on the existing
command, not a new mode; (b) it composes cleanly with `--force`,
`--dry-discover`, and `--concurrency`; (c) a new subcommand would duplicate the
zero-arg default path.

---

### Files

- `cli/src/discovery.js` — `discoverTargets` accepts `typeFilter`; new
  `_filterByType` helper; when `typeFilter` is set, defaults path runs through
  `annotateWithTypes` before filtering
- `cli/bin/tripwire.js` — `--type <type>` option wired into `scan` command;
  validated against `['skill', 'mcp']`; passed as `typeFilter` to
  `discoverTargets`
- `cli/test/discovery.test.js` — unit tests for `typeFilter` (RED before any
  production change)

### Exit criteria

- [ ] `tripwire scan --type skill` returns only `type: 'skill'` items from
  machine defaults — verified with `--dry-discover`
- [ ] `tripwire scan --type mcp` returns only `type: 'mcp_server'` items —
  verified with `--dry-discover`
- [ ] `tripwire scan --type invalid` exits non-zero with a clear error message
- [ ] `tripwire scan` (no `--type`) behaviour is unchanged — all existing tests
  still pass
- [ ] `--type` composes with `--dry-discover`, `--force`, explicit path args
- [ ] `typeFilter` unit tests cover: skill-only, mcp-only, no-filter (all),
  defaults path with filter, mixed folder with filter
- [ ] `cd cli && npm test` passes (all CLI tests green)
- [ ] `./scripts/quality-gates.sh` passes (all tiers)

### Commit pattern

```
feat(slice-40): add --type <skill|mcp> filter to tripwire scan

- discoverTargets accepts typeFilter; annotates defaults before filtering
- tripwire scan --type skill|mcp restricts machine-wide discovery by category
- Composes with --dry-discover, --force, --concurrency, explicit paths
```

---

### Spec (GWT / User Story)

As a security operator, I want to run `tripwire scan --type skill` or
`tripwire scan --type mcp` so that I can audit one artifact category at a time
without having to know the exact paths on the machine.

**Scenario: skill-only filter**
  Given machine loci contain both skills and MCP servers
  When `tripwire scan --type skill --dry-discover` is run
  Then only items with `type: 'skill'` appear in the output

**Scenario: mcp-only filter**
  Given machine loci contain both skills and MCP servers
  When `tripwire scan --type mcp --dry-discover` is run
  Then only items with `type: 'mcp_server'` appear in the output

**Scenario: invalid type rejected**
  Given an operator passes `--type badvalue`
  When the scan command is invoked
  Then the process exits non-zero with a message explaining valid values

**Scenario: no filter preserves existing behaviour**
  Given `--type` is omitted
  When `tripwire scan` is run
  Then all discovered items are returned exactly as before (no behaviour change)

**Scenario: filter composes with explicit paths**
  Given a folder containing both skills and MCP server subdirs
  When `tripwire scan <folder> --type skill`
  Then only skill subdirs are returned

---

### TDD Execution

**Phase RED — tests before any production change**

Add to `cli/test/discovery.test.js`:
1. `typeFilter=skill excludes mcp_server targets from a mixed folder`
2. `typeFilter=mcp excludes skill targets from a mixed folder`
3. `typeFilter=null returns all types (existing behaviour preserved)`
4. `typeFilter=skill on defaults annotates and filters correctly`

Run `cd cli && npm test` — these must FAIL (feature absent).
Commit: `test(slice-40): add RED tests for --type filter on discoverTargets`

**Phase GREEN — implement**

1. Add `_filterByType(items, typeFilter)` to `discovery.js`
2. Thread `typeFilter` through `discoverTargets`; annotate defaults when filter set
3. Add `--type <type>` option to `scan` in `tripwire.js` with validation
4. Run `cd cli && npm test` — all tests GREEN

Commit: `feat(slice-40): add --type <skill|mcp> filter to tripwire scan`

**Phase VERIFY**

- `./scripts/quality-gates.sh` passes
- Manual smoke: `node cli/bin/tripwire.js scan --type skill --dry-discover`

---

### Before-Checks

- [ ] `cd cli && npm test` passes on main (baseline)
- [ ] `node cli/bin/tripwire.js scan --dry-discover` shows mixed skill + mcp items
  (confirms defaults work without filter before we add one)
- [ ] Branch created: `git checkout -b slice/40-scan-type-filter`

### After-Checks

- [ ] `cd cli && npm test` all green
- [ ] `node cli/bin/tripwire.js scan --type skill --dry-discover` — skills only
- [ ] `node cli/bin/tripwire.js scan --type mcp --dry-discover` — MCP only
- [ ] `node cli/bin/tripwire.js scan --type bad` — exits 1, clear message
- [ ] `./scripts/quality-gates.sh` passes all tiers

### Gate Status

📋 PLANNED
