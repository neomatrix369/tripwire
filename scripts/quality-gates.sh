#!/usr/bin/env bash
# Quality gates (trimmed) — security-first static analysis for Tripwire.
#
# Usage:
#   ./scripts/quality-gates.sh            # T1 + CLI tests
#   ./scripts/quality-gates.sh --quick    # T1 only (ruff, bandit, repo-lint, gitleaks)
#   ./scripts/quality-gates.sh --full     # T1 + tests + pip-audit + gitleaks (explicit)
#
# No coverage fail_under / xenon / vulture — deferred until Python test suite exists.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="default"
for arg in "$@"; do
  case "$arg" in
    --quick) MODE="quick" ;;
    --full) MODE="full" ;;
  esac
done

PIDS=()
LABELS=()
LOGS=()
FAILED=0

cleanup() {
  # Always return 0 so EXIT trap does not override a successful gate exit.
  set +e
  local log
  for log in "${LOGS[@]+"${LOGS[@]}"}"; do
    rm -f "$log" "${log}.rc"
  done
  return 0
}
trap cleanup EXIT INT TERM

run_bg() {
  local label="$1"
  shift
  local log
  log="$(mktemp "${TMPDIR:-/tmp}/qg.XXXXXX")"
  LOGS+=("$log")
  LABELS+=("$label")
  (
    set +e
    "$@" >"$log" 2>&1
    echo $? >"${log}.rc"
  ) &
  PIDS+=($!)
}

wait_all() {
  local i pid label log rc
  for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    label="${LABELS[$i]}"
    log="${LOGS[$i]}"
    wait "$pid" || true
    rc="$(cat "${log}.rc" 2>/dev/null || echo 1)"
    echo "===== ${label} (exit ${rc}) ====="
    cat "$log"
    if [[ "$rc" != "0" ]]; then
      FAILED=1
    fi
    rm -f "${log}.rc"
  done
  PIDS=()
  LABELS=()
  # Keep LOGS for trap cleanup of remaining temp files; reset for next tier
  LOGS=()
}

echo "=== quality-gates (${MODE}) ==="

# ── T1: Static analysis (parallel) ────────────────────────────────────────────
run_bg "ruff check" uv run ruff check sandbox guard scripts
run_bg "ruff format" uv run ruff format --check sandbox guard scripts
run_bg "bandit" uv run bandit -c pyproject.toml -r sandbox guard scripts -q -ll
run_bg "gitleaks" gitleaks detect --no-git --config .gitleaks.toml --source .
run_bg "repo-lint" bash scripts/repo-lint.sh
wait_all

if [[ "$FAILED" -ne 0 ]]; then
  echo "❌ T1 failed"
  exit 1
fi

if [[ "$MODE" == "quick" ]]; then
  echo "✅ T1 passed (--quick)"
  exit 0
fi

# ── T2: Tests + audit ─────────────────────────────────────────────────────────
run_bg "cli tests" bash -c 'cd cli && npm test'
if [[ "$MODE" == "full" ]]; then
  run_bg "pip-audit" uv run pip-audit
fi
wait_all

if [[ "$FAILED" -ne 0 ]]; then
  echo "❌ T2 failed"
  exit 1
fi

echo "✅ quality-gates passed"
