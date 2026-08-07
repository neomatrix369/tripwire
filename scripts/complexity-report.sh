#!/usr/bin/env bash
# Produce language-specific complexity evidence for quality gates and pull requests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT/.reports/complexity"
mkdir -p "$REPORT_DIR"

echo "--- Python complexity (Radon) ---"
uv run radon cc --json "$ROOT/sandbox" >"$REPORT_DIR/python-radon.json"

echo "--- CLI complexity (ESLint) ---"
(
  cd "$ROOT/cli"
  npx eslint --config eslint.complexity.config.js --format json src bin
) >"$REPORT_DIR/cli-eslint.json"

uv run python "$ROOT/scripts/write_complexity_summary.py" \
  --python-report "$REPORT_DIR/python-radon.json" \
  --cli-report "$REPORT_DIR/cli-eslint.json" \
  --output "$REPORT_DIR/pr-body.md"

echo "Complexity report: $REPORT_DIR/pr-body.md"
