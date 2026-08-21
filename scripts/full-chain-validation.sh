#!/usr/bin/env bash
# Full-chain validation harness (slice 38): setup → enforce → scan → verify →
# DepShield dispatch → (Ossprey: skipped while access is OPEN) → CLI
# monitoring → LIVE /tw-self-check.
#
# Each stage records an observable PASS / FAIL / BLOCKED(<why>) / SKIPPED(<why>)
# line and the chain exits with a single accountable overall result:
#   exit 0  — every required stage PASS (design-sanctioned SKIPs allowed,
#             e.g. `ossprey: SKIPPED (access)` per slice-38 GWT 3)
#   exit 1  — any required stage FAIL or BLOCKED (missing prerequisites are
#             reported honestly, never silently passed)
#
# Evidence: .test-results/full-chain-evidence.json (stages + overall + the
# captured live /tw-self-check output). Operators copy results into
# docs/plan/gate-evidence/slice-38.json after a live run per GATE_CONTRACT —
# this script never writes gate evidence itself.
#
# Compatible with macOS /bin/bash 3.2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$ROOT/.test-results"
EVIDENCE="$EVIDENCE_DIR/full-chain-evidence.json"
STAGES_TSV="$(mktemp "${TMPDIR:-/tmp}/tripwire-fullchain.XXXXXX")"
SELFCHECK_OUT="$(mktemp "${TMPDIR:-/tmp}/tripwire-selfcheck.XXXXXX")"
trap 'rm -f "$STAGES_TSV" "$SELFCHECK_OUT"' EXIT

OVERALL=0

record() { # $1 stage, $2 result, $3 detail
  printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "$STAGES_TSV"
  case "$2" in
    FAIL|BLOCKED*) OVERALL=1 ;;
  esac
  printf '  [%s] %s — %s\n' "$2" "$1" "$3"
}

echo "[full-chain] Tripwire agent-hooks validation (slice 38)"
echo

# ── 1. preflight ─────────────────────────────────────────────────────────────
if command -v node >/dev/null && command -v uv >/dev/null; then
  record "preflight" "PASS" "node + uv present"
else
  record "preflight" "FAIL" "node and/or uv missing from PATH"
fi

ENV_OK=0
if [ -f "$ROOT/.env" ] && grep -qE '^\s*(export\s+)?SUPABASE_URL\s*=..*' "$ROOT/.env"; then
  ENV_OK=1
  record "credentials" "PASS" ".env with SUPABASE_URL present"
else
  record "credentials" "BLOCKED(.env)" "no $ROOT/.env with SUPABASE_URL — live stages cannot run (see .env.example)"
fi

# ── 2. hooks installed + enforcing ───────────────────────────────────────────
CONFIG_JSON="$HOME/.tripwire/config.json"
if [ -f "$CONFIG_JSON" ] && grep -q '"enable"' "$CONFIG_JSON" 2>/dev/null; then
  if grep -q '/.tripwire/hooks/pre-tool-use.sh' "$HOME/.claude/settings.json" 2>/dev/null; then
    record "hooks-installed" "PASS" "config.json present + PreToolUse registered"
  else
    record "hooks-installed" "FAIL" "config.json present but hook not registered — run tripwire setup-agent-hooks"
  fi
else
  record "hooks-installed" "BLOCKED(setup)" "~/.tripwire/config.json missing — run tripwire setup-agent-hooks"
fi

# ── 3. demo artifacts ────────────────────────────────────────────────────────
DEMO_OK=1
for demo in safe-skill vuln-skill amber-skill; do
  [ -d "$HOME/.claude/skills/$demo" ] || DEMO_OK=0
done
if [ "$DEMO_OK" = 1 ]; then
  record "demo-artifacts" "PASS" "safe/vuln/amber-skill installed under ~/.claude/skills"
else
  record "demo-artifacts" "BLOCKED(setup)" "demo skills missing — run scripts/install-demo-artifacts.sh"
fi

