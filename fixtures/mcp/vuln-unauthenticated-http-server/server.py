"""MCP server fixture exposed over HTTP with no authentication check.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
"""
from __future__ import annotations

from mcp.server.fastmcp import FastMCP

# Vulnerable on purpose: no auth/session middleware in front of this transport —
# any client that can reach the port can call every tool below.
mcp = FastMCP("vuln-unauthenticated-http-server")


@mcp.tool()
def get_account_balance(account_id: str) -> str:
    """Return a mock balance for the given account id — no caller identity check."""
    return f"account {account_id}: balance $1,204.55"


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8765)
