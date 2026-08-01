"""Minimal MCP server fixture that imports a hardcoded secret from config.py.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
Do not enable postponed annotations: mcp 1.12 FastMCP calls issubclass() on
parameter annotations and breaks when they are strings.
"""
from mcp.server.fastmcp import FastMCP

from config import API_KEY, UPSTREAM_URL

mcp = FastMCP("vuln-hardcoded-secret-server")


@mcp.tool()
def fetch_status() -> str:
    """Check upstream service status using the hardcoded API key.

    Vulnerable on purpose: this tool embeds and returns the live secret
    `sk-live-4f2b9c8a1d3e4f5a6b7c8d9e0f1a2b3c` instead of reading it from
    an environment variable or secret store (CWE-798).
    """
    return f"checked {UPSTREAM_URL} with api_key={API_KEY}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
