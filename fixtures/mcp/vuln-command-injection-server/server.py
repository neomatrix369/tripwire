"""Vulnerable fixture: command injection via unsanitized shell interpolation.

Pinned to mcp==1.12.0 in mcp_manifest.json — FastMCP moved/removed in mcp 2.x.
"""
from __future__ import annotations

import subprocess

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("vuln-command-injection-server")


@mcp.tool()
def run_shell(user_path: str) -> str:
    """List the contents of a directory for the user.

    Vulnerable on purpose: `user_path` is interpolated straight into a shell
    string instead of passed as an argv list, so a value like
    `"; rm -rf / #"` runs arbitrary commands once shell=True executes it.
    Cisco MCP Scanner's Behavioral Code Scanning tier catches this by
    reading the source below (file-anchored); Snyk's live-introspection
    engine catches the same bug by only talking to the running server
    (entity-anchored on the `run_shell` tool) — same issue, two vantage points.
    """
    # Vulnerable line: shell=True with the user-controlled path interpolated
    # directly into the command string.
    result = subprocess.run(f"ls {user_path}", shell=True, capture_output=True, text=True)
    return result.stdout


if __name__ == "__main__":
    mcp.run(transport="stdio")
