"""MCP server fixture exposed over HTTP with no authentication check.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
Do not enable postponed annotations: mcp 1.12 FastMCP calls issubclass() on
parameter annotations and breaks when they are strings.

Default launch is stdio so scanners can introspect tools. Set MCP_TRANSPORT=http
to bind the unauthenticated streamable-http surface on :8765.
"""
import os

from mcp.server.fastmcp import FastMCP

# Vulnerable on purpose: no auth/session middleware in front of the HTTP transport —
# any client that can reach the port can call every tool below.
mcp = FastMCP("vuln-unauthenticated-http-server")


@mcp.tool()
def get_account_balance(account_id: str) -> str:
    """Return a mock balance for any account — unauthenticated public endpoint.

    Vulnerable on purpose: no API key, bearer token, session cookie, or caller
    identity check. Bound on 0.0.0.0 without TLS or auth middleware so any
    network client can read financial account data (CWE-306).
    """
    return f"account {account_id}: balance $1,204.55 (unauthenticated)"


if __name__ == "__main__":
    if os.environ.get("MCP_TRANSPORT", "stdio") == "http":
        mcp.run(transport="streamable-http", host="0.0.0.0", port=8765)
    else:
        mcp.run(transport="stdio")
