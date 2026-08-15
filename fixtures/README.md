# Fixtures

[![Tripwire](https://img.shields.io/badge/Tripwire-1a1a2e?style=flat)](https://github.com/neomatrix369/tripwire)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Modal](https://img.shields.io/badge/Modal-000000?style=flat)](https://modal.com)
[![Snyk](https://img.shields.io/badge/Snyk-4C4A73?style=flat&logo=snyk&logoColor=white)](https://snyk.io)
[![Tessl](https://img.shields.io/badge/Tessl-111111?style=flat)](https://tessl.io)
[![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=flat)](https://developer.cisco.com)

Came from [QUICKSTART](../QUICKSTART.md)? Use these paths with `tripwire scan` /
`--dry-discover` on the shared onboarding path.

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
| `skills/vuln-dependency-lodash` | skill | red (dependency) | pinned `lodash@4.17.15` (CVE-2020-8203, CVE-2021-23337) in `package.json` + lockfile — SCA/dependency-scanner demo target |
| `mcp/safe-time-server` | mcp | green | clean baseline |
| `mcp/vuln-command-injection-server` | mcp | red | `shell=True` + unsanitized interpolation (CWE-78), file- and entity-anchored simultaneously |
| `mcp/vuln-hardcoded-secret-server` | mcp | red | hardcoded API key in `config.py` (CWE-798) |
| `mcp/vuln-unauthenticated-http-server` | mcp | amber | HTTP transport with no auth check |

## Demo install (Claude Code integration)

`../scripts/install-demo-artifacts.sh` installs a demo subset under demo names:
three skills copied to `~/.claude/skills/` (`safe-skill`, `vuln-skill`,
`amber-skill`, frontmatter `name:` rewritten to match) and a demo MCP manifest
at `~/.tripwire/demo-mcp.json` (`safe-tool`, `vuln-tool`, `amber-tool`) pointing
at the `mcp/*/run.sh` scripts in place. It then scans the installed copies —
the enforcement hook verifies those, not the pristine fixtures here.

All MCP servers are registered in `mcp/mcp_manifest.json`. All vulnerable fixtures are inert —
fake keys, non-resolving `example.invalid`/`webhook.example.com` URLs — they exist to prove a
scanner catches the pattern, not to cause harm. Run them only inside an isolated sandbox.

Not yet built (real gaps, not urgent — see spec §8 "Known test gaps"): a purely
live-introspected MCP server with no source at all, prompt/resource-level findings,
and cross-tool attack chains.
