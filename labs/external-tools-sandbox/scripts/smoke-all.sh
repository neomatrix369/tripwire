#!/usr/bin/env bash
# Run each external-tool smoke script one after another.
# Missing or stub smokes → SKIP (exit 0 for that tool, counted separately).
# Usage (from repo root or this folder):
#   ./labs/external-tools-sandbox/scripts/smoke-all.sh
#   ./scripts/smoke-all.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOOLS=(vibe-kanban who-targets-me pizauth snare)
PASS=0
FAIL=0
SKIP=0
RESULTS=()

is_stub() {
  local script="$1"
  if [[ ! -f "$script" ]]; then
    return 0
  fi
  if grep -qE 'STUB|not implemented|TODO\(sibling\)' "$script" 2>/dev/null; then
    return 0
  fi
  return 1
}

run_one() {
  local tool="$1"
  local script="$ROOT/$tool/smoke.sh"
  echo ""
  echo "════════════════════════════════════════"
  echo " SMOKE: $tool"
  echo "════════════════════════════════════════"

  if is_stub "$script"; then
    echo "SKIP  $tool — smoke.sh missing or still a sibling stub"
    RESULTS+=("SKIP  $tool")
    SKIP=$((SKIP + 1))
    return 0
  fi

  chmod +x "$script" 2>/dev/null || true
  if (cd "$ROOT/$tool" && ./smoke.sh); then
    echo "PASS  $tool"
    RESULTS+=("PASS  $tool")
    PASS=$((PASS + 1))
  else
    local code=$?
    echo "FAIL  $tool (exit $code)"
    RESULTS+=("FAIL  $tool")
    FAIL=$((FAIL + 1))
  fi
}

for tool in "${TOOLS[@]}"; do
  run_one "$tool" || true
done

echo ""
echo "════════════════════════════════════════"
echo " SUMMARY"
echo "════════════════════════════════════════"
for line in "${RESULTS[@]}"; do
  echo "  $line"
done
echo "  totals: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
