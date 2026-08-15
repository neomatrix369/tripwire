"""Scan submit helpers for /tw-scan (slice 29).

Parses dual force syntax, resolves names via an injectable seam (shared
ResolvedArtifact with /tw-verify), and submits through an injectable wrapper
around the existing tripwire scan API — echoing only introspected identifiers.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

from guard.verify import ResolvedArtifact

FORCE_TOKENS = frozenset({"--force", "force"})
NOT_FOUND_NOTE = "No match for this name — check spelling or install path"

ResolveFn = Callable[[str], ResolvedArtifact | None]
SubmitFn = Callable[..., dict[str, Any]]


@dataclass(frozen=True)
class ScanResult:
    """Confirmation for a /tw-scan submission."""

    submitted: tuple[str, ...]
    skipped: tuple[str, ...]
    force: bool
    batch_id: str
    scan_run_ids: tuple[str, ...]
    failed_targets: tuple[dict[str, Any], ...]

    def to_machine(self) -> dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "scan_run_ids": list(self.scan_run_ids),
            "failed_targets": [dict(item) for item in self.failed_targets],
            "submitted": list(self.submitted),
            "force": self.force,
            "skipped": list(self.skipped),
        }

    def to_markdown(self) -> str:
        lines = [
            "## Scan submitted",
            f"- force: `{self.force}`",
            f"- batch_id: `{self.batch_id}`",
            f"- scan_run_ids: {', '.join(f'`{rid}`' for rid in self.scan_run_ids) or '—'}",
        ]
        if self.submitted:
            lines.append("- submitted: " + ", ".join(f"`{name}`" for name in self.submitted))
        for name in self.skipped:
            lines.append(f"- `{name}`: {NOT_FOUND_NOTE}")
        if self.failed_targets:
            for failure in self.failed_targets:
                target = failure.get("target", "?")
                error = failure.get("error", "unknown error")
                lines.append(f"- failed `{target}`: {error}")
        return "\n".join(lines)


def parse_scan_args(tokens: Sequence[str]) -> tuple[list[str], bool]:
    """Split artifact names from `--force` / bare `force` tokens."""
    names: list[str] = []
    force = False
    for token in tokens:
        if token in FORCE_TOKENS:
            force = True
            continue
        names.append(token)
    return names, force


def scan_artifacts(
    names: Sequence[str],
    *,
    resolve: ResolveFn,
    submit: SubmitFn,
    force: bool = False,
) -> ScanResult:
    """Resolve names, submit resolvable paths once, echo scan API identifiers."""
    submitted: list[str] = []
    paths: list[str] = []
    skipped: list[str] = []
    for name in names:
        resolved = resolve(name)
        if resolved is None or not resolved.resolved_path:
            skipped.append(name)
            continue
        submitted.append(resolved.name)
        paths.append(resolved.resolved_path)

    if not paths:
        return ScanResult(
            submitted=tuple(submitted),
            skipped=tuple(skipped),
            force=force,
            batch_id="",
            scan_run_ids=(),
            failed_targets=(),
        )

    raw = submit(paths, force=force)
    failed = raw.get("failed_targets") or []
    run_ids = raw.get("scan_run_ids") or []
    return ScanResult(
        submitted=tuple(submitted),
        skipped=tuple(skipped),
        force=force,
        batch_id=str(raw.get("batch_id") or ""),
        scan_run_ids=tuple(str(item) for item in run_ids),
        failed_targets=tuple(dict(item) for item in failed),
    )
