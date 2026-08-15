"""
Tests for guard.guard_hook.check_call_by_identifier — the T1 decision primitive.

Scope: deny on unscanned/stale/error (fail-closed), threshold semantics
('red' vs 'red_and_amber'), tamper (content-hash mismatch) denial, `pending:`
hash exemption, the scanning-with-prior-verdict rule (including the
stale-prior rescan deny that closes the stuck-running bypass),
monitoring-disabled allow, and exception→deny hardening (T2). No network:
fake Supabase clients.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from _fakes import FakeSupabase, NoneReturningClient, make_tables

from guard.guard_hook import check_call_by_identifier

# check_call_by_identifier has no injectable clock (the precise boundary tests
# live in test_status.py); anchor rows to the real clock with generous margins.
NOW = datetime.now(UTC)
IDENT = "/abs/skills/foo"
HASH = "cafe" * 16


def _item(**overrides: object) -> dict:
    row = {
        "id": "item-1",
        "identifier": IDENT,
        "content_hash": HASH,
        "heatmap_status": "green",
        "updated_at": (NOW - timedelta(hours=1)).isoformat(),
    }
    row.update(overrides)
    return row


def _run(**overrides: object) -> dict:
    started = NOW - timedelta(days=1)
    row = {
        "id": "run-1",
        "item_id": "item-1",
        "status": "complete",
        "started_at": started.isoformat(),
        "completed_at": (started + timedelta(minutes=5)).isoformat(),
    }
    row.update(overrides)
    return row


def _client(**kwargs: object) -> FakeSupabase:
    return FakeSupabase(make_tables(**kwargs))  # type: ignore[arg-type]


def _matching_hash(_path: str) -> str:
    return HASH


def _different_hash(_path: str) -> str:
    return "d1ff" * 16


def _exploding_hash(_path: str) -> str:
    raise AssertionError("hash_fn must not be called for this case")


def test_given_monitoring_disabled_then_allow() -> None:
    config = {"id": 1, "monitoring_enabled": False, "threshold": "red"}
    result = check_call_by_identifier(IDENT, 14, client=_client(config=config))

    assert result == {"allow": True, "reason": "monitoring disabled", "status": None}


def test_given_no_item_row_then_deny_unscanned() -> None:
    result = check_call_by_identifier(IDENT, 14, client=_client())

    assert result["allow"] is False
    assert result["status"] == "grey"
    assert "never scanned" in result["reason"]


def test_given_error_heatmap_then_deny_with_resubmit_reason() -> None:
    client = _client(items=[_item(heatmap_status="error")], scan_runs=[_run(status="failed")])
    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "error"
    assert "errored" in result["reason"]


def test_given_stale_scan_then_deny() -> None:
    completed = NOW - timedelta(days=30)
    run = _run(started_at=completed.isoformat(), completed_at=completed.isoformat())
    client = _client(items=[_item()], scan_runs=[run])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "stale"
    assert "14 days" in result["reason"]


def test_given_fresh_red_then_deny_at_red_threshold() -> None:
    client = _client(items=[_item(heatmap_status="red")], scan_runs=[_run()])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "red"
    assert "at/above threshold" in result["reason"]


def test_given_fresh_amber_then_allowed_at_red_threshold() -> None:
    client = _client(items=[_item(heatmap_status="amber")], scan_runs=[_run()])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is True
    assert result["status"] == "amber"


def test_given_fresh_amber_then_denied_at_red_and_amber_threshold() -> None:
    config = {"id": 1, "monitoring_enabled": True, "threshold": "red_and_amber"}
    client = _client(config=config, items=[_item(heatmap_status="amber")], scan_runs=[_run()])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "amber"


def test_given_fresh_green_then_allow() -> None:
    client = _client(items=[_item()], scan_runs=[_run()])

    result = check_call_by_identifier(IDENT, 14, client=client, hash_fn=_matching_hash)

    assert result["allow"] is True
    assert result["status"] == "green"


def test_given_content_hash_mismatch_then_deny_tamper() -> None:
    """T1 tamper evidence: recomputed hash ≠ stored ⇒ deny, exact plan reason."""
    client = _client(items=[_item()], scan_runs=[_run()])

    result = check_call_by_identifier(
        IDENT, 14, content_path="/abs/skills/foo", client=client, hash_fn=_different_hash
    )

    assert result["allow"] is False
    assert result["reason"] == "content changed since last scan — run /tw-scan"


def test_given_content_hash_match_then_allow() -> None:
    client = _client(items=[_item()], scan_runs=[_run()])

    result = check_call_by_identifier(
        IDENT, 14, content_path="/abs/skills/foo", client=client, hash_fn=_matching_hash
    )

    assert result["allow"] is True


def test_given_pending_stored_hash_then_hash_check_exempt() -> None:
    """Manifest-only artifacts carry `pending:` placeholders — never recompute."""
    client = _client(items=[_item(content_hash="pending:some-server")], scan_runs=[_run()])

    result = check_call_by_identifier(
        IDENT, 14, content_path="/abs/skills/foo", client=client, hash_fn=_exploding_hash
    )

    assert result["allow"] is True


def test_given_no_content_path_then_hash_check_skipped() -> None:
    client = _client(items=[_item()], scan_runs=[_run()])

    result = check_call_by_identifier(IDENT, 14, client=client, hash_fn=_exploding_hash)

    assert result["allow"] is True


def test_given_rescan_running_with_prior_green_then_allow() -> None:
    """§6.1 scanning row: prior completed verdict stands during a rescan."""
    rescan = _run(id="run-2", status="running", started_at=NOW.isoformat(), completed_at=None)
    client = _client(items=[_item(heatmap_status="green")], scan_runs=[_run(), rescan])

    result = check_call_by_identifier(IDENT, 14, client=client, hash_fn=_matching_hash)

    assert result["allow"] is True
    assert result["status"] == "green"


def test_given_rescan_running_with_prior_red_then_deny() -> None:
    rescan = _run(id="run-2", status="running", started_at=NOW.isoformat(), completed_at=None)
    client = _client(items=[_item(heatmap_status="red")], scan_runs=[_run(), rescan])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "red"


def test_given_stuck_running_and_stale_prior_green_then_deny() -> None:
    """Regression (review finding, status.py:247): a completed GREEN run from
    400 days ago plus a scan_run stuck in status='running' must DENY — the
    stuck row previously froze enforcement on the expired verdict and the
    call was allowed ('rated green — below threshold')."""
    completed = NOW - timedelta(days=400)
    prior = _run(
        started_at=(completed - timedelta(minutes=5)).isoformat(),
        completed_at=completed.isoformat(),
    )
    stuck = _run(
        id="run-stuck",
        status="running",
        started_at=(NOW - timedelta(days=399)).isoformat(),
        completed_at=None,
    )
    client = _client(items=[_item(heatmap_status="green")], scan_runs=[prior, stuck])

    result = check_call_by_identifier(IDENT, 14, client=client, hash_fn=_matching_hash)

    assert result["allow"] is False
    assert result["status"] == "scanning"
    assert "rescan in progress" in result["reason"]
    assert "stale" in result["reason"]
    assert "14" in result["reason"]


def test_given_first_scan_running_then_deny() -> None:
    run = _run(status="running", completed_at=None)
    client = _client(items=[_item(heatmap_status="grey")], scan_runs=[run])

    result = check_call_by_identifier(IDENT, 14, client=client)

    assert result["allow"] is False
    assert result["status"] == "scanning"


def test_given_status_fn_raising_then_fail_closed_deny() -> None:
    def boom(*_args: object, **_kwargs: object) -> dict:
        raise ConnectionError("supabase unreachable")

    result = check_call_by_identifier(IDENT, 14, client=_client(), status_fn=boom)

    assert result == {"allow": False, "reason": "guard error — fail closed", "status": None}


def test_given_none_returning_client_then_fail_closed_deny() -> None:
    """T2: .maybe_single()/execute() returning None must deny, not raise."""
    result = check_call_by_identifier(IDENT, 14, client=NoneReturningClient())

    assert result == {"allow": False, "reason": "guard error — fail closed", "status": None}


def test_given_default_validity_when_omitted_then_14_days_used() -> None:
    completed = NOW - timedelta(days=13)
    run = _run(started_at=completed.isoformat(), completed_at=completed.isoformat())
    client = _client(items=[_item()], scan_runs=[run])

    result = check_call_by_identifier(IDENT, client=client, hash_fn=_matching_hash)

    assert result["allow"] is True
