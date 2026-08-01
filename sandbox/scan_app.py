"""Modal sandbox entrypoint. Deploy with: modal deploy sandbox/scan_app.py

Each scan_run gets its own ephemeral sandbox. Disk here is scratch only —
findings/logs are written directly to Supabase, never relayed through the CLI.
"""
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

TIMEOUT_SECONDS = 300  # hard sandbox-level timeout (spec Phase 1): kill whole sandbox, mark scan_run failed


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("tripwire-supabase"), modal.Secret.from_name("tripwire-scan-secrets")],
    timeout=TIMEOUT_SECONDS,
)
def scan_item(target: str, item_type: str, scan_run_id: str, item_id: str):
    import os
    from supabase import create_client

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    workdir = "/tmp/scan-target"
    try:
        _acquire_target(target, item_type, workdir)  # STUB: git clone / file copy / MCP introspection
        results = run_all_scanners(workdir=workdir, item_type=item_type, target=target)
    except Exception as exc:  # acquisition or scanner-runner crash — whole run fails, never silently "complete"
        supabase.table("scan_runs").update({"status": "failed", "completed_at": "now()"}).eq("id", scan_run_id).execute()
        supabase.rpc("tripwire_rollup_item", {"p_item_id": item_id}).execute()
        raise

    for finding in results["findings"]:
        supabase.table("findings").insert({**finding, "scan_run_id": scan_run_id, "item_id": item_id}).execute()
    for scanner_row in results["scanner_rows"]:
        supabase.table("scan_run_scanners").insert({**scanner_row, "scan_run_id": scan_run_id}).execute()
    if results["quality_score"] is not None:
        supabase.table("items").update({"quality_score": results["quality_score"]}).eq("id", item_id).execute()

    supabase.table("scan_runs").update({
        "status": results["overall_status"],
        "completed_at": "now()",
    }).eq("id", scan_run_id).execute()

    supabase.rpc("tripwire_rollup_item", {"p_item_id": item_id}).execute()

    # scratch disk teardown is implicit — the Modal sandbox itself is ephemeral and discarded here.


def _acquire_target(target: str, item_type: str, workdir: str):
    """STUB: real implementation dispatches on target shape —
    local upload (already copied in by the CLI), `git clone` for a repo URL,
    or a live MCP protocol handshake for introspection-only servers.
    Never happens at image build time — always at runtime, inside this sandbox."""
    import os
    os.makedirs(workdir, exist_ok=True)
