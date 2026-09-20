"""Thin Modal Image helpers mirroring tripwire sandbox/scan_app.py patterns.

Siblings may import from here::

    from shared.modal_image import debian_base, LAB_APP_PREFIX

or copy the snippet into their tool-local ``modal_app.py`` if Modal's
deploy path makes cross-folder imports awkward.

Does not deploy tripwire-scan and does not touch product secrets.
"""

from __future__ import annotations

try:
    import modal
except ImportError as exc:  # pragma: no cover - operator must install modal
    raise SystemExit(
        "modal package missing. Install with: pip install modal\n"
        "See docs/user-guide/modal-setup.md"
    ) from exc

LAB_APP_PREFIX = "ext-tools"
LAB_SECRET_NAME = "external-tools-sandbox"


def debian_base(
    *,
    python_version: str = "3.11",
    apt: list[str] | None = None,
) -> modal.Image:
    """Debian slim image with common lab packages (git/curl/ca-certificates)."""
    packages = ["git", "curl", "ca-certificates"]
    if apt:
        packages = list(dict.fromkeys([*packages, *apt]))
    return modal.Image.debian_slim(python_version=python_version).apt_install(
        *packages
    )


def rust_base(*, python_version: str = "3.11") -> modal.Image:
    """Debian image with Rust toolchain for pizauth / snare style builds."""
    return (
        debian_base(python_version=python_version, apt=["build-essential", "pkg-config"])
        .run_commands(
            "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs "
            "| sh -s -- -y --default-toolchain stable",
            'echo \'export PATH="$HOME/.cargo/bin:$PATH"\' >> /root/.bashrc',
        )
        .env({"PATH": "/root/.cargo/bin:/usr/local/bin:/usr/bin:/bin"})
    )


def node_base(*, node_version: str = "20.18.1", python_version: str = "3.11") -> modal.Image:
    """Debian image with official Node tarball (same approach as scan_app.py)."""
    return debian_base(python_version=python_version, apt=["xz-utils"]).run_commands(
        f"curl -fsSL https://nodejs.org/dist/v{node_version}/"
        f"node-v{node_version}-linux-x64.tar.xz "
        f"| tar -xJ -C /usr/local --strip-components=1",
        "node --version && npm --version",
    )
