"""Modal one-shot smoke for pizauth (OAuth2 token daemon).

Upstream: https://github.com/ltratt/pizauth/

Builds pizauth from git inside a Modal Linux image, starts ``pizauth server -d``
with the lab placeholder config, and asserts socket + ``info``/``status`` + show
auth path. Real OAuth browser login remains HITL (no secrets in git).

Usage::

    modal run labs/external-tools-sandbox/pizauth/modal_app.py

Does not deploy tripwire-scan and does not read product Modal secrets.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import modal
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "modal package missing. Install with: pip install modal\n"
        "See docs/user-guide/modal-setup.md"
    ) from exc

_HERE = Path(__file__).resolve().parent
_LAB_ROOT = _HERE.parent
if str(_LAB_ROOT) not in sys.path:
    sys.path.insert(0, str(_LAB_ROOT))

try:
    from shared.modal_image import LAB_APP_PREFIX, rust_base
except ImportError:  # pragma: no cover — standalone modal run path
    LAB_APP_PREFIX = "ext-tools"

    def rust_base(*, python_version: str = "3.11"):
        return (
            modal.Image.debian_slim(python_version=python_version)
            .apt_install(
                "git",
                "curl",
                "ca-certificates",
                "build-essential",
                "pkg-config",
            )
            .run_commands(
                "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs "
                "| sh -s -- -y --default-toolchain stable",
            )
            .env({"PATH": "/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin"})
        )


_PIZAUTH_REF = "pizauth-1.1.0"

image = (
    rust_base()
    .run_commands(
        f"git clone --depth 1 --branch {_PIZAUTH_REF} "
        "https://github.com/ltratt/pizauth.git /opt/pizauth",
        "cd /opt/pizauth && cargo build --release "
        "&& install -m 755 target/release/pizauth /usr/local/bin/pizauth",
        "mkdir -p /config /tmp/runtime",
    )
    .add_local_file(
        str(_HERE / "config" / "pizauth.conf"),
        remote_path="/config/pizauth.conf",
        copy=True,
    )
    .add_local_file(
        str(_HERE / "scripts" / "container-smoke.sh"),
        remote_path="/usr/local/bin/container-smoke.sh",
        copy=True,
    )
    .run_commands("chmod 755 /usr/local/bin/container-smoke.sh")
)

app = modal.App(f"{LAB_APP_PREFIX}-pizauth")


@app.function(image=image, timeout=900)
def smoke() -> str:
    """Run container-smoke.sh inside Modal; return stdout summary."""
    import os
    import subprocess

    env = {
        **os.environ,
        "PATH": "/usr/local/bin:/root/.cargo/bin:/usr/bin:/bin",
        "HOME": "/tmp",
        "XDG_RUNTIME_DIR": "/tmp/runtime",
        "PIZAUTH_CONFIG_PATH": "/config/pizauth.conf",
    }
    proc = subprocess.run(
        ["bash", "/usr/local/bin/container-smoke.sh"],
        check=False,
        capture_output=True,
        text=True,
        env=env,
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    print(out)
    if proc.returncode != 0:
        raise RuntimeError(f"pizauth Modal smoke failed rc={proc.returncode}")
    return "PASS: pizauth Modal smoke (socket + status/info + show auth path)"


@app.local_entrypoint()
def main() -> None:
    result = smoke.remote()
    print(result)
