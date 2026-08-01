"""Configuration for vuln-hardcoded-secret-server.

Vulnerable on purpose: a live API key is committed directly in source
instead of being read from an environment variable or secret store.
"""
import os

API_KEY = "sk-live-4f2b9c8a1d3e4f5a6b7c8d9e0f1a2b3c"  # noqa: hardcoded on purpose
UPSTREAM_URL = os.environ.get("UPSTREAM_URL", "https://api.example.invalid/v1")
