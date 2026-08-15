"""Shared status helpers for the Tripwire Claude Code guard layer (plan §6.1, T1/T2).

Three concerns live here so the PreToolUse handler and the /tw-* skills share one
deterministic implementation:

1. ``hash_local_path`` — an exact Python port of the CLI's content hash
   (``cli/src/hash.js::hashLocalPath``): sorted recursive walk, interleaving each
   file's path *string* with its bytes into one SHA-256. Path strings are
   constructed exactly like Node's ``path.join(target, entry)`` recursion, and
   directory entries are sorted exactly like JavaScript's default ``Array.sort``
   (UTF-16 code-unit order), so digests match the CLI byte-for-byte.
2. ``make_client`` — Supabase client factory with a short network timeout so a
   hung network call becomes a trapped error, never a fail-open hook kill (T2).
3. ``get_item_status`` — the §6.1 state machine (unscanned / scanning / stale /
   fresh, plus the error→unscanned fail-closed mapping) derived from the
   ``items`` + ``scan_runs`` tables.

Supabase imports stay lazy (inside functions) so ``import guard`` works without
the optional ``guard`` dependency group installed.
"""

from __future__ import annotations

import hashlib
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

DEFAULT_VALIDITY_DAYS = 14

_RAG_STATES = ("green", "amber", "red")
_COMPLETED_STATUSES = ("complete", "partial-failed")
# "Latest completed run" is defined by coalesce(completed_at, started_at)
# (§0.4), but PostgREST can only order by a real column — so fetch a small
# window ordered by started_at and pick the true latest completion in Python
# (a long-running earlier-started scan must not shadow a later completion).
_COMPLETED_FETCH_LIMIT = 5


# ─── CLI-compatible content hash (port of cli/src/hash.js) ────────────────────


def _js_sort_key(name: str) -> bytes:
    """Sort key replicating JavaScript's default Array.prototype.sort.

    JS compares strings by UTF-16 code units; UTF-16-BE bytes compare
    identically under lexicographic byte order. ``surrogatepass`` tolerates
    surrogate escapes from undecodable filenames (os.listdir on macOS/Linux).
    """
    return name.encode("utf-16-be", errors="surrogatepass")


def _normalize_posix(path_str: str) -> str:
    """Port of Node ``path.posix.normalize`` (the subset ``path.join`` needs)."""
    if not path_str:
        return "."
    is_abs = path_str.startswith("/")
    trailing = path_str.endswith("/")
    segments: list[str] = []
    for segment in path_str.split("/"):
        if segment in ("", "."):
            continue
        if segment == "..":
            if segments and segments[-1] != "..":
                segments.pop()
            elif not is_abs:
                segments.append("..")
        else:
            segments.append(segment)
    joined = "/".join(segments)
    if not joined:
        return "/" if is_abs else "."
    if is_abs:
        joined = "/" + joined
    if trailing and not joined.endswith("/"):
        joined += "/"
    return joined


def _node_path_join(parent: str, name: str) -> str:
    """Port of Node ``path.posix.join(parent, name)``: concat then normalize."""
    parts = [p for p in (parent, name) if p]
    if not parts:
        return "."
    return _normalize_posix("/".join(parts))


def hash_local_path(target: str) -> str:
    """Exact port of ``cli/src/hash.js::hashLocalPath``.

    Walks ``target`` recursively; directories recurse over their entries in
    JS-sorted order (files and subdirectories interleaved, exactly like Node's
    ``readdir().sort()``), each file contributes ``hash.update(path_string)``
    then ``hash.update(file_bytes)``. The path fed to the hash is the string
    built by the ``path.join`` recursion — *as given*, not canonicalized —
    which is why callers must pass one canonical absolute path form (§5.4).
    """
    digest = hashlib.sha256()

    def walk(p: str) -> None:
        # os.path.isdir follows symlinks, matching Node's stat().
        if os.path.isdir(p):
            for entry in sorted(os.listdir(p), key=_js_sort_key):
                walk(_node_path_join(p, entry))
        else:
            digest.update(p.encode("utf-8", errors="surrogatepass"))
            with open(p, "rb") as fh:
                digest.update(fh.read())

    walk(target)
    return digest.hexdigest()


