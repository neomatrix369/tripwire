#!/usr/bin/env bash
# Tripwire PreToolUse hook handler (plan §4.3).
#
# Contract: ALWAYS exit 0 with exactly one decision JSON line on stdout.
# In Claude Code a plain non-zero exit from a PreToolUse hook is a
# NON-blocking error (the tool call proceeds), so every failure mode here —
# crash, hang, missing config, empty delegate output — must become an
# explicit DENY decision printed to stdout (fail closed), never a bare exit.
#
# Installed to ~/.tripwire/hooks/pre-tool-use.sh by `tripwire setup-agent-hooks`.
# Source of truth: agent-hooks/hooks/pre-tool-use.sh in the tripwire repo.
#
# Compatible with macOS /bin/bash 3.2: no mapfile/readarray, no GNU timeout.
set -euo pipefail

CONFIG_FILE="${HOME}/.tripwire/config.json"
ENTRY_SHIM="${HOME}/.tripwire/hooks/_guard_entry.py"

DECISION_EMITTED=0
STDIN_FILE=""
OUT_FILE=""

# ── Decision emission (§4.3.4): one shared emitter, dual-shape JSON ──────────
# Modern field (hookSpecificOutput.permissionDecision) wins on current Claude
# Code; legacy decision/reason kept for older versions.
_emit_decision() {
  # $1 = allow|deny, $2 = deny reason (JSON-escaped safely via python3).
  DECISION_EMITTED=1
  if [ "$1" = "allow" ]; then
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"},"decision":"approve"}'
    return 0
  fi
  local reason_json
  reason_json="$(printf '%s' "${2:-tripwire guard error — fail closed}" \
    | python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null)" \
    || reason_json='"tripwire guard error — fail closed"'
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s},"decision":"block","reason":%s}\n' \
    "$reason_json" "$reason_json"
}

emit_allow() { _emit_decision allow; }
emit_deny() { _emit_decision deny "$1"; }

cleanup_tmp() {
  if [ -n "$STDIN_FILE" ]; then rm -f "$STDIN_FILE" 2>/dev/null || true; fi
  if [ -n "$OUT_FILE" ]; then rm -f "$OUT_FILE" 2>/dev/null || true; fi
}

# ── Failure policy (§4.3.5): if we reach exit without a decision, deny. ──────
finish() {
  if [ "$DECISION_EMITTED" -ne 1 ]; then
    emit_deny "tripwire guard error — fail closed (unexpected handler failure; retry, run /tw-verify, or set \"enable\": false in ~/.tripwire/config.json to bypass)"
  fi
  cleanup_tmp
  exit 0
}
trap finish EXIT
trap finish ERR

# ── 1. Config (§4.3.1 / §3): parseable enable=false ⇒ allow; missing or ──────
#      unparseable ⇒ deny (tamper signal — setup writes config before hooks).
#      Parsed with python3 (no jq dependency).
CONFIG_LINES="$(python3 -c '
import json, sys

with open(sys.argv[1], encoding="utf-8") as f:
    cfg = json.load(f)
print("false" if cfg.get("enable", True) is False else "true")
print(cfg.get("env_file", "") or "")
print(cfg.get("repo_root", "") or "")
print(cfg.get("uv_bin", "") or "")
' "$CONFIG_FILE" 2>/dev/null)" || CONFIG_LINES=""

if [ -z "$CONFIG_LINES" ]; then
  emit_deny 'tripwire config missing/corrupt (~/.tripwire/config.json) — re-run `tripwire setup-agent-hooks`, or set "enable": false in that file by hand to bypass'
  exit 0
fi

CFG_ENABLE="$(printf '%s\n' "$CONFIG_LINES" | sed -n '1p')"
CFG_ENV_FILE="$(printf '%s\n' "$CONFIG_LINES" | sed -n '2p')"
CFG_REPO_ROOT="$(printf '%s\n' "$CONFIG_LINES" | sed -n '3p')"
CFG_UV_BIN="$(printf '%s\n' "$CONFIG_LINES" | sed -n '4p')"

if [ "$CFG_ENABLE" = "false" ]; then
  emit_allow
  exit 0
fi

