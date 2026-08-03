#!/usr/bin/env bash
# Produce language-specific complexity evidence for quality gates and pull requests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT/.reports/complexity"
mkdir -p "$REPORT_DIR"

echo "--- Python complexity (Radon) ---"
uv run radon cc --json "$ROOT/sandbox" "$ROOT/guard" >"$REPORT_DIR/python-radon.json"

echo "--- CLI complexity (ESLint) ---"
(
  cd "$ROOT/cli"
  npx eslint --config eslint.complexity.config.js --format json src bin
) >"$REPORT_DIR/cli-eslint.json"

echo "--- Dashboard complexity (ESLint) ---"
(
  cd "$ROOT/prototypes/dc-dashboard"
  npx eslint --config eslint.complexity.config.js --format json . --ignore-pattern test
) >"$REPORT_DIR/dashboard-eslint.json"

uv run python "$ROOT/scripts/write_complexity_summary.py" \
  --python-report "$REPORT_DIR/python-radon.json" \
  --cli-report "$REPORT_DIR/cli-eslint.json" \
  --dashboard-report "$REPORT_DIR/dashboard-eslint.json" \
  --output "$REPORT_DIR/pr-body.md"

echo "Complexity report: $REPORT_DIR/pr-body.md"
