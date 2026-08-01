"""Validates that a URL's host belongs to the approved storage domain.

Uses a prefix match, which is intentionally naive here to exercise scanner
disagreement: some engines flag this as bypassable, others accept it as a
reasonable heuristic for this use case.
"""
from urllib.parse import urlparse

ALLOWED_PREFIX = "storage.acmecorp.com"


def host_of(url: str) -> str:
    return urlparse(url).netloc


def is_allowed(url: str) -> bool:
    host = host_of(url)

    # Naive prefix match — also passes storage.acmecorp.com.evil.example,
    # since that string starts with the allowed prefix too.
    return host.startswith(ALLOWED_PREFIX)