# ── 2. Source Supabase credentials from env_file (check-supabase.sh pattern) ─
if [ -n "$CFG_ENV_FILE" ] && [ -f "$CFG_ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$CFG_ENV_FILE"
  set +a
fi

UV_BIN="${CFG_UV_BIN:-uv}"

# ── 3. Delegate stdin to the guard entry under a portable 8s watchdog ────────
#      (macOS has no GNU timeout; the hook-level timeout killing us would fail
#      OPEN, so the hang must become OUR trapped deny well before it).
STDIN_FILE="$(mktemp "${TMPDIR:-/tmp}/tripwire-hook-stdin.XXXXXX")"
OUT_FILE="$(mktemp "${TMPDIR:-/tmp}/tripwire-hook-out.XXXXXX")"
cat > "$STDIN_FILE"

# ── 2b. Fast-path ordinary Bash (no skills-path touch) ───────────────────────
#      Matcher includes Bash so …/skills/<name>/install.sh is gated, but most
#      Bash calls are unrelated. Skip the uv/Supabase path when neither the
#      command nor the payload cwd references a skills locus.
BASH_FAST="$(python3 -c '
import json, os, sys

with open(sys.argv[1], encoding="utf-8") as f:
    payload = json.load(f)
if not isinstance(payload, dict):
    print("check")
    raise SystemExit(0)
if (payload.get("tool_name") or "") != "Bash":
    print("check")
    raise SystemExit(0)
tool_input = payload.get("tool_input")
cmd = ""
if isinstance(tool_input, dict) and isinstance(tool_input.get("command"), str):
    cmd = tool_input["command"]
cwd = payload.get("cwd") if isinstance(payload.get("cwd"), str) else ""
home_skills = os.path.join(os.path.expanduser("~"), ".claude", "skills")
markers = (
    "/.claude/skills/",
    "/.claude/skills",
    "~/.claude/skills",
    home_skills,
)
blob = cmd + "\n" + cwd
if any(m in blob for m in markers):
    print("check")
else:
    print("allow")
' "$STDIN_FILE" 2>/dev/null)" || BASH_FAST="check"

if [ "$BASH_FAST" = "allow" ]; then
  emit_allow
  exit 0
fi

"$UV_BIN" run --project "$CFG_REPO_ROOT" --extra guard python "$ENTRY_SHIM" \
  < "$STDIN_FILE" > "$OUT_FILE" &
DELEGATE_PID=$!

# Wall-clock 8s budget (SECONDS is bash-3.2-safe); 0.2s poll interval. A tick
# counter alone drifts past 8s real time because each sleep spawn adds overhead.
WATCHDOG_START=$SECONDS
while [ $((SECONDS - WATCHDOG_START)) -lt 8 ]; do
  if ! kill -0 "$DELEGATE_PID" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

if kill -0 "$DELEGATE_PID" 2>/dev/null; then
  # Signal hygiene: TERM while the child is still in the job table (the
  # zombie hold prevents PID reuse), THEN disown; a short grace loop, then
  # KILL if the delegate ignored TERM (e.g. blocked in a C-level call).
  kill -TERM "$DELEGATE_PID" 2>/dev/null || true
  disown "$DELEGATE_PID" 2>/dev/null || true
  for _ in 1 2 3 4 5; do
    kill -0 "$DELEGATE_PID" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 "$DELEGATE_PID" 2>/dev/null; then
    kill -KILL "$DELEGATE_PID" 2>/dev/null || true
  fi
  emit_deny 'guard timed out — fail closed (no decision within 8s; retry, check network/Supabase, or set "enable": false in ~/.tripwire/config.json to bypass)'
  exit 0
fi
wait "$DELEGATE_PID" 2>/dev/null || true

# ── 4. Validate the delegate decision before pass-through; else deny ─────────
#      The contract is "exactly one decision JSON line" — nonempty garbage
#      (a stray print, a wrapper banner) would be unparseable to Claude Code,
#      which treats "no decision" as ALLOW. Enforce the contract here.
DELEGATE_OUT="$(cat "$OUT_FILE" 2>/dev/null || true)"
if [ -n "${DELEGATE_OUT//[[:space:]]/}" ]; then
  if printf '%s' "$DELEGATE_OUT" | python3 -c '
import json, sys

try:
    obj = json.loads(sys.stdin.read())
except ValueError:
    sys.exit(1)
if not isinstance(obj, dict):
    sys.exit(1)
hso = obj.get("hookSpecificOutput")
if isinstance(hso, dict) and hso.get("permissionDecision"):
    sys.exit(0)
sys.exit(0 if obj.get("decision") else 1)
' >/dev/null 2>&1; then
    DECISION_EMITTED=1
    printf '%s\n' "$DELEGATE_OUT"
    exit 0
  fi
  emit_deny 'guard produced invalid decision output — fail closed (delegate stdout was not a decision JSON; re-run `tripwire setup-agent-hooks`, or set "enable": false in ~/.tripwire/config.json to bypass)'
  exit 0
fi

emit_deny 'guard produced no decision — fail closed (guard entry exited without output; re-run `tripwire setup-agent-hooks`, or set "enable": false in ~/.tripwire/config.json to bypass)'
exit 0
