#!/usr/bin/env bash
# Apply Tripwire DDL to Supabase (idempotent). Same path the CLI uses on first scan.
#
# Requires in .env:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — probe via HTTP API
#   SUPABASE_DB_URL                         — postgresql://… for DDL apply
#
# Usage (from repo root):
#   ./scripts/setup-supabase.sh
#   ./scripts/setup-supabase.sh --force

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/cli/bin/tripwire.js" ]] || [[ -f "$ROOT/cli/bin/tripwire.js" ]]; then
  exec node "$ROOT/cli/bin/tripwire.js" setup "$@"
fi

echo "error: cli/bin/tripwire.js not found" >&2
exit 1
