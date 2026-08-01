"""PreToolUse-style guard hook (spec Phase 4).
Wire this into the agent runtime's pre-tool-call interception point; it must run
synchronously before the call executes and be able to block it.

Fails closed: unscanned or below-threshold => deny. Never triggers a synchronous scan
on a cache miss (a full Modal spin-up is too slow to sit inline)."""
import hashlib
import os
from supabase import create_client

_SEVERITY_ORDER = {"green": 0, "amber": 1, "red": 2, "grey": 3, "error": 3}


def _client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def hash_target(content_bytes: bytes) -> str:
    return hashlib.sha256(content_bytes).hexdigest()


def check_call(content_bytes: bytes) -> dict:
    """Returns {"allow": bool, "reason": str, "status": str|None}."""
    supabase = _client()

    config = supabase.table("config").select("*").eq("id", 1).single().execute().data
    if not config["monitoring_enabled"]:
        return {"allow": True, "reason": "monitoring disabled", "status": None}

    content_hash = hash_target(content_bytes)
    item = supabase.table("items").select("*").eq("content_hash", content_hash).maybe_single().execute().data

    if not item or item["heatmap_status"] == "grey":
        return {"allow": False, "reason": "never scanned — guard fails closed", "status": "grey"}

    threshold_level = 2 if config["threshold"] == "red" else 1  # 'red' vs 'red_and_amber'
    item_level = _SEVERITY_ORDER.get(item["heatmap_status"], 3)

    if item_level >= threshold_level:
        return {"allow": False, "reason": f"rated {item['heatmap_status']} — at/above threshold", "status": item["heatmap_status"]}

    return {"allow": True, "reason": f"rated {item['heatmap_status']} — below threshold", "status": item["heatmap_status"]}


# For MCP tool calls: checked holistically at the whole-server level (spec Phase 4 —
# a deliberate simplification), not per-tool. Nested calls (A calls B calls C) are each
# checked individually at the moment they fire — no static call-graph analysis needed.
def pre_tool_use_hook(tool_call_context):
    content_bytes = tool_call_context["target_content"]  # caller resolves this per skill/server
    result = check_call(content_bytes)
    if not result["allow"]:
        raise PermissionError(f"Tripwire Guard blocked this call: {result['reason']}")
    return result
