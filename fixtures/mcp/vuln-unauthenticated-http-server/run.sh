#!/usr/bin/env bash
# Launch the vuln-unauthenticated-http-server fixture (stdio by default; MCP_TRANSPORT=http for :8765).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec uv run --python 3.11 --with 'mcp==1.12.0' python "$ROOT/server.py"
