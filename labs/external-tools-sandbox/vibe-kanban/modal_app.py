"""Optional Modal entry for vibe-kanban (lab-only).

Tripwire Modal auth exists (profile + docs/user-guide/modal-setup.md), but as of
2026-09-20 ``modal app list`` returns HTTP 403 for this workspace — so the
verified smoke path is **local Docker** (see ``smoke.sh`` / ``Dockerfile``).

When Modal API access works again::

    modal run labs/external-tools-sandbox/vibe-kanban/modal_app.py

This app only proves the image can fetch the CDN binary and print a version
banner; it does not expose a durable HTTP tunnel (use Docker Compose for that).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_LAB_ROOT = Path(__file__).resolve().parents[1]
if str(_LAB_ROOT) not in sys.path:
    sys.path.insert(0, str(_LAB_ROOT))

import modal  # noqa: E402
from shared.modal_image import LAB_APP_PREFIX, node_base  # noqa: E402

VK_BINARY_TAG = "v0.1.44-20260424091429"
VK_R2_BASE = "https://npm-cdn.vibekanban.com"

app = modal.App(f"{LAB_APP_PREFIX}-vibe-kanban")

image = node_base(node_version="20.19.0").run_commands(
    "apt-get update && apt-get install -y --no-install-recommends unzip "
    "&& rm -rf /var/lib/apt/lists/*",
    f"curl -fsSL -o /tmp/vibe-kanban.zip "
    f"{VK_R2_BASE}/binaries/{VK_BINARY_TAG}/linux-x64/vibe-kanban.zip",
    "unzip -o /tmp/vibe-kanban.zip -d /usr/local/bin "
    "&& chmod +x /usr/local/bin/vibe-kanban && rm -f /tmp/vibe-kanban.zip",
)


@app.function(image=image, timeout=120)
def binary_smoke() -> str:
    """Run the binary briefly; capture startup log line as proof."""
    env = {
        "HOST": "127.0.0.1",
        "PORT": "3000",
        "HOME": "/tmp/vk-home",
        "PATH": "/usr/local/bin:/usr/bin:/bin",
    }
    try:
        proc = subprocess.run(
            ["/usr/local/bin/vibe-kanban"],
            capture_output=True,
            text=True,
            timeout=8,
            env=env,
            check=False,
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        return (out[:2000] if out.strip() else f"exit={proc.returncode}")
    except subprocess.TimeoutExpired as exc:
        # Long-lived server — timeout is the expected stop condition.
        out = (exc.stdout or "") + (exc.stderr or "")
        if isinstance(out, bytes):
            out = out.decode("utf-8", errors="replace")
        return (out[:2000] if out.strip() else "timeout with empty output")


@app.local_entrypoint()
def main() -> None:
    print(binary_smoke.remote())
