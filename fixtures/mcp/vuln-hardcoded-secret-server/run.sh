#!/usr/bin/env bash
# Launch the vuln-hardcoded-secret-server fixture with a pinned mcp that still has FastMCP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec uv run --with 'mcp==1.12.0' python "$ROOT/server.py"