def content_changed(
    resolved_path: str | None,
    stored_content_hash: Any,
    *,
    hash_fn: Callable[[str], str] | None = None,
) -> bool:
    """Shared tamper predicate: has on-disk content drifted since the scan?

    One implementation for the PreToolUse hook and the /tw-* skills so both
    agree on when "content changed since last scan" applies:

    - ``resolved_path`` of None (nothing on disk to compare — e.g. MCP servers,
      whose identity is a bare config key) ⇒ False.
    - Missing/empty ``stored_content_hash`` ⇒ False (nothing was bound).
    - ``pending:``-prefixed placeholders (manifest-only artifacts, which is all
      MCP servers under the §5.4 key-only rule) ⇒ False — they carry no content
      binding by design; the time/threshold checks alone govern them.
    - Otherwise recompute the CLI-compatible hash and report drift.

    ``hash_fn`` is an injectable seam for tests (defaults to
    ``hash_local_path``). Hash errors propagate — callers treat them as
    guard errors (fail closed).
    """
    if resolved_path is None or not stored_content_hash:
        return False
    stored = str(stored_content_hash)
    if stored.startswith("pending:"):
        return False
    compute = hash_fn if hash_fn is not None else hash_local_path
    return compute(resolved_path) != stored


# ─── Supabase client factory (T2: short timeout, lazy import) ─────────────────


def make_client(url: str, key: str, timeout_s: float = 5.0) -> Any:
    """Supabase client with a short network timeout.

    The handler runs under an 8s internal budget (plan §4.3.2); a ~5s client
    timeout turns a Supabase stall into a trapped exception (fail-closed deny)
    instead of an external hook kill (which would fail open).
    """
    from supabase import create_client  # lazy: optional `guard` dependency group

    try:
        from supabase import ClientOptions
    except ImportError:  # older supabase-py package layouts
        from supabase.lib.client_options import (  # type: ignore[assignment,no-redef]
            ClientOptions,
        )

    timeout: Any = timeout_s  # typed int upstream; httpx accepts floats fine
    options = ClientOptions(
        postgrest_client_timeout=timeout,
        storage_client_timeout=timeout,
    )
    return create_client(url, key, options=options)


# ─── §6.1 state derivation ────────────────────────────────────────────────────


def _rows(response: Any) -> list[Any]:
    """Normalize a PostgREST response to a list of rows.

    Handles client-version quirks where ``execute()`` (or ``.data``) is None
    (T2) — those normalize to "no rows" and hit the fail-closed paths.
    """
    if response is None:
        return []
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    return []


def _fetch_config(client: Any) -> dict[str, Any]:
    rows = _rows(client.table("config").select("*").eq("id", 1).limit(1).execute())
    if not rows or not isinstance(rows[0], dict):
        raise RuntimeError("tripwire Supabase config row missing/unreadable")
    return rows[0]


