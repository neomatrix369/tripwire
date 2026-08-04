#!/usr/bin/env bash
# scripts/pip-audit.sh — Python dependency vulnerability audit
# Run: ./scripts/pip-audit.sh
# Exit 1 if unfixed HIGH/CRITICAL vulnerabilities are found.
set -euo pipefail

# ── Project-specific ignores ──────────────────────────────────────────────────
# Add --ignore-vuln GHSA-XXXX-XXXX-XXXX for each suppressed CVE.
# Format:
#   "--ignore-vuln <ID>"  # Why: <reason>. Unblock: <condition>.
#
IGNORES=(
  # Example:
  # "--ignore-vuln GHSA-f4xh-w4cj-qxq8"  # Why: test-only dep, no fix available. Unblock: upstream 2.x release.
)

# ── Run audit ─────────────────────────────────────────────────────────────────
echo "▶ pip-audit"
uv run pip-audit --skip-editable "${IGNORES[@]:-}"