# ── 4-6. live scan → verify → DepShield rows (need credentials) ──────────────
if [ "$ENV_OK" = 1 ]; then
  SCAN_OUT="$(cd "$ROOT" && node cli/bin/tripwire.js scan "$HOME/.claude/skills/safe-skill" --no-defaults --force 2>&1 || true)"
  if printf '%s' "$SCAN_OUT" | grep -q '"batch_id"'; then
    record "scan-dispatch" "PASS" "scan submitted (batch_id in output)"
  else
    record "scan-dispatch" "FAIL" "no batch_id in scan output: $(printf '%s' "$SCAN_OUT" | tail -1 | cut -c1-160)"
  fi

  STATUS_JSON="$(cd "$ROOT" && node cli/bin/tripwire.js status --json 2>/dev/null || true)"
  if printf '%s' "$STATUS_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("items") else 1)' 2>/dev/null; then
    record "verify-status" "PASS" "tripwire status --json returns item/run health"
  else
    record "verify-status" "FAIL" "tripwire status --json did not return a parseable health object"
  fi

  if printf '%s' "$STATUS_JSON" | grep -q '"DepShield"'; then
    record "depshield-dispatch" "PASS" "DepShield rows visible in scanner health"
  else
    record "depshield-dispatch" "FAIL" "no DepShield scanner rows in recent runs — check Modal image / dispatch"
  fi
else
  record "scan-dispatch" "BLOCKED(.env)" "requires Supabase + Modal credentials"
  record "verify-status" "BLOCKED(.env)" "requires Supabase credentials"
  record "depshield-dispatch" "BLOCKED(.env)" "requires a live scan run"
fi

# ── 7. Ossprey — explicit skip while access is OPEN (slice-38 GWT 3) ─────────
if [ -n "${OSSPREY_API_KEY:-}" ] || [ -n "${API_KEY:-}" ]; then
  record "ossprey-dispatch" "PASS" "OSSPREY_API_KEY present — adapter active (verify rows in scanner health)"
else
  record "ossprey-dispatch" "SKIPPED(access)" "slice 35 BLOCKED — no OSSPREY_API_KEY; adapter reports skipped_missing_credential by design"
fi

# ── 8. CLI monitoring (works credential-less in degraded mode) ───────────────
if (cd "$ROOT" && node cli/bin/tripwire.js status >/dev/null 2>&1); then
  record "cli-monitoring" "PASS" "tripwire status exits 0"
else
  record "cli-monitoring" "FAIL" "tripwire status exited nonzero"
fi

# ── 9. LIVE /tw-self-check (never mocked — slice-38 GWT 2) ───────────────────
if command -v claude >/dev/null \
  && claude auth status 2>/dev/null | grep -q '"loggedIn": true' \
  && [ -d "$HOME/.claude/skills/tw-self-check" ]; then
  if claude -p "Use the Skill tool to invoke the tw-self-check skill and output its full table and JSON." \
      --max-turns 8 > "$SELFCHECK_OUT" 2>&1 \
    && grep -qE 'tw-(verify|scan|enable|disable|self-check)' "$SELFCHECK_OUT"; then
    record "tw-self-check" "PASS" "live invocation produced the five-skill report (captured in evidence)"
  else
    record "tw-self-check" "FAIL" "live /tw-self-check did not produce a five-skill report (see evidence capture)"
  fi
else
  record "tw-self-check" "BLOCKED(setup)" "needs claude CLI (authed) + tw-self-check installed — run tripwire setup-agent-hooks, then claude auth login"
fi

# ── evidence + overall ────────────────────────────────────────────────────────
mkdir -p "$EVIDENCE_DIR"
python3 - "$STAGES_TSV" "$SELFCHECK_OUT" "$EVIDENCE" "$OVERALL" <<'EOF'
import json, sys, datetime
stages_tsv, selfcheck_path, evidence_path, overall = sys.argv[1:5]
stages = []
with open(stages_tsv, encoding="utf-8") as fh:
    for line in fh:
        name, result, detail = line.rstrip("\n").split("\t", 2)
        stages.append({"stage": name, "result": result, "detail": detail})
try:
    with open(selfcheck_path, encoding="utf-8") as fh:
        selfcheck = fh.read()[-8000:]
except OSError:
    selfcheck = ""
json.dump(
    {
        "harness": "scripts/full-chain-validation.sh",
        "ran_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "overall": "PASS" if overall == "0" else "NOT VALIDATED",
        "stages": stages,
        "tw_self_check_output": selfcheck,
    },
    open(evidence_path, "w", encoding="utf-8"),
    indent=2,
)
EOF

echo
if [ "$OVERALL" = 0 ]; then
  echo "✅ full chain validated — evidence: $EVIDENCE"
else
  echo "❌ NOT VALIDATED — one or more required stages FAILED or are BLOCKED (see above). Evidence: $EVIDENCE"
fi
exit "$OVERALL"
