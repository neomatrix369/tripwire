# ADR-0002: Node CLI and Python sandbox as separate runtimes

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Tripwire maintainers
- **Tags:** runtime, cli, sandbox, languages

## Context

Tripwire must run on an operator workstation (discover targets, bootstrap schema,
spawn jobs) and inside an isolated scan environment (install scanner CLIs, parse
JSON, write findings). Those jobs have different language ecosystems: Node is
natural for a `npm`-distributed CLI and the HTML dashboard; Cisco / Snyk / Tessl
scanners are Python packages consumed via `pip` / `uvx`.

A single-language stack would force either wrapping Python scanners from Node
on the operator machine, or shipping a Python CLI that still has to talk to a
browser dashboard.

## Decision

Keep two production runtimes:

- **CLI** (`cli/`): Node **22** (`.nvmrc`). Discovery, content hashing,
  idempotency, schema bootstrap, Modal spawn.
- **Sandbox** (`sandbox/`): Python. Modal image is Debian slim **3.11**; local
  contributor pin is **3.12** (`.python-version`). Scanner adapters live here.

The CLI never runs scanner binaries. The sandbox never owns operator UX.

## Consequences

- Contributors need both Node 22 and Python 3.12; CI must gate both stacks.
- Modal image independently pins Node **20.18.1** (Tessl) and Python 3.11 —
  local pins and the scan image can drift and must be documented.
- Contract between sides is explicit: CLI passes `target`, `item-type`,
  `item-id`, `scan-run-id`; sandbox writes to Supabase.

## Alternatives considered

### A. Python-only (CLI + sandbox)

Rejected: dashboard and `npm link` CLI already existed; Node is the operator
entry the walking skeleton shipped.

### B. Node-only, shell out to scanners from the laptop

Rejected: scanner installs and untrusted target execution belong in isolation
(see [ADR-0003](./0003-modal-isolated-scanner-execution.md)).

## References

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) §2
- [docs/user-guide/prerequisites.md](../user-guide/prerequisites.md)
- Walking skeleton: `feat: land walking skeleton` (2026-08-01)
