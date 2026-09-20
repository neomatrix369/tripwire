#!/usr/bin/env bash
# Shared docker build/run helpers for labs/external-tools-sandbox.
# Usage (from a tool dir or via smoke-all):
#   source "$(dirname "$0")/../shared/docker-smoke.sh"
#   lab_docker_build "my-image:dev" .
#   lab_docker_run "my-image:dev" -- healthcheck-cmd

set -euo pipefail

lab_docker_build() {
  local tag="${1:?image tag required}"
  local context="${2:-.}"
  shift 2 || true
  docker build -t "$tag" "$context" "$@"
}

lab_docker_run() {
  local tag="${1:?image tag required}"
  shift
  # Always --rm; forward proxy env if set (shell hygiene).
  docker run --rm \
    -e http_proxy="${http_proxy:-}" \
    -e https_proxy="${https_proxy:-}" \
    -e HTTP_PROXY="${HTTP_PROXY:-}" \
    -e HTTPS_PROXY="${HTTPS_PROXY:-}" \
    "$tag" "$@"
}

lab_compose_up() {
  local profile="${1:?compose profile required}"
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  (cd "$root" && docker compose --profile "$profile" up --build -d)
}

lab_compose_down() {
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  (cd "$root" && docker compose --profile all down --remove-orphans || true)
}
