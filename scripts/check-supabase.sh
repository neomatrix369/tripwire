#!/usr/bin/env bash
# Smoke-test Supabase connectivity from the browser's perspective.
#
# Uses SUPABASE_ANON_KEY (not service role) so it catches RLS policy gaps
# that the service role bypasses silently.
#
# Usage (from repo root):
#   ./scripts/check-supabase.sh
#
# Exit 0 = all checks passed. Exit 1 = at least one check failed.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env" >&2
  echo "       See docs/user-guide/supabase-setup.md" >&2
  exit 1
fi

TABLES=(items scan_runs scan_run_scanners findings)
FAILED=()

echo "Checking Supabase anon-key access (${SUPABASE_URL})…"
echo

for table in "${TABLES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

  if [[ "$status" == "200" ]]; then
    echo "  ✓ anon SELECT ${table}"
  else
    echo "  ✗ anon SELECT ${table} → HTTP ${status}"
    FAILED+=("$table")
  fi
done

echo

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "FAIL: anon key blocked on: ${FAILED[*]}"
  echo
  echo "This usually means RLS was enabled without the anon SELECT policies."
  echo "Fix: re-apply the full schema (idempotent):"
  echo
  echo "  tripwire setup --force"
  echo "  # or: ./scripts/setup-supabase.sh --force"
  echo
  echo "Never toggle RLS via the Supabase UI — always manage schema through"
  echo "the commands above so policies and grants are applied together."
  exit 1
fi

echo "OK: all tables readable by the anon key."
