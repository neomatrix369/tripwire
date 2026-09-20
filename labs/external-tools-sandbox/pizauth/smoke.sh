#!/usr/bin/env bash
# Host-side smoke for pizauth lab.
# Runtime preference: EXT_TOOLS_RUNTIME=modal|docker|auto (default auto → docker).
# Exit 0 = PASS (daemon bring-up). Real OAuth is HITL.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

RUNTIME="${EXT_TOOLS_RUNTIME:-auto}"
IMAGE_TAG="${PIZAUTH_IMAGE_TAG:-ext-tools-pizauth:lab}"
SHARED="$DIR/../shared/docker-smoke.sh"

pass_banner() {
  echo ""
  echo "RESULT: PASS"
  echo "evidence: $1"
}

fail_banner() {
  echo ""
  echo "RESULT: FAIL"
  echo "reason: $1" >&2
  exit 1
}

partial_banner() {
  echo ""
  echo "RESULT: PARTIAL"
  echo "evidence: $1"
  exit 0
}

run_docker_smoke() {
  echo "==> Docker smoke (build + container-smoke.sh)"
  if [[ -f "$SHARED" ]]; then
    # shellcheck source=/dev/null
    source "$SHARED"
    lab_docker_build "$IMAGE_TAG" "$DIR" || fail_banner "docker build failed"
  else
    docker build -t "$IMAGE_TAG" "$DIR" || fail_banner "docker build failed"
  fi

  docker run --rm \
    -e http_proxy="${http_proxy:-}" \
    -e https_proxy="${https_proxy:-}" \
    -e HTTP_PROXY="${HTTP_PROXY:-}" \
    -e HTTPS_PROXY="${HTTPS_PROXY:-}" \
    -e PIZAUTH_CONFIG_PATH=/config/pizauth.conf \
    -e XDG_RUNTIME_DIR=/tmp/runtime \
    "$IMAGE_TAG" \
    /usr/local/bin/container-smoke.sh
}

run_modal_smoke() {
  echo "==> Modal smoke (modal run ./modal_app.py)"
  if ! command -v modal >/dev/null 2>&1; then
    fail_banner "modal CLI not found (pip install modal)"
  fi
  modal run "$DIR/modal_app.py"
}

case "$RUNTIME" in
  docker)
    run_docker_smoke && pass_banner "docker image $IMAGE_TAG container-smoke"
    ;;
  modal)
    run_modal_smoke && pass_banner "modal run pizauth/modal_app.py"
    ;;
  auto|*)
    # Prefer Docker for unix-socket daemon fidelity; Modal is optional alternate.
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
      run_docker_smoke && pass_banner "docker image $IMAGE_TAG container-smoke"
    elif command -v modal >/dev/null 2>&1; then
      echo "Docker unavailable — falling back to Modal"
      run_modal_smoke && pass_banner "modal run pizauth/modal_app.py (docker unavailable)"
    else
      fail_banner "neither Docker nor Modal is usable"
    fi
    ;;
esac
