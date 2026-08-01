"""Unit tests for _acquire_target dispatch logic.

Tests the three paths (git clone, local copy, introspection-only) using
tmp dirs and subprocess mocking — no network, no Modal, no Supabase.
"""

import os
import subprocess
import sys
import types
from unittest.mock import patch

import pytest

# scan_app imports `modal` and `supabase` at module level; stub them so the
# test suite works without those heavy dependencies installed.
for _mod in ("modal", "supabase"):
    if _mod not in sys.modules:
        sys.modules[_mod] = types.ModuleType(_mod)

# modal.App, modal.Image, modal.Secret — used at import-time by scan_app
_modal = sys.modules["modal"]


class _FakeImage:
    def debian_slim(self, **kw):
        return self

    def apt_install(self, *a):
        return self

    def run_commands(self, *a):
        return self

    def pip_install(self, *a):
        return self


class _FakeApp:
    def __init__(self, *a, **kw):
        pass

    def function(self, **kw):
        def decorator(fn):
            return fn

        return decorator


class _FakeSecret:
    @staticmethod
    def from_name(n):
        return n


_modal.App = _FakeApp  # type: ignore[attr-defined]
_modal.Image = _FakeImage()  # type: ignore[attr-defined]
_modal.Secret = _FakeSecret  # type: ignore[attr-defined]

from scan_app import _acquire_target, _is_git_url  # noqa: E402

# ── _is_git_url classification ──────────────────────────────────────────────


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/org/repo.git",
        "https://github.com/org/repo",
        "git://github.com/org/repo.git",
        "git@github.com:org/repo.git",
        "ssh://git@github.com/org/repo.git",
        "https://gitlab.example.com/team/project",
    ],
)
def test_is_git_url_recognises_git_urls(url):
    assert _is_git_url(url) is True


@pytest.mark.parametrize(
    "target",
    [
        "/tmp/local-skill",
        "./relative/path",
        "stdio://some-mcp-server",
        "http://mcp-server.example.com:8080/sse",
    ],
)
def test_is_git_url_rejects_non_git_targets(target):
    assert _is_git_url(target) is False


# ── Git clone path ──────────────────────────────────────────────────────────


def test_acquire_target_clones_git_url(tmp_path):
    workdir = str(tmp_path / "scan-target")
    fake_result = subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")

    with patch("scan_app.subprocess.run", return_value=fake_result) as mock_run:
        _acquire_target("https://github.com/org/repo.git", "skill", workdir)

    mock_run.assert_called_once()
    args = mock_run.call_args[0][0]
    assert args[0] == "git"
    assert "clone" in args
    assert "--depth" in args
    assert "https://github.com/org/repo.git" in args
    assert workdir in args
    assert os.path.isdir(workdir)


def test_acquire_target_raises_on_clone_failure(tmp_path):
    workdir = str(tmp_path / "scan-target")
    fake_result = subprocess.CompletedProcess(
        args=[], returncode=128, stdout="", stderr="fatal: repo not found"
    )

    with patch("scan_app.subprocess.run", return_value=fake_result):
        with pytest.raises(RuntimeError, match="git clone failed"):
            _acquire_target("https://github.com/org/repo.git", "skill", workdir)


# ── Local copy path ─────────────────────────────────────────────────────────


def test_acquire_target_copies_local_directory(tmp_path):
    src = tmp_path / "source-skill"
    src.mkdir()
    (src / "SKILL.md").write_text("# Test skill")
    (src / "sub").mkdir()
    (src / "sub" / "helper.py").write_text("pass")

    workdir = str(tmp_path / "scan-target")
    _acquire_target(str(src), "skill", workdir)

    assert os.path.isfile(os.path.join(workdir, "SKILL.md"))
    assert os.path.isfile(os.path.join(workdir, "sub", "helper.py"))


# ── Introspection-only path ─────────────────────────────────────────────────


def test_acquire_target_creates_empty_workdir_for_introspection(tmp_path):
    workdir = str(tmp_path / "scan-target")
    _acquire_target("stdio://my-mcp-server", "mcp_server", workdir)

    assert os.path.isdir(workdir)
    assert os.listdir(workdir) == []


def test_acquire_target_creates_empty_workdir_for_http_mcp(tmp_path):
    """HTTP MCP servers are introspection-only (not git repos)."""
    workdir = str(tmp_path / "scan-target")
    _acquire_target("http://localhost:8080/sse", "mcp_server", workdir)

    assert os.path.isdir(workdir)
    assert os.listdir(workdir) == []
