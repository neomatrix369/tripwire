"""Minimal safe MCP time server fixture for Snyk agent-scan smoke tests.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
"""

from __future__ import annotations

from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("safe-time-server")


@mcp.tool()
def current_utc_time() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    mcp.run(transport="stdio")
