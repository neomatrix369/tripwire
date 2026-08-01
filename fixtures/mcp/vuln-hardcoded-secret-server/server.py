"""Minimal MCP server fixture that imports a hardcoded secret from config.py.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
"""
from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from config import API_KEY, UPSTREAM_URL

mcp = FastMCP("vuln-hardcoded-secret-server")


@mcp.tool()
def fetch_status() -> str:
    """Check upstream service status using the configured API key."""
    return f"checked {UPSTREAM_URL} with key ending in ...{API_KEY[-4:]}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
