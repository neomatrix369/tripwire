#!/usr/bin/env python3
"""Check that frontend and backend coverage thresholds are in sync.

Exit 1 if any threshold pair differs by more than ALLOWED_DELTA percentage points.
"""
import sys
import tomllib
from pathlib import Path
import re

ALLOWED_DELTA = 5  # pp — adjust if stacks intentionally differ


def read_backend_thresholds(pyproject: Path) -> dict[str, float]:
    data = tomllib.loads(pyproject.read_text())
    cov = data.get("tool", {}).get("coverage", {}).get("report", {})
    threshold = float(cov.get("fail_under", 0))
    return {k: threshold for k in ("statements", "branches", "lines", "functions")}


def read_frontend_thresholds(vite_config: Path) -> dict[str, float]:
    """Parse vitest coverage thresholds from vite.config.ts.

    Looks for lines like:  statements: 95,
    Simple regex parser — adjust if config structure differs.
    """
    text = vite_config.read_text()
    result: dict[str, float] = {}
    for key in ("statements", "branches", "lines", "functions"):
        m = re.search(rf"{key}\s*:\s*(\d+(?:\.\d+)?)", text)
        if m:
            result[key] = float(m.group(1))
    return result


def main() -> int:
    root = Path(__file__).parent.parent
    pyproject = root / "pyproject.toml"
    # CLI uses mocha/nyc, not vite — skip drift check if no vite config present
    vite_config = root / "cli" / "vite.config.ts"

    if not pyproject.exists():
        print("SKIP: pyproject.toml not found")
        return 0
    if not vite_config.exists():
        print("SKIP: cli/vite.config.ts not found — no drift check needed")
        return 0

    backend = read_backend_thresholds(pyproject)
    frontend = read_frontend_thresholds(vite_config)

    failures: list[str] = []
    for key in ("statements", "branches", "lines", "functions"):
        be = backend.get(key, 0)
        fe = frontend.get(key, 0)
        if abs(be - fe) > ALLOWED_DELTA:
            failures.append(
                f"  {key}: backend={be}%, frontend={fe}% "
                f"(delta={abs(be - fe):.1f}pp > {ALLOWED_DELTA}pp)"
            )

    if failures:
        print("❌ Coverage threshold drift detected:")
        print("\n".join(failures))
        print(
            "\nFix: align thresholds in pyproject.toml [tool.coverage.report].fail_under"
            "\n     and cli/vite.config.ts coverage.thresholds.*"
        )
        return 1

    print("✅ Coverage thresholds in sync (CLI↔backend)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
