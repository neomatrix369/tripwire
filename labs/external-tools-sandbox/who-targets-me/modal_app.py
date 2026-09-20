"""Optional Modal remote build for Who-Targets-Me.

Prefer local Docker for this tool (browser extension; web-ext needs a host
browser). Modal is useful when you only need Linux npm build artefacts without
a local Node 16 toolchain.

Usage (from this directory, after ``modal setup``)::

    modal run modal_app.py
    modal run modal_app.py --targets chrome
    modal run modal_app.py --targets firefox

Secrets: none required for build-only smoke. Do not put Facebook credentials
in Modal secrets for this lab path — login remains HITL.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

try:
    import modal
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "modal package missing. Install with: pip install modal\n"
        "See docs/user-guide/modal-setup.md"
    ) from exc

# Prefer inlined Node 20 image (lab Docker uses bookworm/20; upstream
# .node-version is v16 — webpack 5 builds cleanly on 20 with legacy OpenSSL).
_NODE_VERSION = "20.18.1"
_REPO = "https://github.com/WhoTargetsMe/Who-Targets-Me.git"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl", "ca-certificates", "xz-utils")
    .run_commands(
        f"curl -fsSL https://nodejs.org/dist/v{_NODE_VERSION}/"
        f"node-v{_NODE_VERSION}-linux-x64.tar.xz "
        f"| tar -xJ -C /usr/local --strip-components=1",
        "node --version && npm --version",
        f"git clone --depth 1 {_REPO} /opt/wtm",
        "cd /opt/wtm && npm ci",
    )
    .env({"NODE_OPTIONS": "--openssl-legacy-provider"})
)

app = modal.App("ext-tools-who-targets-me", image=image)


def _build_targets(targets: str) -> list[str]:
    t = (targets or "all").strip().lower()
    if t == "chrome":
        return ["chrome"]
    if t == "firefox":
        return ["firefox"]
    if t == "all":
        return ["chrome", "firefox"]
    raise ValueError(f"unknown targets={targets!r}; use chrome|firefox|all")


@app.function(timeout=1200, cpu=2, memory=2048)
def build_extension(targets: str = "all") -> str:
    """Run webpack builds; return a short success summary."""
    browsers = _build_targets(targets)
    cwd = Path("/opt/wtm")
    lines: list[str] = []
    for browser in browsers:
        subprocess.check_call(
            ["npm", "run", f"build:{browser}"],
            cwd=cwd,
        )
        manifest = cwd / "build" / browser / "manifest.json"
        if not manifest.is_file():
            raise RuntimeError(f"missing {manifest}")
        lines.append(f"OK {manifest}")
    lines.append(f"WTM_BUILD_OK target={targets}")
    lines.append("NOTE: web-ext / Facebook login is HITL — not required.")
    return "\n".join(lines)


@app.local_entrypoint()
def main(targets: str = "all") -> None:
    """CLI: ``modal run modal_app.py --targets all``."""
    try:
        summary = build_extension.remote(targets)
    except Exception as exc:  # noqa: BLE001 — surface Modal/remote errors clearly
        print(f"FAIL who-targets-me modal build: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print(summary)
    print("PASS  who-targets-me (modal) — npm build artefacts OK")