def _parse_timestamp(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed


_EPOCH = datetime.min.replace(tzinfo=UTC)


def _completion_key(row: dict[str, Any]) -> datetime:
    """Sort key for "latest completed run": coalesce(completed_at, started_at).

    Unparseable/missing timestamps sort earliest (they can never shadow a run
    with a real completion time). Ties keep the first row in query order,
    which is already started_at desc.
    """
    ts = _parse_timestamp(row.get("completed_at")) or _parse_timestamp(row.get("started_at"))
    return ts if ts is not None else _EPOCH


def get_item_status(
    client: Any,
    identifier: str,
    validity_days: int,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Derive the plan §6.1 state for one artifact identifier.

    Returns ``{state, rag, scanned_at, stored_content_hash, item, threshold,
    monitoring_enabled, prior_stale}`` where:

    - ``state`` ∈ ``fresh|stale|unscanned|scanning``. ``heatmap_status='error'``
      maps to ``unscanned`` (fail-closed); a latest ``scan_runs`` row with
      ``status='running'`` maps to ``scanning``.
    - ``rag`` is the fresh verdict for ``fresh``; for ``scanning`` it is the
      *prior completed* verdict when one exists AND that verdict is itself
      inside the validity window (the T1 rescan rule decides on it); a stale
      prior verdict yields ``rag=None`` with ``prior_stale=True`` — §6.1's
      scanning row blocks when the prior verdict is "none/stale/at-threshold",
      so a stuck ``running`` row must never freeze enforcement on an expired
      verdict.
    - ``scanned_at`` comes from the latest completed run — latest by
      ``coalesce(completed_at, started_at)`` over runs with
      ``status IN ('complete','partial-failed')`` — §0.4: there is no
      ``scanned_at`` column and ``items.updated_at`` lies.
    - Staleness: strictly older than ``validity_days`` days ⇒ ``stale``
      (exactly at the boundary is still fresh). ``now`` is injectable for tests.
    """
    config = _fetch_config(client)
    result: dict[str, Any] = {
        "state": "unscanned",
        "rag": None,
        "scanned_at": None,
        "stored_content_hash": None,
        "item": None,
        "threshold": config.get("threshold", "red"),
        "monitoring_enabled": bool(config.get("monitoring_enabled", True)),
        "prior_stale": False,
    }

    # Mirror orchestrator.js:34-40 — identifier rows can duplicate; take the
    # latest by updated_at, never .maybe_single() (errors on duplicates).
    items = _rows(
        client.table("items")
        .select("*")
        .eq("identifier", identifier)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if not items:
        return result
    item = items[0]
    result["item"] = item
    result["stored_content_hash"] = item.get("content_hash")

    latest = _rows(
        client.table("scan_runs")
        .select("*")
        .eq("item_id", item.get("id"))
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    completed = _rows(
        client.table("scan_runs")
        .select("*")
        .eq("item_id", item.get("id"))
        .in_("status", list(_COMPLETED_STATUSES))
        .order("started_at", desc=True)
        .limit(_COMPLETED_FETCH_LIMIT)
        .execute()
    )
    # §0.4 "latest completed" = max by coalesce(completed_at, started_at): a
    # long-running scan that STARTED earlier can hold the true latest
    # completion, so started_at ordering alone picks the wrong run.
    completed_run = max(completed, key=_completion_key, default=None)
    if completed_run is not None:
        result["scanned_at"] = completed_run.get("completed_at") or completed_run.get("started_at")

    reference = now if now is not None else datetime.now(UTC)
    heatmap = item.get("heatmap_status")
    if latest and latest[0].get("status") == "running":
        result["state"] = "scanning"
        # Prior completed verdict stands during a rescan (§6.1 scanning row) —
        # but only while that verdict is itself inside the validity window.
        # §6.1: blocked is "true only if that verdict is none/stale/at-
        # threshold" — a stuck/stranded running row must not indefinitely
        # freeze enforcement on an expired verdict, so a stale (or
        # unparseable-timestamp) prior yields rag=None + prior_stale=True.
        if completed_run is not None and heatmap in _RAG_STATES:
            scanned_dt = _parse_timestamp(result["scanned_at"])
            if scanned_dt is not None and reference - scanned_dt <= timedelta(days=validity_days):
                result["rag"] = heatmap
            else:
                result["prior_stale"] = True
        return result

    if completed_run is None or heatmap not in _RAG_STATES:
        # No completed run, heatmap grey, or heatmap 'error' → unscanned
        # (fail-closed mapping; 'error' surfaces as "last scan errored").
        return result

    scanned_dt = _parse_timestamp(result["scanned_at"])
    if scanned_dt is None:
        return result  # unparseable timestamp → treat as unscanned (fail closed)

    if reference - scanned_dt > timedelta(days=validity_days):
        result["state"] = "stale"
        return result

    result["state"] = "fresh"
    result["rag"] = heatmap
    return result
