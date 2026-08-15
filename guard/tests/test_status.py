"""
Tests for guard.status get_item_status — the plan §6.1 state machine — and the
shared content_changed tamper predicate.

Scope: all six derivable states, the 14-day staleness boundary, the
error→unscanned fail-closed mapping, the scanning-with-prior-verdict rule
(including the stale-prior deny that closes the stuck-running bypass),
"latest completed" selection by coalesce(completed_at, started_at),
completed_at→started_at fallback, and T2 client-quirk hardening.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from _fakes import FakeSupabase, NoneReturningClient, make_tables

from guard.status import content_changed, get_item_status, hash_local_path

NOW = datetime(2026, 8, 15, 12, 0, 0, tzinfo=UTC)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _item(**overrides: object) -> dict:
    row = {
        "id": "item-1",
        "identifier": "/abs/skills/foo",
        "content_hash": "deadbeef",
        "heatmap_status": "green",
        "updated_at": _iso(NOW - timedelta(hours=1)),
    }
    row.update(overrides)
    return row


def _run(**overrides: object) -> dict:
    started = NOW - timedelta(days=1)
    row = {
        "id": "run-1",
        "item_id": "item-1",
        "status": "complete",
        "started_at": _iso(started),
        "completed_at": _iso(started + timedelta(minutes=5)),
    }
    row.update(overrides)
    return row


def test_given_no_item_row_when_status_derived_then_unscanned() -> None:
    client = FakeSupabase(make_tables())

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "unscanned"
    assert status["rag"] is None
    assert status["scanned_at"] is None
    assert status["stored_content_hash"] is None
    assert status["item"] is None
    assert status["threshold"] == "red"
    assert status["monitoring_enabled"] is True


def test_given_grey_item_with_no_runs_when_status_derived_then_unscanned() -> None:
    client = FakeSupabase(make_tables(items=[_item(heatmap_status="grey")]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "unscanned"
    assert status["rag"] is None
    assert status["item"] is not None
    assert status["stored_content_hash"] == "deadbeef"


def test_given_error_heatmap_when_status_derived_then_unscanned_fail_closed() -> None:
    """§6.1: heatmap 'error' maps to unscanned (fail-closed), never fresh."""
    client = FakeSupabase(
        make_tables(items=[_item(heatmap_status="error")], scan_runs=[_run(status="failed")])
    )

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "unscanned"
    assert status["rag"] is None


def test_given_recent_completed_run_when_status_derived_then_fresh_with_rag() -> None:
    client = FakeSupabase(make_tables(items=[_item(heatmap_status="red")], scan_runs=[_run()]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "fresh"
    assert status["rag"] == "red"
    assert status["scanned_at"] == _run()["completed_at"]


def test_given_completed_run_older_than_window_when_status_derived_then_stale() -> None:
    completed = NOW - timedelta(days=14, seconds=1)
    run = _run(started_at=_iso(completed - timedelta(minutes=5)), completed_at=_iso(completed))
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[run]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "stale"
    assert status["rag"] is None  # rag is null for non-fresh states (§6.3)


def test_given_run_exactly_at_boundary_when_status_derived_then_still_fresh() -> None:
    """Stale means strictly OLDER than validity_days: exactly 14 days is fresh."""
    completed = NOW - timedelta(days=14)
    run = _run(started_at=_iso(completed - timedelta(minutes=5)), completed_at=_iso(completed))
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[run]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "fresh"
    assert status["rag"] == "green"


def test_given_running_first_scan_when_status_derived_then_scanning_without_rag() -> None:
    run = _run(status="running", completed_at=None)
    client = FakeSupabase(make_tables(items=[_item(heatmap_status="grey")], scan_runs=[run]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "scanning"
    assert status["rag"] is None
    assert status["scanned_at"] is None


def test_given_running_rescan_with_prior_verdict_then_scanning_with_prior_rag() -> None:
    """§6.1 scanning row: the latest completed verdict stands during a rescan."""
    prior = _run()
    rescan = _run(
        id="run-2",
        status="running",
        started_at=_iso(NOW - timedelta(minutes=1)),
        completed_at=None,
    )
    client = FakeSupabase(
        make_tables(items=[_item(heatmap_status="green")], scan_runs=[prior, rescan])
    )

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "scanning"
    assert status["rag"] == "green"
    assert status["prior_stale"] is False
    assert status["scanned_at"] == prior["completed_at"]


def test_given_stuck_running_run_and_stale_prior_green_then_no_rag_exposed() -> None:
    """Regression (review finding, status.py:247): a stuck/stranded 'running'
    scan_run must NOT freeze enforcement on a stale prior verdict — a green
    run from 400 days ago plus a still-running row yields rag=None (denied
    downstream), never rag='green'."""
    completed = NOW - timedelta(days=400)
    prior = _run(
        started_at=_iso(completed - timedelta(minutes=5)),
        completed_at=_iso(completed),
    )
    stuck = _run(
        id="run-stuck",
        status="running",
        started_at=_iso(NOW - timedelta(days=399)),
        completed_at=None,
    )
    client = FakeSupabase(
        make_tables(items=[_item(heatmap_status="green")], scan_runs=[prior, stuck])
    )

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "scanning"
    assert status["rag"] is None
    assert status["prior_stale"] is True


def test_given_rescan_with_prior_exactly_at_boundary_then_prior_rag_stands() -> None:
    """The scanning branch uses the same boundary rule as the fresh path:
    exactly validity_days old is still fresh, so the prior verdict stands."""
    completed = NOW - timedelta(days=14)
    prior = _run(
        started_at=_iso(completed - timedelta(minutes=5)),
        completed_at=_iso(completed),
    )
    rescan = _run(id="run-2", status="running", started_at=_iso(NOW), completed_at=None)
    client = FakeSupabase(
        make_tables(items=[_item(heatmap_status="green")], scan_runs=[prior, rescan])
    )

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "scanning"
    assert status["rag"] == "green"
    assert status["prior_stale"] is False


def test_given_rescan_with_unparseable_prior_timestamp_then_no_rag_fail_closed() -> None:
    prior = _run(completed_at="not-a-timestamp", started_at=None)
    rescan = _run(id="run-2", status="running", started_at=_iso(NOW), completed_at=None)
    client = FakeSupabase(
        make_tables(items=[_item(heatmap_status="green")], scan_runs=[prior, rescan])
    )

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "scanning"
    assert status["rag"] is None
    assert status["prior_stale"] is True


def test_given_completed_run_without_completed_at_then_started_at_fallback() -> None:
    """§0.4: freshness uses completed_at with started_at fallback."""
    started = NOW - timedelta(days=2)
    run = _run(started_at=_iso(started), completed_at=None, status="partial-failed")
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[run]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "fresh"
    assert status["scanned_at"] == _iso(started)


def test_given_long_running_earlier_started_scan_then_true_latest_completion_wins() -> None:
    """Regression (review finding, status.py:233): 'latest completed' is max by
    coalesce(completed_at, started_at), not by started_at — a long-running scan
    that STARTED earlier but COMPLETED last must supply the freshness
    timestamp, else a fresh artifact is misclassified stale."""
    long_running = _run(
        id="run-long",
        started_at=_iso(NOW - timedelta(days=25)),
        completed_at=_iso(NOW - timedelta(days=2)),
    )
    older_verdict = _run(
        id="run-older",
        started_at=_iso(NOW - timedelta(days=20)),
        completed_at=_iso(NOW - timedelta(days=20)),
    )
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[long_running, older_verdict]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["scanned_at"] == long_running["completed_at"]
    assert status["state"] == "fresh"
    assert status["rag"] == "green"


def test_given_completed_run_without_completed_at_then_coalesce_uses_started_at() -> None:
    """coalesce(completed_at, started_at) also governs run SELECTION: a
    partial-failed run with no completed_at competes on its started_at."""
    no_completed_at = _run(
        id="run-partial",
        status="partial-failed",
        started_at=_iso(NOW - timedelta(days=3)),
        completed_at=None,
    )
    older = _run(
        id="run-older",
        started_at=_iso(NOW - timedelta(days=6)),
        completed_at=_iso(NOW - timedelta(days=5)),
    )
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[no_completed_at, older]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["scanned_at"] == no_completed_at["started_at"]
    assert status["state"] == "fresh"


def test_given_green_heatmap_but_no_completed_run_then_unscanned() -> None:
    """Data inconsistency (verdict without a completed run) fails closed."""
    client = FakeSupabase(make_tables(items=[_item(heatmap_status="green")]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "unscanned"


def test_given_duplicate_identifier_rows_then_latest_by_updated_at_wins() -> None:
    """Mirror orchestrator.js:34-40 — order updated_at desc limit 1."""
    older = _item(id="item-old", content_hash="old", updated_at=_iso(NOW - timedelta(days=9)))
    newer = _item(id="item-1", content_hash="new", updated_at=_iso(NOW - timedelta(hours=1)))
    client = FakeSupabase(make_tables(items=[older, newer], scan_runs=[_run()]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["item"]["id"] == "item-1"
    assert status["stored_content_hash"] == "new"


def test_given_disabled_monitoring_and_custom_threshold_then_config_passed_through() -> None:
    config = {"id": 1, "monitoring_enabled": False, "threshold": "red_and_amber"}
    client = FakeSupabase(make_tables(config=config))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["monitoring_enabled"] is False
    assert status["threshold"] == "red_and_amber"


def test_given_client_returning_none_responses_then_config_error_raises() -> None:
    """T2: execute() returning None must hit an error path, not AttributeError."""
    with pytest.raises(RuntimeError):
        get_item_status(NoneReturningClient(), "/abs/skills/foo", 14, now=NOW)


def test_given_unparseable_scanned_at_then_unscanned_fail_closed() -> None:
    run = _run(completed_at="not-a-timestamp", started_at=None)
    client = FakeSupabase(make_tables(items=[_item()], scan_runs=[run]))

    status = get_item_status(client, "/abs/skills/foo", 14, now=NOW)

    assert status["state"] == "unscanned"


# ─── content_changed (shared tamper predicate) ────────────────────────────────


def _exploding_hash(_path: str) -> str:
    raise AssertionError("hash_fn must not be called for this case")


def test_given_no_resolved_path_then_content_unchanged() -> None:
    assert content_changed(None, "deadbeef", hash_fn=_exploding_hash) is False


@pytest.mark.parametrize("stored", [None, ""])
def test_given_missing_stored_hash_then_content_unchanged(stored: str | None) -> None:
    assert content_changed("/abs/skills/foo", stored, hash_fn=_exploding_hash) is False


def test_given_pending_placeholder_hash_then_content_unchanged() -> None:
    """MCP rows carry 'pending:<key>' — no content binding, never recomputed."""
    assert content_changed("/abs/skills/foo", "pending:my-server", hash_fn=_exploding_hash) is False


def test_given_matching_hash_then_content_unchanged() -> None:
    assert content_changed("/abs/skills/foo", "same", hash_fn=lambda _p: "same") is False


def test_given_mismatched_hash_then_content_changed() -> None:
    assert content_changed("/abs/skills/foo", "stored", hash_fn=lambda _p: "different") is True


def test_given_real_directory_then_default_hash_fn_detects_edit(tmp_path: Path) -> None:
    """End-to-end with the default hash_local_path: unchanged dir compares
    clean, an edit flips the predicate."""
    skill_dir = tmp_path / "skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("---\nname: s\n---\nbody\n")
    stored = hash_local_path(str(skill_dir))

    assert content_changed(str(skill_dir), stored) is False

    (skill_dir / "SKILL.md").write_text("---\nname: s\n---\ntampered\n")

    assert content_changed(str(skill_dir), stored) is True
