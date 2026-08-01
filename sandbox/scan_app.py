"""Modal sandbox entrypoint. Deploy with: modal deploy sandbox/scan_app.py

Each scan_run gets its own ephemeral sandbox. Disk here is scratch only —
findings/logs are written directly to Supabase, never relayed through the CLI.
"""

import os
import shutil
import subprocess
from datetime import UTC, datetime

import modal
from scanners import run_all_scanners

app = modal.App("tripwire-scan")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "curl", "nodejs", "npm")
    .run_commands("curl -LsSf https://astral.sh/uv/install.sh | sh")
    .pip_install(
        "supabase",
        "cisco-ai-skill-scanner",
        "cisco-ai-mcp-scanner",
    )
)

TIMEOUT_SECONDS = (
    300  # hard sandbox-level timeout (spec Phase 1): kill whole sandbox, mark scan_run failed
)


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("tripwire-supabase"),
        modal.Secret.from_name("tripwire-scan-secrets"),
    ],
    timeout=TIMEOUT_SECONDS,
)
def scan_item(target: str, item_type: str, scan_run_id: str, item_id: str):
    import os

    from supabase import create_client

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    workdir = "/tmp/scan-target"
    try:
        _acquire_target(target, item_type, workdir)
        results = run_all_scanners(workdir=workdir, item_type=item_type, target=target)
    except (
        Exception
    ):  # acquisition or scanner-runner crash — whole run fails, never silently "complete"
        supabase.table("scan_runs").update(
            {"status": "failed", "completed_at": datetime.now(UTC).isoformat()}
        ).eq("id", scan_run_id).execute()
        supabase.rpc("tripwire_rollup_item", {"p_item_id": item_id}).execute()
        raise

    for finding in results["findings"]:
        supabase.table("findings").insert(
            {**finding, "scan_run_id": scan_run_id, "item_id": item_id}
        ).execute()
    for scanner_row in results["scanner_rows"]:
        supabase.table("scan_run_scanners").insert(
            {**scanner_row, "scan_run_id": scan_run_id}
        ).execute()
    if results["quality_score"] is not None:
        supabase.table("items").update({"quality_score": results["quality_score"]}).eq(
            "id", item_id
        ).execute()

    supabase.table("scan_runs").update(
        {
            "status": results["overall_status"],
            "completed_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", scan_run_id).execute()

    supabase.rpc("tripwire_rollup_item", {"p_item_id": item_id}).execute()

    # scratch disk teardown is implicit — the Modal sandbox itself is ephemeral and discarded here.


_CLONE_TIMEOUT = int(os.environ.get("TRIPWIRE_CLONE_TIMEOUT", 120))


def _is_git_url(target: str) -> bool:
    """True when *target* looks like a clonable git repository URL.

    Unambiguous schemes (git://, git@, ssh://) are always git.
    https:// is git (GitHub/GitLab/etc are the dominant case for Tripwire).
    http:// is only git when the path ends with .git — bare http:// is how
    MCP servers expose SSE/streamable-HTTP transport and must not be cloned.
    """
    if target.startswith(("git://", "git@", "ssh://")):
        return True
    if target.startswith("https://"):
        return True
    if target.startswith("http://") and target.rstrip("/").endswith(".git"):
        return True
    if target.rstrip("/").endswith(".git"):
        return True
    return False


def _acquire_target(target: str, item_type: str, workdir: str):
    """Dispatch on target shape to populate *workdir* with scannable content.

    • Git URL  → shallow clone (depth=1, single-branch).
    • Local path (directory on disk) → recursive copy.
    • Anything else (MCP server URL, stdio transport, etc.) → introspection-only:
      create an empty workdir and let scanners use *target* directly via protocol.

    Raises on clone / copy failure so scan_item marks the run as failed.
    """
    os.makedirs(workdir, exist_ok=True)

    if _is_git_url(target):
        _clone_repo(target, workdir)
        return

    if os.path.isdir(target):
        _copy_local(target, workdir)
        return

    # Introspection-only: empty workdir is intentional — scanners that need
    # source on disk will report not_applicable; protocol scanners use `target`.


def _clone_repo(url: str, workdir: str):
    result = subprocess.run(
        ["git", "clone", "--depth", "1", "--single-branch", url, workdir],
        capture_output=True,
        text=True,
        timeout=_CLONE_TIMEOUT,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git clone failed (exit {result.returncode}): {result.stderr[:500]}")


def _copy_local(src: str, workdir: str):
    shutil.copytree(src, workdir, dirs_exist_ok=True)
