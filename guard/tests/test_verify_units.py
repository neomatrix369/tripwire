"""
Unit coverage for guard.verify edge paths (slice 28).

Author: slice-28
Created: 2026-08-15
Scope: naive datetime ISO/stale helpers; default now clock
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from guard.verify import ResolvedArtifact, StatusRecord, _is_stale, _iso, verify_artifacts


def test_given_naive_datetime_when_iso_then_utc_z_suffix() -> None:
    """Scenario: Naive scanned_at is treated as UTC for machine JSON."""
    ### Given
    naive = datetime(2026, 8, 1, 10, 0, 0)

    ### When
    actual = _iso(naive)

    ### Then
    assert actual == "2026-08-01T10:00:00Z"


def test_given_none_scanned_at_when_stale_checked_then_false() -> None:
    """Scenario: Missing scanned_at is not classified stale by the helper."""
    ### Given / When
    actual = _is_stale(None, 14, datetime(2026, 8, 15, tzinfo=UTC))

    ### Then
    assert actual is False


def test_given_naive_old_scan_when_stale_checked_then_true() -> None:
    """Scenario: Naive old scanned_at compares correctly against aware now."""
    ### Given
    naive_old = datetime(2026, 1, 1, 0, 0, 0)
    now = datetime(2026, 8, 15, tzinfo=UTC)

    ### When
    actual = _is_stale(naive_old, 14, now)

    ### Then
    assert actual is True


def test_given_no_now_inject_when_verify_then_uses_clock() -> None:
    """Scenario: Default now() path remains callable without injection."""

    ### Given
    def resolve(name: str) -> ResolvedArtifact:
        return ResolvedArtifact(name=name, artifact_type="skill", resolved_path="/tmp/x")

    def fetch_status(_resolved: ResolvedArtifact) -> StatusRecord:
        return StatusRecord(
            heatmap_status="green",
            scanned_at=datetime.now(UTC) - timedelta(days=1),
            run_status="complete",
        )

    ### When
    actual = verify_artifacts(["x"], resolve=resolve, fetch_status=fetch_status)

    ### Then
    assert actual.artifacts[0].state == "fresh"
