#!/usr/bin/env bash
# snare lab smoke — Docker preferred (Modal API 403 in this environment).
# Leaves a durable container listening when PASS.
# Exit 0 on PASS.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../shared/docker-smoke.sh
source "$ROOT/../shared/docker-smoke.sh"

EVDIR="$ROOT/.smoke-evidence"
mkdir -p "$EVDIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_JSON="$EVDIR/smoke-${STAMP}.json"
IMAGE="${SNARE_IMAGE:-ext-tools-snare:lab}"
NAME="${SNARE_CONTAINER_NAME:-ext-tools-snare-live}"
HOST_PORT="${SNARE_HOST_PORT:-18000}"
TRIES="$ROOT/TRIES.md"

log_try() {
  {
    echo ""
    echo "## Try: $1 — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo '```'
    echo "\$ $2"
    echo "$3"
    echo '```'
  } >> "$TRIES"
}

echo "==> snare smoke (Docker live daemon)"

if ! command -v docker >/dev/null 2>&1; then
  echo "FAIL: docker not found" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: docker daemon not reachable" >&2
  exit 1
fi

echo "==> build ${IMAGE}"
lab_docker_build "$IMAGE" "$ROOT"
log_try "docker-build" "docker build -t ${IMAGE} ." "OK"

# Durable live container (restart unless-stopped).
# Port lock: Graphiti=:8000; snare lab host default :18000 (maps HOST_PORT:8000).
if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "==> reusing running ${NAME}"
else
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  echo "==> starting ${NAME} on host port ${HOST_PORT}"
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "${HOST_PORT}:8000" \
    "$IMAGE"
fi
log_try "docker-run-live" "docker run -d --name ${NAME} -p ${HOST_PORT}:8000" "OK"

python3 - "$HOST_PORT" "$EVIDENCE_JSON" "$NAME" <<'PY'
import hashlib, hmac, json, socket, sys, time
from pathlib import Path

port = int(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]
body = (
    "{\n"
    ' "repository": {\n'
    ' "owner": {\n'
    ' "login": "testuser"\n'
    " },\n"
    ' "name": "testrepo"\n'
    " }\n"
    "}"
).encode()
sig = hmac.new(b"secretsecret", body, hashlib.sha256).hexdigest()

def post(event, signature):
    headers = [
        "POST /payload HTTP/1.1",
        f"Host: 127.0.0.1:{port}",
        f"Content-Length: {len(body)}",
        "X-GitHub-Delivery: 72d3162e-cc78-11e3-81ab-4c9367dc0958",
        f"X-Hub-Signature-256: sha256={signature}",
        "User-Agent: GitHub-Hookshot/lab-smoke",
        "Content-Type: application/json",
        f"X-GitHub-Event: {event}",
        "X-GitHub-Hook-ID: 292430182",
        "X-GitHub-Hook-Installation-Target-ID: 79929171",
        "X-GitHub-Hook-Installation-Target-Type: repository",
        "",
        "",
    ]
    payload = "\r\n".join(headers[:-1]).encode("ascii") + b"\r\n" + body
    with socket.create_connection(("127.0.0.1", port), timeout=5) as s:
        s.sendall(payload)
        s.settimeout(5)
        data = b""
        while True:
            try:
                chunk = s.recv(4096)
            except socket.timeout:
                break
            if not chunk:
                break
            data += chunk
            if b"\r\n\r\n" in data:
                break
    return data.decode("latin-1", errors="replace")

deadline = time.time() + 45
while time.time() < deadline:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            break
    except OSError:
        time.sleep(0.3)
else:
    ev = {"status": "FAIL", "error": f"timeout waiting for :{port}", "runtime": "docker"}
    out.write_text(json.dumps(ev, indent=2) + "\n")
    print(json.dumps(ev, indent=2))
    sys.exit(1)

ping = post("ping", sig)
bad = post("issues", "0" * 64)
ev = {
    "runtime": "docker",
    "container": name,
    "host_port": port,
    "listen": "ok",
    "signature": f"sha256={sig}",
    "body_len": len(body),
    "ping_response_head": ping.split("\r\n", 1)[0],
    "ping_ok": ping.startswith("HTTP/1.1 200"),
    "bad_sig_response_head": bad.split("\r\n", 1)[0],
    "bad_sig_rejected": bad.startswith("HTTP/1.1 401"),
}
if ev["ping_ok"] and ev["bad_sig_rejected"]:
    ev["status"] = "PASS"
elif ev["ping_ok"]:
    ev["status"] = "PARTIAL"
else:
    ev["status"] = "FAIL"
out.write_text(json.dumps(ev, indent=2) + "\n")
print(json.dumps(ev, indent=2))
sys.exit(0 if ev["status"] == "PASS" else 1)
PY

echo "Evidence: ${EVIDENCE_JSON}"
echo "LIVE: http://127.0.0.1:${HOST_PORT}/  container=${NAME}"
echo "RESULT: PASS"
