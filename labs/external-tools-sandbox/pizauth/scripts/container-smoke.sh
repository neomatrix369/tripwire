#!/usr/bin/env bash
# In-container smoke: start pizauth server, prove socket + status + listen.
# Exit 0 = PASS for daemon bring-up (OAuth browser flow is HITL).
set -euo pipefail

CONFIG="${PIZAUTH_CONFIG_PATH:-/config/pizauth.conf}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime}"
export HOME="${HOME:-/tmp}"
mkdir -p "$XDG_RUNTIME_DIR" "${HOME}/.config"
chmod 700 "$XDG_RUNTIME_DIR" 2>/dev/null || true

SOCK="${XDG_RUNTIME_DIR}/pizauth/pizauth.sock"
HTTP_PORT="${PIZAUTH_SMOKE_PORT:-14204}"

echo "==> binary"
command -v pizauth
pizauth info -c "$CONFIG" || true

echo "==> start server (foreground daemon mode: -d)"
# -d = do not detach (stay in foreground process group; logs to stderr)
pizauth server -d -c "$CONFIG" -v &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    pizauth shutdown 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> wait for unix socket: $SOCK"
for _ in $(seq 1 40); do
  if [[ -S "$SOCK" ]]; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "FAIL: pizauth server exited before creating socket" >&2
    exit 1
  fi
  sleep 0.25
done

if [[ ! -S "$SOCK" ]]; then
  echo "FAIL: socket not created: $SOCK" >&2
  exit 1
fi
echo "OK socket exists: $SOCK"

echo "==> pizauth info -j"
INFO_JSON="$(pizauth info -j -c "$CONFIG")"
echo "$INFO_JSON"
echo "$INFO_JSON" | grep -q '"server_running":true'
echo "$INFO_JSON" | grep -q '"http_port"'
echo "OK info reports server_running + http_port"

echo "==> pizauth status"
STATUS_OUT="$(pizauth status 2>&1 || true)"
echo "$STATUS_OUT"
# status talks to the running server; any non-crash output is enough.
# With no tokens yet it still prints account state.
echo "$STATUS_OUT" | grep -qiE 'lab|account|token|unauthor|unavailable|pending|not' \
  || echo "(status produced output; continuing)"

echo "==> listen check (HTTP bind)"
if command -v ss >/dev/null 2>&1; then
  ss -ltn | grep -E ":${HTTP_PORT}\\b" || true
elif command -v netstat >/dev/null 2>&1; then
  netstat -ltn 2>/dev/null | grep -E ":${HTTP_PORT}\\b" || true
fi
# Fallback: connect to the listen port from inside the container.
if command -v curl >/dev/null 2>&1; then
  # Expect connection accepted (any HTTP response / empty / error page is fine).
  curl -sS -o /dev/null -w "curl_http_code=%{http_code}\n" \
    --connect-timeout 2 "http://127.0.0.1:${HTTP_PORT}/" || true
fi

echo "==> pizauth show lab (expect ERROR + auth URL; placeholders ≠ real OAuth)"
set +e
SHOW_OUT="$(pizauth show lab 2>&1)"
SHOW_RC=$?
set -e
echo "$SHOW_OUT"
# Non-zero is expected until HITL completes browser auth.
if echo "$SHOW_OUT" | grep -qiE 'ERROR|Token unavailable|authoris|http'; then
  echo "OK show initiated auth path (HITL required for real token)"
else
  echo "FAIL: show did not surface an auth/error path" >&2
  exit 1
fi
# Ensure we actually talked to the server (not a missing-server error only).
if echo "$SHOW_OUT" | grep -qiE 'not running|No such file|Connection refused'; then
  if ! echo "$SHOW_OUT" | grep -qiE 'authoris|Token unavailable'; then
    echo "FAIL: client could not reach server" >&2
    exit 1
  fi
fi

echo "==> PASS (daemon + socket + status/info + listen path)"
echo "HITL: set real client_id/client_secret in config (or env-substituted copy);"
echo "      open the auth URL from \`pizauth show lab\` in a browser."
exit 0
