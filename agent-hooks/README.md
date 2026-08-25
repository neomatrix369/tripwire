# agent-hooks

Source of truth for Tripwire's Claude Code integration layer. Nothing here runs
from the repo directly — `tripwire setup-agent-hooks` installs copies:

| Source | Installed to |
|--------|--------------|
| `hooks/pre-tool-use.sh` | `~/.tripwire/hooks/pre-tool-use.sh` (chmod 700) |
| `hooks/_guard_entry.py` | `~/.tripwire/hooks/_guard_entry.py` |
| `skills/tw-*/SKILL.md` | `~/.claude/skills/tw-*/SKILL.md` |

## Contents

- **`hooks/pre-tool-use.sh`** — PreToolUse hook handler. Reads
  `~/.tripwire/config.json` (explicit `"enable": false` ⇒ allow; missing or
  corrupt config ⇒ deny, tamper rule), sources Supabase credentials from the
  recorded `env_file`, then delegates stdin to the guard entry under a portable
  8-second watchdog. Always exits 0 with exactly one decision JSON line on
  stdout; every failure mode is an explicit deny (fail closed).
- **`hooks/_guard_entry.py`** — installed shim delegating to
  `guard.entry.main()` (run via `uv run --project <repo_root> --extra guard`).
- **`skills/tw-verify`** — report scan status of named skills/MCP servers
  (RAG + Tessl Quality as `N/100` when present; blocked message as table footer;
  **Sources** line: Quality = Tessl, Status = Cisco AI Defense + Snyk).
- **`skills/tw-scan`** — submit named skills/MCP servers for scanning
  (`--force` or bare `force` to rescan valid artifacts).
- **`skills/tw-enable` / `skills/tw-disable`** — flip the local `enable` key in
  `~/.tripwire/config.json` (the Claude-Code-layer kill switch).
- **`skills/tw-self-check`** — tw-verify scoped to the five installed `tw-*`
  skills (self-integrity).

Design spec: the Tripwire × Claude Code integration plan (§3 config schema,
§4.3 handler contract, §5 name resolution, §6 output format, §7 skills).
