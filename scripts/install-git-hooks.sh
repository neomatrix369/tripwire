#!/usr/bin/env bash
# Install pre-commit hooks for commit + push stages (trimmed Tripwire hygiene).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  echo "Creating .venv..."
  uv venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo "Installing dev dependencies..."
uv pip install -e ".[dev]"

echo "Installing pre-commit hooks (commit + push stages)..."
pre-commit install --hook-type pre-commit --hook-type pre-push

echo "✅ Git hooks installed."
echo "   Run 'pre-commit run --all-files' to verify."
echo "   Run './scripts/quality-gates.sh --quick' for local T1 checks."
