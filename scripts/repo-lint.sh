#!/usr/bin/env bash
# Repo lint: shellcheck, actionlint, markdownlint.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

find_precommit_bin() {
  local name="$1"
  find "${HOME}/.cache/pre-commit" -type f -name "$name" 2>/dev/null | head -1 || true
}

echo "--- scanner timeout budget ---"
bash scripts/check-scanner-timeout-budget.sh

echo "--- shellcheck ---"
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh
else
  SC_BIN="$(find_precommit_bin shellcheck)"
  if [[ -n "$SC_BIN" ]]; then
    "$SC_BIN" scripts/*.sh
  else
    pre-commit run shellcheck --all-files
  fi
fi

echo "--- actionlint ---"
if command -v actionlint >/dev/null 2>&1; then
  actionlint
else
  AL_BIN="$(find_precommit_bin actionlint)"
  if [[ -n "$AL_BIN" ]]; then
    "$AL_BIN"
  else
    pre-commit run actionlint --all-files
  fi
fi

echo "--- markdownlint ---"
pre-commit run markdownlint --all-files
