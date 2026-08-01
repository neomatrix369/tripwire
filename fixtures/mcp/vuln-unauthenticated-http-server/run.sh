#!/usr/bin/env bash
# Launch the vuln-unauthenticated-http-server fixture. Binds HTTP on :8765 with no auth.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec uv run --with 'mcp==1.12.0' python "$ROOT/server.py"
