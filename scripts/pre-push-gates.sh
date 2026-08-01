#!/usr/bin/env bash
# Pre-push gates — push-specific only (no duplication of commit-stage lint/secrets).
# Runs: CLI unit tests always; pip-audit when Python dependency files changed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FROM_REF="${PRE_COMMIT_FROM_REF:-}"
TO_REF="${PRE_COMMIT_TO_REF:-}"

changed_files() {
  if [[ -n "$FROM_REF" && -n "$TO_REF" && "$FROM_REF" != "0000000000000000000000000000000000000000" ]]; then
    git diff --name-only "$FROM_REF" "$TO_REF" 2>/dev/null || true
    return
  fi
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    git diff --name-only origin/main...HEAD 2>/dev/null || true
    return
  fi
  # Conservative: treat everything as changed
  echo "pyproject.toml"
}

CHANGED="$(changed_files)"
echo "=== pre-push gates ==="

echo "--- CLI unit tests ---"
(cd cli && npm test)

if echo "$CHANGED" | grep -qE '^(pyproject\.toml|uv\.lock|requirements.*\.txt)$'; then
  echo "--- pip-audit (Python deps changed) ---"
  uv run pip-audit
else
  echo "--- pip-audit skipped (no Python dep file changes) ---"
fi

if echo "$CHANGED" | grep -qE '^cli/(package\.json|package-lock\.json)$'; then
  echo "--- npm audit (cli deps changed) ---"
  (cd cli && npm audit --audit-level=high)
else
  echo "--- npm audit skipped (no cli package file changes) ---"
fi

echo "✅ pre-push gates passed"
