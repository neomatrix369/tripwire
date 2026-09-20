#!/usr/bin/env bash
# Optional LIVE probe: build chrome artefacts, then try Chromium --load-extension
# and/or web-ext under Xvfb inside Docker. Does NOT replace smoke.sh (build-only).
#
# Usage:
#   ./live-try.sh
#   WTM_LIVE_TIMEOUT=60 ./live-try.sh
#
# Exit 0 = at least PARTIAL LIVE (extension loaded / web-ext started).
# Exit 2 = BUILD PASS only (browser/web-ext path failed).
# Exit 1 = hard failure (image/build missing).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAB_ROOT="$(cd "${HERE}/.." && pwd)"
# shellcheck source=../shared/docker-smoke.sh
source "${LAB_ROOT}/shared/docker-smoke.sh"

IMAGE="${WTM_IMAGE_TAG:-who-targets-me:lab}"
TIMEOUT_SEC="${WTM_LIVE_TIMEOUT:-75}"
LOG_DIR="${HERE}/smoke-logs"
mkdir -p "${LOG_DIR}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG="${LOG_DIR}/live-try-${STAMP}.log"

echo "who-targets-me live-try — image=${IMAGE} timeout=${TIMEOUT_SEC}s"
echo "log: ${LOG}"

lab_docker_build "${IMAGE}" "${HERE}"

# Run inside container: apt install browser deps, build chrome, probe load paths.
# shellcheck disable=SC2016
docker run --rm \
  -e http_proxy="${http_proxy:-}" \
  -e https_proxy="${https_proxy:-}" \
  -e HTTP_PROXY="${HTTP_PROXY:-}" \
  -e HTTPS_PROXY="${HTTPS_PROXY:-}" \
  -e "WTM_LIVE_TIMEOUT=${TIMEOUT_SEC}" \
  --entrypoint bash \
  "${IMAGE}" \
  -lc '
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
TIMEOUT_SEC="${WTM_LIVE_TIMEOUT:-75}"

echo "==> [live] apt install chromium + xvfb + fonts"
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  chromium \
  xvfb \
  xauth \
  fonts-liberation \
  ca-certificates \
  >/tmp/apt-live.log 2>&1 || {
  echo "FAIL: apt install chromium/xvfb"
  tail -40 /tmp/apt-live.log
  exit 1
}

CHROME_BIN="$(command -v chromium || command -v chromium-browser || true)"
if [[ -z "${CHROME_BIN}" ]]; then
  echo "FAIL: no chromium binary after apt"
  exit 1
fi
echo "OK  chromium=${CHROME_BIN} ($("${CHROME_BIN}" --version 2>/dev/null | head -1))"

echo "==> [live] build chrome only"
export WTM_BUILD_TARGET=chrome
/usr/local/bin/wtm-entrypoint.sh
test -f /app/build/chrome/manifest.json

PARTIAL=0
WEBEXT_STARTED=0
LOAD_EXT_OK=0

# --- Probe A: Chromium --load-extension (headless new) ---
echo "==> [live] probe A: chromium --load-extension (headless)"
EXT_DIR=/app/build/chrome
# Use a disposable profile; dump-dom proves process started with extension flag.
set +e
timeout "${TIMEOUT_SEC}" "${CHROME_BIN}" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --user-data-dir=/tmp/wtm-chrome-profile \
  --disable-extensions-except="${EXT_DIR}" \
  --load-extension="${EXT_DIR}" \
  --dump-dom \
  about:blank \
  >/tmp/wtm-chrome-dump.html 2>/tmp/wtm-chrome-a.err
RC_A=$?
set -e
if [[ ${RC_A} -eq 0 ]] && [[ -s /tmp/wtm-chrome-dump.html ]]; then
  echo "OK  probe A: chromium exited 0 with dump-dom (extension flags accepted)"
  LOAD_EXT_OK=1
  PARTIAL=1
else
  echo "FAIL probe A: rc=${RC_A}"
  tail -30 /tmp/wtm-chrome-a.err || true
fi

# --- Probe B: web-ext run under Xvfb ---
echo "==> [live] probe B: web-ext run (xvfb, timeout ${TIMEOUT_SEC}s)"
cd /app
set +e
# Capture early stdout; success = web-ext announces install / browser started.
timeout "${TIMEOUT_SEC}" xvfb-run -a -s "-screen 0 1280x720x24" \
  ./node_modules/.bin/web-ext run \
    --target chromium \
    --source-dir ./build/chrome/ \
    --chromium-binary="${CHROME_BIN}" \
    --arg="--no-sandbox" \
    --arg="--disable-gpu" \
    --arg="--disable-dev-shm-usage" \
    --start-url about:blank \
  >/tmp/wtm-webext.out 2>&1
RC_B=$?
set -e
# timeout → 124 is expected once browser stays up.
if grep -Eiq "Installed .* as temporary add-on|The extension will reload|Running web extension|Launching|Extension loaded|Last extension reload" /tmp/wtm-webext.out; then
  echo "OK  probe B: web-ext started / extension installed (rc=${RC_B}, often 124 on timeout)"
  WEBEXT_STARTED=1
  PARTIAL=1
else
  echo "FAIL probe B: no web-ext start markers (rc=${RC_B})"
  tail -50 /tmp/wtm-webext.out || true
fi

# --- Probe C: Facebook session (always HITL in automated sandbox) ---
echo "==> [live] probe C: Facebook login"
echo "HITL: FB credentials / interactive login not automated in this lab (expected)."

echo ""
echo "WTM_LIVE_SUMMARY load_ext=${LOAD_EXT_OK} webext=${WEBEXT_STARTED} partial=${PARTIAL}"
if [[ "${PARTIAL}" -eq 1 ]]; then
  echo "WTM_PARTIAL_LIVE"
  exit 0
fi
echo "WTM_BUILD_ONLY (browser probes failed)"
exit 2
' 2>&1 | tee "${LOG}"

echo ""
echo "PASS  live-try finished — see ${LOG}"
