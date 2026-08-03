"""Render Radon and ESLint complexity data as an anchored pull-request section."""

from __future__ import annotations

import argparse
import json
import re
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

COMPLEXITY_MESSAGE = re.compile(r"complexity of (?P<score>\d+)", re.IGNORECASE)
MAX_ITEMS = 10


def read_json(path: Path) -> Any:
    """Load a report and fail with the report path when it is malformed."""
    with path.open(encoding="utf-8") as report:
        return json.load(report)


def python_summary(report: Mapping[str, Sequence[Mapping[str, Any]]]) -> tuple[int, str, int]:
    """Return the highest Radon score, its rank, and the number of code blocks."""
    entries = [entry for values in report.values() for entry in values]
    if not entries:
        return 0, "A", 0
    highest = max(entries, key=lambda entry: int(entry["complexity"]))
    return int(highest["complexity"]), str(highest["rank"]), len(entries)


def eslint_violations(report: Iterable[Mapping[str, Any]]) -> list[tuple[str, int, int]]:
    """Extract complexity-rule violations as file, line, and measured complexity."""
    violations: list[tuple[str, int, int]] = []
    for file_report in report:
        file_path = str(file_report["filePath"])
        for message in file_report.get("messages", []):
            if message.get("ruleId") != "complexity":
                continue
            match = COMPLEXITY_MESSAGE.search(str(message.get("message", "")))
            if match is None:
                continue
            violations.append((file_path, int(message.get("line", 0)), int(match.group("score"))))
    return sorted(violations, key=lambda item: item[2], reverse=True)


def format_violations(label: str, violations: Sequence[tuple[str, int, int]]) -> list[str]:
    """Format the most complex JavaScript functions for a compact PR body."""
    if not violations:
        return [f"- {label}: no functions exceed cyclomatic complexity 10."]
    lines = [f"- {label}: {len(violations)} function(s) exceed cyclomatic complexity 10."]
    for path, line, score in violations[:MAX_ITEMS]:
        lines.append(f"  - `{Path(path).name}:{line}` — CC {score}")
    return lines


def render_markdown(
    python_report: Mapping[str, Sequence[Mapping[str, Any]]],
    cli_report: Iterable[Mapping[str, Any]],
    dashboard_report: Iterable[Mapping[str, Any]],
) -> str:
    """Create the CI-owned PR-body block from all product-code reports."""
    score, rank, count = python_summary(python_report)
    cli_violations = eslint_violations(cli_report)
    dashboard_violations = eslint_violations(dashboard_report)
    lines = [
        "<!-- tripwire-complexity:start -->",
        "## Complexity",
        "",
        "_Automatically refreshed by CI for product-code changes._",
        "",
        "| Scope | Tool | Result |",
        "| --- | --- | --- |",
        f"| Python (`sandbox/`, `guard/`) | Radon | highest CC **{score}** (rank **{rank}**), {count} blocks |",
        f"| CLI (`cli/`) | ESLint | {len(cli_violations)} function(s) above CC 10 |",
        f"| Live dashboard | ESLint | {len(dashboard_violations)} function(s) above CC 10 |",
        "",
        "<details><summary>Functions above the JavaScript threshold</summary>",
        "",
        *format_violations("CLI", cli_violations),
        *format_violations("Live dashboard", dashboard_violations),
        "",
        "</details>",
        "<!-- tripwire-complexity:end -->",
        "",
    ]
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    """Parse report inputs and the generated Markdown destination."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--python-report", type=Path, required=True)
    parser.add_argument("--cli-report", type=Path, required=True)
    parser.add_argument("--dashboard-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    """Load reports and write the idempotent PR-body fragment."""
    args = parse_args()
    markdown = render_markdown(
        read_json(args.python_report),
        read_json(args.cli_report),
        read_json(args.dashboard_report),
    )
    args.output.write_text(markdown, encoding="utf-8")


if __name__ == "__main__":
    main()
