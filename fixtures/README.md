# Fixtures

Real scan targets matching the spec's §8 fixture table — a small, curated set (not
exhaustive), enough to demo each heatmap state and the main finding anchor types.

| Fixture | Type | Status | What it shows |
|---|---|---|---|
| `skills/safe-csv-cleaner` | skill | green | clean baseline |
| `skills/safe-changelog-writer` | skill | green | clean baseline, also the v1 of the drift pair |
| `skills/safe-changelog-writer-v2-drifted` | skill | amber (drift) | same name/purpose, v2 adds an undeclared webhook POST (`notify.py`) |
| `skills/vuln-prompt-injection-notes` | skill | red | hidden "SYSTEM OVERRIDE" instructions in an HTML comment |
| `skills/vuln-runtime-download` | skill | red | `curl \| bash` in `install.sh` (CWE-494) |
| `skills/disagreement-naive-domain-check` | skill | amber (borderline) | naive prefix-match allowlist bypass — designed to plausibly split scanners |
| `mcp/safe-time-server` | mcp | green | clean baseline |
| `mcp/vuln-command-injection-server` | mcp | red | `shell=True` + unsanitized interpolation (CWE-78), file- and entity-anchored simultaneously |
| `mcp/vuln-hardcoded-secret-server` | mcp | red | hardcoded API key in `config.py` (CWE-798) |
| `mcp/vuln-unauthenticated-http-server` | mcp | amber | HTTP transport with no auth check |

All MCP servers are registered in `mcp/mcp_manifest.json`. All vulnerable fixtures are inert —
fake keys, non-resolving `example.invalid`/`webhook.example.com` URLs — they exist to prove a
scanner catches the pattern, not to cause harm. Run them only inside an isolated sandbox.

Not yet built (real gaps, not urgent — see spec §8 "Known test gaps"): a purely
live-introspected MCP server with no source at all, prompt/resource-level findings,
cross-tool attack chains, and dependency/SCA findings.
