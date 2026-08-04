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
  CLI_DEPS=1
else
  PY_CHANGED=$(echo "$CHANGED" | grep -cE '^(sandbox/|guard/|scripts/.*\.py|pyproject\.toml|uv\.lock)' || true)
  PY_DEPS=$(echo "$CHANGED" | grep -cE '^(pyproject\.toml|uv\.lock)$' || true)
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

# Always run CLI unit tests on push (fast; mirrors CI cli-tests job)
echo "--- CLI unit tests ---"
(cd cli && npm test)

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

# T3: deep security scans — full-tree gitleaks + security-scan.sh (warn-only at push)
# Commit stage runs incremental diff via pre-commit hook; push stage runs full-tree scan.
# Findings are warnings here — CI is the authoritative blocking gate for SAST/SCA.
echo "--- T3: deep security scans (warn-only; blocking gate is in CI) ---"
if command -v gitleaks &>/dev/null; then
  if ! gitleaks detect --config .gitleaks.toml --source . --verbose; then
    echo "⚠️  gitleaks: secrets detected — CI will block; fix before merge"
  else
    echo "✅ gitleaks: no secrets found"
  fi
else
  echo "⚠️  gitleaks not installed — skipping full-tree scan (brew install gitleaks)"
fi
security_exit=0
bash scripts/security-scan.sh || security_exit=$?
if [[ "$security_exit" -eq 0 ]]; then
  echo "✅ security-scan passed"
elif [[ "$security_exit" -eq 2 ]]; then
  echo "⚠️  security-scan: no scanners available (skipped)"
else
  echo "⚠️  security-scan: findings detected — CI will block; fix before merge"
fi

echo "✅ pre-push gates passed"
