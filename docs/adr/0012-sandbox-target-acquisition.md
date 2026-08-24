# ADR-0012: Sandbox target acquisition

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** sandbox, acquisition, isolation, modal

## Context

Scanners need a workdir (or a protocol URL). Modal workers cannot see the
operator’s filesystem. Silently scanning an empty directory looks like a clean
skill. Path-traversal in uploaded archives must not write outside the workdir.

Targets come in four shapes: local directory, git URL, uploaded tar from the
host, and live MCP endpoints with no source on disk.

## Decision

Populate the sandbox workdir in `_acquire_target` (`sandbox/scan_app.py`):

| Shape | Action |
|---|---|
| Git URL | Shallow clone (`--depth 1`, single-branch) |
| Host local directory | `local_entrypoint` packs a gzipped tar; remote `scan_item` extracts with `filter="data"` |
| Directory already on the sandbox FS | Recursive copy (same-machine only) |
| Filesystem-looking path, no archive, not on disk | **Raise** — do not scan an empty workdir |
| MCP URL / stdio / other | Introspection-only: empty workdir; scanners use `target` via protocol |

CLI must spawn `sandbox/scan_app.py::main`, not `scan_item` directly, or packing
is skipped.

## Consequences

- Local Live scans pay a pack/upload cost; that is required for isolation
  ([ADR-0003](./0003-modal-isolated-scanner-execution.md)).
- Clone failures fail the `scan_run` rather than producing empty findings.
- Introspection-only MCP cannot run disk-oriented engines; those rows should
  be `not_applicable` / unreachable, not green.
- Git content hashing on the host remains a placeholder
  ([ADR-0010](./0010-content-hash-idempotency.md)).

## Alternatives considered

### A. Mount the operator disk into Modal

Rejected: breaks isolation and is not how Modal remote functions see paths.

### B. Always require git URLs

Rejected: fixture and local skill scans are the primary operator path.

## Later decisions

Host `evals/` on Tessl plugins is **DECIDED** as omitted from the upload tar
(`tessl.json` or `.tessl-plugin/` at the skill root). That exclude is **not**
in `_pack_local_dir` yet — current behaviour is still a whole-tree gzipped tar.
See [plan/DECISIONS.md](../plan/DECISIONS.md) (2026-08-24 packing).

## References

- `sandbox/scan_app.py` `_acquire_target`, `cli/src/modalClient.js`
- `sandbox/tests/test_acquire_target.py`
- [docs/STATUS.md](../STATUS.md) `_acquire_target` dispatch
