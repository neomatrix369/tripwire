#!/usr/bin/env bash
# Pre-push gates — push-specific only (no duplication of commit-stage lint/secrets).
#
# Commit stage already ran: ruff, mypy, bandit, gitleaks, testmon, cli fast tests.
# Push adds: full pytest + coverage, conditional pip-audit / npm audit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FROM_REF="${PRE_COMMIT_FROM_REF:-}"
TO_REF="${PRE_COMMIT_TO_REF:-HEAD}"

changed_files() {
  if [[ -n "$FROM_REF" && "$FROM_REF" != "0000000000000000000000000000000000000000" ]]; then
    git diff --name-only "$FROM_REF" "$TO_REF" 2>/dev/null || true
    return
  fi
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    git diff --name-only origin/main...HEAD 2>/dev/null || true
    return
  fi
  echo "pyproject.toml"
  echo "cli/package.json"
}

CHANGED="$(changed_files)"
echo "=== pre-push gates ==="

# Conservative: empty change detection → run all
if [[ -z "${CHANGED// }" ]]; then
  echo "⚠️  could not detect changed files — running all push checks"
  PY_CHANGED=1
  PY_DEPS=1
  CLI_CHANGED=1
  CLI_DEPS=1
else
  PY_CHANGED=$(echo "$CHANGED" | grep -cE '^(sandbox/|guard/|scripts/.*\.py|pyproject\.toml|uv\.lock)' || true)
  PY_DEPS=$(echo "$CHANGED" | grep -cE '^(pyproject\.toml|uv\.lock)$' || true)
  CLI_CHANGED=$(echo "$CHANGED" | grep -cE '^cli/' || true)
  CLI_DEPS=$(echo "$CHANGED" | grep -cE '^cli/(package\.json|package-lock\.json)$' || true)
fi

mkdir -p .test-results .reports/coverage

if [[ "${PY_CHANGED:-0}" -gt 0 ]]; then
  echo "--- pytest + coverage (fail_under=95, sandbox ship-path) ---"
  uv run pytest sandbox/tests/ -q --tb=short \
    --cov=sandbox \
    --cov-report=term-missing \
    --cov-report="json:.reports/coverage/coverage.json" \
    --cov-fail-under=95 \
    --junitxml=.test-results/junit.xml \
    -o addopts=
else
  echo "--- pytest+coverage skipped (no Python source/dep changes) ---"
fi

# CLI tests + coverage — only when CLI files changed (commit hook already ran bare tests)
# Uses test:coverage (c8) to enforce the 95% floor before code reaches remote.
if [[ "${CLI_CHANGED:-0}" -gt 0 ]]; then
  echo "--- CLI unit tests + coverage (c8 ≥95%) ---"
  (cd cli && npm run test:coverage)
else
  echo "--- CLI unit tests skipped (no cli/ changes) ---"
fi

if [[ "${PY_DEPS:-0}" -gt 0 ]]; then
  echo "--- pip-audit (Python deps changed) ---"
  uv run pip-audit --skip-editable
else
  echo "--- pip-audit skipped (no Python dep file changes) ---"
fi

if [[ "${CLI_DEPS:-0}" -gt 0 ]]; then
  echo "--- npm audit (cli deps changed) ---"
  (cd cli && npm audit --audit-level=high)
else
  echo "--- npm audit skipped (no cli package file changes) ---"
fi

# T3: gitleaks commit-range scan (only commits being pushed)
# Full-tree SAST/SCA (semgrep, osv-scanner, trivy, trufflehog) runs in CI where latency is fine.
# Scanning only the pushed commit range keeps this step fast (<5s).
echo "--- T3: gitleaks commit-range secrets scan ---"
if command -v gitleaks &>/dev/null; then
  if [[ -n "$FROM_REF" && "$FROM_REF" != "0000000000000000000000000000000000000000" ]]; then
    LEAK_RANGE="${FROM_REF}..${TO_REF}"
  else
    LEAK_RANGE="origin/main..HEAD"
  fi
  if ! gitleaks detect --config .gitleaks.toml --log-opts "$LEAK_RANGE"; then
    echo "⚠️  gitleaks: secrets in pushed commits — CI will block; fix before merge"
  else
    echo "✅ gitleaks: no secrets in pushed commits"
  fi
else
  echo "⚠️  gitleaks not installed — skipping scan (brew install gitleaks)"
fi

echo "✅ pre-push gates passed"
