from __future__ import annotations

import tomllib
from pathlib import Path

PROJECT_ROOT = Path(__file__).parents[1]


def test_cloudflare_dependencies_use_pywrangler_project_metadata() -> None:
    config = tomllib.loads((PROJECT_ROOT / "pyproject.toml").read_text())
    runtime = config["project"]["dependencies"]
    development = config["dependency-groups"]["dev"]

    assert any(dependency.startswith("httpx") for dependency in runtime)
    assert any(dependency.startswith("workers-py") for dependency in development)
    assert any(dependency.startswith("uv>=0.12.3") for dependency in development)
    assert not (PROJECT_ROOT / "requirements.txt").exists()


def test_deployment_documentation_uses_dependency_aware_wrapper() -> None:
    readme = (PROJECT_ROOT / "README.md").read_text()

    assert "uv run pywrangler deploy" in readme
    assert "uv run pywrangler secret put GITHUB_TOKEN" in readme
