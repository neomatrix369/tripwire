"""Dual-output /tw-verify helpers (slice 28).

Classifies resolved artifacts into the six UI states from the Frontline
dual-output contract and renders human Markdown + machine JSON in one pass.
Name resolution and Supabase status lookup are injectable seams so Claude
skills and tests stay free of live I/O.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

UiState = Literal["fresh", "stale", "unscanned", "scanning", "not-found", "red"]

RED_BLOCK_NOTE = "Will be blocked when Tripwire is enabled"
NOT_FOUND_NOTE = "No match for this name — check spelling or install path"
TABLE_HEADER = "| Name | Type | Status | Note |"
TABLE_SEP = "|------|------|--------|------|"

_STATUS_DISPLAY: dict[UiState, str] = {
    "fresh": "🟢 GREEN (fresh)",
    "stale": "⚠️ STALE",
    "unscanned": "🚫 UNSCANNED",
    "scanning": "⏳ SCANNING",
    "not-found": "❓ NOT FOUND",
    "red": "🔴 RED",
}

_FRESH_RAG_DISPLAY = {
    "green": "🟢 GREEN (fresh)",
    "amber": "🟠 AMBER (fresh)",
    "red": "🔴 RED",
}


@dataclass(frozen=True)
class ResolvedArtifact:
    """Resolved name from Claude/agent visibility (or a test double)."""

    name: str
    artifact_type: str | None
    resolved_path: str | None


@dataclass(frozen=True)
class StatusRecord:
    """Supabase-shaped status for one resolved artifact."""

    heatmap_status: str | None
    scanned_at: datetime | None
    run_status: str | None


@dataclass(frozen=True)
class ArtifactRow:
    """One dual-output artifact row (human + machine share these facts)."""

    name: str
    resolved_path: str | None
    type: str | None
    state: UiState
    rag: str | None
    scanned_at: str | None
    stale: bool
    will_be_blocked: bool
    note: str

    def status_display(self) -> str:
        if self.state == "fresh" and self.rag in _FRESH_RAG_DISPLAY:
            return _FRESH_RAG_DISPLAY[self.rag]
        return _STATUS_DISPLAY[self.state]


@dataclass(frozen=True)
class VerifyResult:
    """One-pass verify result for all requested names."""

    artifacts: list[ArtifactRow]

    def to_machine(self) -> dict[str, Any]:
        return {"artifacts": [asdict(row) for row in self.artifacts]}

    def to_markdown(self) -> str:
        lines = [TABLE_HEADER, TABLE_SEP]
        for row in self.artifacts:
            type_cell = row.type or "—"
            lines.append(f"| `{row.name}` | {type_cell} | {row.status_display()} | {row.note} |")
        return "\n".join(lines)


ResolveFn = Callable[[str], ResolvedArtifact | None]
FetchStatusFn = Callable[[ResolvedArtifact], StatusRecord]
NowFn = Callable[[], datetime]


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _is_stale(scanned_at: datetime | None, validity_days: int, now: datetime) -> bool:
    if scanned_at is None:
        return False
    point = scanned_at if scanned_at.tzinfo else scanned_at.replace(tzinfo=UTC)
    return point < now - timedelta(days=validity_days)


def _classify(
    name: str,
    resolved: ResolvedArtifact | None,
    status: StatusRecord | None,
    *,
    validity_days: int,
    now: datetime,
) -> ArtifactRow:
    if resolved is None:
        return ArtifactRow(
            name=name,
            resolved_path=None,
            type=None,
            state="not-found",
            rag=None,
            scanned_at=None,
            stale=False,
            will_be_blocked=False,
            note=NOT_FOUND_NOTE,
        )

    assert status is not None
    if status.run_status == "running":
        return ArtifactRow(
            name=resolved.name,
            resolved_path=resolved.resolved_path,
            type=resolved.artifact_type,
            state="scanning",
            rag=None,
            scanned_at=_iso(status.scanned_at),
            stale=False,
            will_be_blocked=False,
            note="Scan in progress — check back shortly",
        )

    heatmap = (status.heatmap_status or "").lower()
    if heatmap in ("", "grey", "error") or status.heatmap_status is None:
        return ArtifactRow(
            name=resolved.name,
            resolved_path=resolved.resolved_path,
            type=resolved.artifact_type,
            state="unscanned",
            rag=None,
            scanned_at=_iso(status.scanned_at),
            stale=False,
            will_be_blocked=True,
            note=f"Never scanned — offer `/tw-scan {resolved.name}`",
        )

    stale = _is_stale(status.scanned_at, validity_days, now)
    if stale:
        return ArtifactRow(
            name=resolved.name,
            resolved_path=resolved.resolved_path,
            type=resolved.artifact_type,
            state="stale",
            rag=heatmap if heatmap in ("green", "amber", "red") else None,
            scanned_at=_iso(status.scanned_at),
            stale=True,
            will_be_blocked=True,
            note=f"Last scanned >{validity_days} days ago — rescan recommended",
        )

    if heatmap == "red":
        return ArtifactRow(
            name=resolved.name,
            resolved_path=resolved.resolved_path,
            type=resolved.artifact_type,
            state="red",
            rag="red",
            scanned_at=_iso(status.scanned_at),
            stale=False,
            will_be_blocked=True,
            note=RED_BLOCK_NOTE,
        )

    rag = heatmap if heatmap in ("green", "amber") else None
    return ArtifactRow(
        name=resolved.name,
        resolved_path=resolved.resolved_path,
        type=resolved.artifact_type,
        state="fresh",
        rag=rag,
        scanned_at=_iso(status.scanned_at),
        stale=False,
        will_be_blocked=False,
        note="—" if heatmap == "green" else "Reported but not blocked at amber threshold",
    )


def verify_artifacts(
    names: Sequence[str],
    *,
    resolve: ResolveFn,
    fetch_status: FetchStatusFn,
    validity_days: int = 14,
    now: NowFn | None = None,
) -> VerifyResult:
    """Verify every name in one pass; never stop at the first issue."""
    clock = now or (lambda: datetime.now(UTC))
    current = clock()
    rows: list[ArtifactRow] = []
    for name in names:
        resolved = resolve(name)
        status = fetch_status(resolved) if resolved is not None else None
        rows.append(
            _classify(
                name,
                resolved,
                status,
                validity_days=validity_days,
                now=current,
            )
        )
    return VerifyResult(artifacts=rows)
