#!/usr/bin/env bash
# Claude Code PreToolUse handler (install template → ~/.tripwire/hooks/pre-tool-use.sh).
# Always exit 0; approve/block is communicated via stdout JSON.
# Fail-closed: unexpected errors emit {"decision":"block","reason":"guard error — fail closed"}.
set -euo pipefail

CONFIG="${TRIPWIRE_CONFIG:-${HOME}/.tripwire/config.json}"
ENTRY="${TRIPWIRE_GUARD_ENTRY:-}"

# Fast path: enable=false → approve without invoking Python guard.
ENABLED="$(
  python3 -c "
import json, sys
path = '''${CONFIG}'''
try:
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    print(data.get('enable', True))
except Exception:
    print(True)
" 2>/dev/null || echo "True"
)"

case "${ENABLED}" in
  False|false|0)
    printf '%s\n' '{"decision":"approve"}'
    exit 0
    ;;
esac

if [[ -z "${ENTRY}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ENTRY="${SCRIPT_DIR}/_guard_entry.py"
fi

if command -v uv >/dev/null 2>&1; then
  exec uv run python "${ENTRY}"
fi
exec python3 "${ENTRY}"
