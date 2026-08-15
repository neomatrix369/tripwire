#!/usr/bin/env bash
# Quality gates — serious-tier for Tripwire (Python sandbox/guard + Node cli/).
#
# Usage:
#   ./scripts/quality-gates.sh            # T1 + T2 (tests, coverage, audits)
#   ./scripts/quality-gates.sh --quick    # T1 only
#   ./scripts/quality-gates.sh --full     # T1 + T2 + security-scan.sh
#
# Parallelism: T1 jobs run in parallel; T2 after T1; T3 (--full) after T2.
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
  LOGS=()
}

mkdir -p .test-results .reports/coverage

echo "=== quality-gates (${MODE}) ==="

# ── T1: Static analysis (parallel) ────────────────────────────────────────────
run_bg "repo-lint" bash scripts/repo-lint.sh
run_bg "ruff check" uv run ruff check sandbox guard scripts
run_bg "ruff format" uv run ruff format --check sandbox guard scripts
run_bg "mypy" uv run mypy sandbox/ guard/
run_bg "bandit" uv run bandit -c pyproject.toml -r sandbox guard scripts -q -ll
# Xenon split matches .pre-commit-config.yaml + ci.yml static-analysis:
# scan_app/__init__ → absolute C, average A; scanners.py → absolute D, average B
# (run_snyk D-grade bootstrap; tracked for refactor).
run_bg "xenon" bash -c 'uv run xenon --max-absolute C --max-modules B --max-average A sandbox/scan_app.py sandbox/__init__.py && uv run xenon --max-absolute D --max-modules C --max-average B sandbox/scanners.py'
run_bg "vulture" uv run vulture sandbox/scan_app.py sandbox/scanners.py sandbox/__init__.py guard \
  --min-confidence 80
run_bg "gitleaks" gitleaks detect --no-git --config .gitleaks.toml --source .
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
FAILED=0
run_bg "complexity report" bash scripts/complexity-report.sh
run_bg "pytest+cov" uv run pytest sandbox/tests/ -q --tb=short \
  --cov=sandbox \
  --cov-report=term-missing \
  --cov-report="html:.reports/coverage/html" \
  --cov-report="xml:.reports/coverage/coverage.xml" \
  --cov-report="json:.reports/coverage/coverage.json" \
  --cov-fail-under=95 \
  --junitxml=.test-results/junit.xml \
  -o addopts=
run_bg "cli tests" bash -c 'cd cli && npm test'
run_bg "pip-audit" uv run pip-audit --skip-editable
wait_all

if [[ "$FAILED" -ne 0 ]]; then
  echo "❌ T2 failed"
  exit 1
fi

if [[ "$MODE" == "full" ]]; then
  echo "=== T3: security-scan.sh ==="
  if ! bash scripts/security-scan.sh; then
    echo "❌ T3 security-scan failed"
    exit 1
  fi
fi

echo "✅ quality-gates passed"
