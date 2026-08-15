"""
Tests for guard.entry — payload extraction, artifact resolution, decisions,
and the main() stdin→stdout contract (one dual-shape JSON line, exit 0 always).
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path
from typing import Any

import pytest

from guard import entry


def _skill_payload(**tool_input: Any) -> dict:
    return {"tool_name": "Skill", "tool_input": tool_input}


# ─── extract_target ──────────────────────────────────────────────────────────


def test_given_skill_key_then_skill_target_extracted() -> None:
    assert entry.extract_target(_skill_payload(skill="tw-scan")) == {
        "kind": "skill",
        "name": "tw-scan",
    }


@pytest.mark.parametrize("key", ["skill", "command", "name", "skillName"])
def test_given_each_candidate_key_then_name_found(key: str) -> None:
    target = entry.extract_target(_skill_payload(**{key: "my-skill"}))

    assert target == {"kind": "skill", "name": "my-skill"}


def test_given_multiple_keys_then_documented_order_wins() -> None:
    payload = _skill_payload(skillName="last", skill="first", command="second")

    assert entry.extract_target(payload)["name"] == "first"


def test_given_command_with_slash_and_args_then_first_token_is_name() -> None:
    payload = _skill_payload(command="/tw-scan foo --force")

    assert entry.extract_target(payload) == {"kind": "skill", "name": "tw-scan"}


def test_given_skill_with_unrecognizable_input_then_none() -> None:
    assert entry.extract_target(_skill_payload(other="x")) is None
    assert entry.extract_target({"tool_name": "Skill"}) is None
    assert entry.extract_target({"tool_name": "Skill", "tool_input": "raw"}) is None


def test_given_mcp_tool_name_then_server_extracted() -> None:
    payload = {"tool_name": "mcp__safe-time-server__get_time", "tool_input": {}}

    assert entry.extract_target(payload) == {"kind": "mcp", "name": "safe-time-server"}


def test_given_mcp_server_name_containing_dunder_then_only_tool_stripped() -> None:
    payload = {"tool_name": "mcp__my__server__tool", "tool_input": {}}

    assert entry.extract_target(payload) == {"kind": "mcp", "name": "my__server"}


def test_given_mcp_name_without_tool_segment_then_whole_remainder_is_server() -> None:
    payload = {"tool_name": "mcp__solo", "tool_input": {}}

    assert entry.extract_target(payload) == {"kind": "mcp", "name": "solo"}


def test_given_non_target_tool_then_none() -> None:
    assert entry.extract_target({"tool_name": "Bash", "tool_input": {"command": "ls"}}) is None
    assert entry.extract_target({}) is None


def test_given_bash_command_with_user_skill_path_then_skill_target(
    fake_home: Path, tmp_path: Path
) -> None:
    skill_dir = _install_skill(fake_home, "vuln-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")
    payload = {
        "tool_name": "Bash",
        "tool_input": {"command": f"bash {skill_dir}/install.sh"},
    }

    assert entry.extract_target(payload, cwd=str(tmp_path)) == {
        "kind": "skill",
        "name": "vuln-skill",
    }


def test_given_bash_cwd_inside_skill_then_relative_script_attributed(
    fake_home: Path, tmp_path: Path
) -> None:
    skill_dir = _install_skill(fake_home, "vuln-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")
    payload = {
        "tool_name": "Bash",
        "tool_input": {"command": "bash ./install.sh"},
        "cwd": str(skill_dir),
    }

    assert entry.extract_target(payload, cwd=str(tmp_path)) == {
        "kind": "skill",
        "name": "vuln-skill",
    }


def test_given_bash_tilde_skill_path_then_skill_target(fake_home: Path, tmp_path: Path) -> None:
    skill_dir = _install_skill(fake_home, "vuln-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")
    payload = {
        "tool_name": "Bash",
        "tool_input": {"command": "bash ~/.claude/skills/vuln-skill/install.sh"},
    }

    assert entry.extract_target(payload, cwd=str(tmp_path)) == {
        "kind": "skill",
        "name": "vuln-skill",
    }


def test_given_bash_skill_dir_only_as_data_arg_then_no_target(
    fake_home: Path, tmp_path: Path
) -> None:
    """
    Scenario: Status/scan driver Bash that only passes a skill directory as a
    data argument is not attributed — otherwise unscanned skills deadlock
    /tw-verify and /tw-scan (the status query itself would be denied).
    Slice: Bash skill-path attribution — directory-as-data exemption

    Given a Bash command that names a skill directory only as an argv to an
    unrelated interpreter (uv/python status driver shape),
    When extract_target maps the payload,
    Then no skill target is returned (ordinary Bash / not gated).
    """
    ### Given
    skill_dir = _install_skill(fake_home, "vuln-skill")
    payload = {
        "tool_name": "Bash",
        "tool_input": {
            "command": (f'uv run --extra guard python -c "print(1)" {skill_dir}'),
        },
    }

    ### When
    actual = entry.extract_target(payload, cwd=str(tmp_path))

    ### Then
    assert actual is None, f"skill directory as data argv must not attribute; got {actual!r}"


def test_given_bash_cd_skill_dir_and_run_install_then_skill_target(
    fake_home: Path, tmp_path: Path
) -> None:
    """
    Scenario: cd into a skill then run install.sh is still attributed.
    Slice: Bash skill-path attribution — compound cd + script

    Given a Bash command that cds into an unscanned skill and runs install.sh,
    When extract_target maps the payload,
    Then the owning skill is the target (fail-closed for unscanned/RED).
    """
    ### Given
    skill_dir = _install_skill(fake_home, "vuln-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")
    payload = {
        "tool_name": "Bash",
        "tool_input": {
            "command": f"cd {skill_dir} && bash install.sh",
        },
    }

    ### When
    actual = entry.extract_target(payload, cwd=str(tmp_path))

    ### Then
    assert actual == {"kind": "skill", "name": "vuln-skill"}


# ─── resolve_artifact: skills ────────────────────────────────────────────────


@pytest.fixture
def fake_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    return home


def _install_skill(root: Path, dirname: str, frontmatter_name: str | None = None) -> Path:
    skill_dir = root / ".claude" / "skills" / dirname
    skill_dir.mkdir(parents=True)
    name = frontmatter_name or dirname
    (skill_dir / "SKILL.md").write_text(f"---\nname: {name}\ndescription: test\n---\nbody\n")
    return skill_dir


def test_given_user_skill_dir_then_realpath_returned(fake_home: Path, tmp_path: Path) -> None:
    skill_dir = _install_skill(fake_home, "tw-verify")

    resolved = entry.resolve_artifact({"kind": "skill", "name": "tw-verify"}, str(tmp_path))

    assert resolved == os.path.realpath(str(skill_dir))


def test_given_project_skill_dir_then_resolved_from_cwd(fake_home: Path, tmp_path: Path) -> None:
    cwd = tmp_path / "project"
    cwd.mkdir()
    skill_dir = _install_skill(cwd, "proj-skill")

    resolved = entry.resolve_artifact({"kind": "skill", "name": "proj-skill"}, str(cwd))

    assert resolved == os.path.realpath(str(skill_dir))


def test_given_frontmatter_name_differs_then_frontmatter_match_wins(
    fake_home: Path, tmp_path: Path
) -> None:
    """§5.1: dir name and frontmatter name can differ — both must resolve."""
    skill_dir = _install_skill(fake_home, "drifted-dir-v2", frontmatter_name="real-name")

    resolved = entry.resolve_artifact({"kind": "skill", "name": "real-name"}, str(tmp_path))

    assert resolved == os.path.realpath(str(skill_dir))


def test_given_unknown_skill_then_none(fake_home: Path, tmp_path: Path) -> None:
    assert entry.resolve_artifact({"kind": "skill", "name": "ghost"}, str(tmp_path)) is None


@pytest.mark.parametrize(
    "name",
    [
        "../../hackathonProjects/tripwire/fixtures/skills/safe-changelog-writer",
        "../evil",
        "..",
        ".",
        "a/b",
        "a\\b",
        "/abs/path",
        "..hidden",
    ],
)
def test_given_traversal_skill_name_then_none(fake_home: Path, tmp_path: Path, name: str) -> None:
    """Regression (review finding, entry.py:114): names carrying separators or
    '..' must be rejected before joining — a crafted skill name must never
    resolve outside the skills roots to borrow another artifact's verdict."""
    _install_skill(fake_home, "legit-skill")

    assert entry.resolve_artifact({"kind": "skill", "name": name}, str(tmp_path)) is None


def test_given_symlinked_skill_dir_escaping_root_then_none(fake_home: Path, tmp_path: Path) -> None:
    """Containment defense-in-depth: a well-formed name whose dir is a symlink
    OUT of the skills root must not resolve (realpath escapes the root)."""
    outside = tmp_path / "outside-dir"
    outside.mkdir()
    (outside / "SKILL.md").write_text("---\nname: escapee\n---\nbody\n")
    skills_root = fake_home / ".claude" / "skills"
    skills_root.mkdir(parents=True)
    (skills_root / "escapee").symlink_to(outside, target_is_directory=True)

    assert entry.resolve_artifact({"kind": "skill", "name": "escapee"}, str(tmp_path)) is None


# ─── resolve_artifact: MCP servers (key-only identity) ───────────────────────


def test_given_project_mcp_json_entry_with_local_path_args_then_key_identifier(
    fake_home: Path, tmp_path: Path
) -> None:
    """MCP identity is the CONFIG KEY even when command/args carry real local
    paths — never a directory derived from them."""
    cwd = tmp_path / "project"
    server_dir = cwd / "servers" / "my-server"
    server_dir.mkdir(parents=True)
    (server_dir / "run.sh").write_text("#!/bin/bash\n")
    (cwd / ".mcp.json").write_text(
        json.dumps(
            {"mcpServers": {"my-server": {"command": "bash", "args": ["servers/my-server/run.sh"]}}}
        )
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "my-server"}, str(cwd))

    assert resolved == "my-server"


def test_given_crafted_mcp_args_pointing_at_green_dir_then_key_not_path(
    fake_home: Path, tmp_path: Path
) -> None:
    """Regression (review finding, entry.py:165): an attacker-controlled entry
    whose args point INTO an already-scanned (green) directory must resolve by
    KEY — path derivation let the server borrow that directory's verdict."""
    green_dir = _install_skill(fake_home, "green-skill")
    cwd = tmp_path / "project"
    cwd.mkdir()
    (cwd / ".mcp.json").write_text(
        json.dumps(
            {
                "mcpServers": {
                    "sneaky": {
                        "command": "node",
                        "args": [
                            "--require",
                            str(green_dir / "SKILL.md"),
                            "/attacker/malicious-server.js",
                        ],
                    }
                }
            }
        )
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "sneaky"}, str(cwd))

    assert resolved == "sneaky"
    assert resolved != os.path.realpath(str(green_dir))


def test_given_mcp_args_naming_etc_hosts_then_key_not_etc(fake_home: Path, tmp_path: Path) -> None:
    """The verifier's minimal repro: args=['/etc/hosts'] must never resolve to
    '/etc' — the key is the identity."""
    cwd = tmp_path / "project"
    cwd.mkdir()
    (cwd / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"hosts-server": {"command": "cat", "args": ["/etc/hosts"]}}})
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "hosts-server"}, str(cwd))

    assert resolved == "hosts-server"


def test_given_mcp_entry_with_no_local_path_then_key_string(
    fake_home: Path, tmp_path: Path
) -> None:
    cwd = tmp_path / "project"
    cwd.mkdir()
    (cwd / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"remote-npx": {"command": "npx", "args": ["-y", "@x/pkg"]}}})
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "remote-npx"}, str(cwd))

    assert resolved == "remote-npx"


def test_given_user_claude_json_then_resolved(fake_home: Path, tmp_path: Path) -> None:
    (fake_home / ".claude.json").write_text(
        json.dumps({"mcpServers": {"user-server": {"command": "npx", "args": ["-y", "@u/pkg"]}}})
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "user-server"}, str(tmp_path))

    assert resolved == "user-server"


def test_given_claude_json_project_scoped_server_then_resolved(
    fake_home: Path, tmp_path: Path
) -> None:
    """~/.claude.json also stores per-project servers under
    projects[<cwd>].mcpServers — those enforceable keys must resolve too."""
    cwd = tmp_path / "project"
    cwd.mkdir()
    (fake_home / ".claude.json").write_text(
        json.dumps(
            {
                "mcpServers": {},
                "projects": {
                    str(cwd): {"mcpServers": {"proj-server": {"command": "npx", "args": ["-y"]}}},
                    "/some/other/project": {"mcpServers": {"other-server": {"command": "npx"}}},
                },
            }
        )
    )

    assert entry.resolve_artifact({"kind": "mcp", "name": "proj-server"}, str(cwd)) == "proj-server"
    # Another project's servers are NOT in scope for this cwd.
    assert entry.resolve_artifact({"kind": "mcp", "name": "other-server"}, str(cwd)) is None


def test_given_demo_manifest_server_then_key_resolved(fake_home: Path, tmp_path: Path) -> None:
    """~/.tripwire/demo-mcp.json (written by install-demo-artifacts.sh) is a
    resolution locus — demo tool keys resolve by name."""
    tripwire_dir = fake_home / ".tripwire"
    tripwire_dir.mkdir()
    (tripwire_dir / "demo-mcp.json").write_text(
        json.dumps({"mcpServers": {"safe-tool": {"command": "bash", "args": ["run.sh"]}}})
    )

    resolved = entry.resolve_artifact({"kind": "mcp", "name": "safe-tool"}, str(tmp_path))

    assert resolved == "safe-tool"


def test_given_fixtures_manifest_server_then_key_resolved(fake_home: Path, tmp_path: Path) -> None:
    """Fixtures manifest fallback resolves to the bare key — the identifier
    the scan stored (content_hash 'pending:<key>'), not a fixture dir path."""
    resolved = entry.resolve_artifact({"kind": "mcp", "name": "safe-time-server"}, str(tmp_path))

    assert resolved == "safe-time-server"


def test_given_unknown_mcp_server_then_none(fake_home: Path, tmp_path: Path) -> None:
    assert entry.resolve_artifact({"kind": "mcp", "name": "nope"}, str(tmp_path)) is None


# ─── resolve_operator_name (/tw-verify|/tw-scan) ─────────────────────────────


def test_given_demo_mcp_key_when_operator_resolve_then_found(
    fake_home: Path, tmp_path: Path
) -> None:
    """
    Scenario: Operator names like safe-tool resolve via demo-mcp.json without
    hand-searching loci (the LLM locus walk was producing false NOT FOUND).
    Slice: resolve_operator_name — MCP demo keys

    Given ~/.tripwire/demo-mcp.json lists safe-tool,
    When resolve_operator_name is called with that bare key,
    Then the identifier is the config key and kind is mcp.
    """
    ### Given
    tripwire_dir = fake_home / ".tripwire"
    tripwire_dir.mkdir()
    (tripwire_dir / "demo-mcp.json").write_text(
        json.dumps({"mcpServers": {"safe-tool": {"command": "bash", "args": ["run.sh"]}}})
    )

    ### When
    resolved = entry.resolve_operator_name("safe-tool", str(tmp_path))

    ### Then
    assert resolved == {
        "identifier": "safe-tool",
        "kind": "mcp",
        "resolved_as": "safe-tool",
    }, f"Expected demo MCP key resolution, got {resolved!r}"


def test_given_fixture_alias_when_operator_resolve_then_demo_skill(
    fake_home: Path, tmp_path: Path
) -> None:
    """
    Scenario: Fixture basename vuln-runtime-download aliases to installed vuln-skill.
    Slice: resolve_operator_name — demo skill aliases

    Given vuln-skill is installed under ~/.claude/skills,
    When the operator asks for the fixture name vuln-runtime-download,
    Then resolution lands on the installed vuln-skill directory.
    """
    ### Given
    skill_dir = _install_skill(fake_home, "vuln-skill")

    ### When
    resolved = entry.resolve_operator_name("vuln-runtime-download", str(tmp_path))

    ### Then
    assert resolved is not None
    assert resolved["identifier"] == os.path.realpath(str(skill_dir))
    assert resolved["kind"] == "skill"
    assert resolved["resolved_as"] == "vuln-skill"
    assert resolved["alias_of"] == "vuln-runtime-download"


def test_given_unknown_operator_name_then_none(fake_home: Path, tmp_path: Path) -> None:
    ### Given / When
    resolved = entry.resolve_operator_name("nope-not-installed", str(tmp_path))

    ### Then
    assert resolved is None


# ─── decide ──────────────────────────────────────────────────────────────────


CONFIG = {
    "schema_version": 1,
    "enable": True,
    "scan_validity_days": 14,
    "repo_root": "/repo",
    "cli_bin": "/repo/cli/bin/tripwire.js",
    "env_file": "/repo/.env",
    "uv_bin": "/usr/local/bin/uv",
}


def test_given_green_artifact_then_decide_allows(fake_home: Path, tmp_path: Path) -> None:
    _install_skill(fake_home, "good-skill")
    calls: list[tuple] = []

    def check_fn(identifier: str, validity_days: int, content_path: str | None = None) -> dict:
        calls.append((identifier, validity_days, content_path))
        return {"allow": True, "reason": "rated green — below threshold", "status": "green"}

    decision = entry.decide(
        _skill_payload(skill="good-skill"), CONFIG, cwd=str(tmp_path), check_fn=check_fn
    )

    assert decision["allow"] is True
    identifier, validity_days, content_path = calls[0]
    assert identifier == os.path.realpath(str(fake_home / ".claude" / "skills" / "good-skill"))
    assert validity_days == 14
    assert content_path == identifier  # dir identifiers get the tamper check


def test_given_denied_artifact_then_reason_carries_remedies(
    fake_home: Path, tmp_path: Path
) -> None:
    _install_skill(fake_home, "bad-skill")

    def check_fn(*_args: Any, **_kwargs: Any) -> dict:
        return {"allow": False, "reason": "rated red — at/above threshold", "status": "red"}

    decision = entry.decide(
        _skill_payload(skill="bad-skill"), CONFIG, cwd=str(tmp_path), check_fn=check_fn
    )

    assert decision["allow"] is False
    reason = decision["reason"]
    assert "rated red" in reason
    assert "bad-skill" in reason
    assert "/tw-scan bad-skill" in reason  # in-session remedy
    assert "/tw-disable" in reason
    assert "node /repo/cli/bin/tripwire.js scan" in reason  # out-of-band remedy
    assert '"enable": false' in reason


def test_given_unresolvable_skill_then_deny_names_it(fake_home: Path, tmp_path: Path) -> None:
    def check_fn(*_args: Any, **_kwargs: Any) -> dict:
        raise AssertionError("check_fn must not run for unresolved artifacts")

    decision = entry.decide(
        _skill_payload(skill="ghost-skill"), CONFIG, cwd=str(tmp_path), check_fn=check_fn
    )

    assert decision["allow"] is False
    assert "ghost-skill" in decision["reason"]
    assert "/tw-disable" in decision["reason"]


def test_given_skill_payload_with_no_name_then_deny(tmp_path: Path) -> None:
    decision = entry.decide(_skill_payload(bogus=1), CONFIG, cwd=str(tmp_path))

    assert decision["allow"] is False


def test_given_non_target_tool_then_allow(tmp_path: Path) -> None:
    decision = entry.decide(
        {"tool_name": "Bash", "tool_input": {"command": "ls"}}, CONFIG, cwd=str(tmp_path)
    )

    assert decision["allow"] is True


def test_given_bash_running_blocked_skill_script_then_deny(fake_home: Path, tmp_path: Path) -> None:
    skill_dir = _install_skill(fake_home, "vuln-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")
    seen: dict[str, Any] = {}

    def check_fn(identifier: str, validity_days: int, content_path: str | None = None) -> dict:
        seen.update(identifier=identifier, content_path=content_path)
        return {"allow": False, "reason": "never scanned — guard fails closed", "status": "grey"}

    decision = entry.decide(
        {
            "tool_name": "Bash",
            "tool_input": {"command": f"bash {skill_dir}/install.sh"},
        },
        CONFIG,
        cwd=str(tmp_path),
        check_fn=check_fn,
    )

    assert decision["allow"] is False
    assert "vuln-skill" in decision["reason"]
    assert seen["identifier"] == str(skill_dir.resolve())
    assert seen["content_path"] == seen["identifier"]


def test_given_bash_running_allowed_skill_script_then_allow(
    fake_home: Path, tmp_path: Path
) -> None:
    skill_dir = _install_skill(fake_home, "safe-skill")
    (skill_dir / "install.sh").write_text("#!/bin/sh\necho setup\n")

    def check_fn(identifier: str, validity_days: int, content_path: str | None = None) -> dict:
        return {"allow": True, "reason": "rated green — below threshold", "status": "green"}

    decision = entry.decide(
        {
            "tool_name": "Bash",
            "tool_input": {"command": f"bash {skill_dir}/install.sh"},
        },
        CONFIG,
        cwd=str(tmp_path),
        check_fn=check_fn,
    )

    assert decision["allow"] is True


def test_given_key_string_identifier_then_no_content_path(fake_home: Path, tmp_path: Path) -> None:
    cwd = tmp_path / "project"
    cwd.mkdir()
    (cwd / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"remote": {"command": "npx", "args": ["-y", "@x/y"]}}})
    )
    seen: dict[str, Any] = {}

    def check_fn(identifier: str, validity_days: int, content_path: str | None = None) -> dict:
        seen.update(identifier=identifier, content_path=content_path)
        return {"allow": True, "reason": "ok", "status": "green"}

    entry.decide(
        {"tool_name": "mcp__remote__call", "tool_input": {}},
        CONFIG,
        cwd=str(cwd),
        check_fn=check_fn,
    )

    assert seen["identifier"] == "remote"
    assert seen["content_path"] is None


def test_given_mcp_key_naming_real_directory_then_content_path_still_none(
    fake_home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """MCP identifiers are bare keys and must NEVER acquire a filesystem
    identity — even a key that happens to name a directory relative to the
    process cwd gets content_path=None (no dir hash-tamper check; MCP rows
    store 'pending:<key>' hashes)."""
    cwd = tmp_path / "project"
    cwd.mkdir()
    (cwd / "trap").mkdir()  # a dir whose name collides with the server key
    (cwd / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"trap": {"command": "npx", "args": ["-y", "@x/y"]}}})
    )
    monkeypatch.chdir(cwd)
    seen: dict[str, Any] = {}

    def check_fn(identifier: str, validity_days: int, content_path: str | None = None) -> dict:
        seen.update(identifier=identifier, content_path=content_path)
        return {"allow": True, "reason": "ok", "status": "green"}

    entry.decide(
        {"tool_name": "mcp__trap__call", "tool_input": {}},
        CONFIG,
        cwd=str(cwd),
        check_fn=check_fn,
    )

    assert seen["identifier"] == "trap"
    assert seen["content_path"] is None


# ─── format_decision / main ──────────────────────────────────────────────────


def _run_main(
    monkeypatch: pytest.MonkeyPatch,
    config_path: Path,
    payload: Any,
) -> tuple[int, dict]:
    monkeypatch.setenv("TRIPWIRE_CONFIG", str(config_path))
    stdin = io.StringIO(payload if isinstance(payload, str) else json.dumps(payload))
    stdout = io.StringIO()
    code = entry.main(stdin=stdin, stdout=stdout)
    lines = [line for line in stdout.getvalue().splitlines() if line.strip()]
    assert len(lines) == 1, "main must print exactly ONE decision line"
    return code, json.loads(lines[0])


def _write_config(tmp_path: Path, **overrides: Any) -> Path:
    config = dict(CONFIG)
    config.update(overrides)
    path = tmp_path / "config.json"
    path.write_text(json.dumps(config))
    return path


def test_given_enable_false_then_main_allows(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_path = _write_config(tmp_path, enable=False)

    code, out = _run_main(monkeypatch, config_path, _skill_payload(skill="anything"))

    assert code == 0
    assert out["hookSpecificOutput"]["permissionDecision"] == "allow"
    assert out["hookSpecificOutput"]["hookEventName"] == "PreToolUse"
    assert out["decision"] == "approve"


def test_given_missing_config_then_main_denies_tamper(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    code, out = _run_main(monkeypatch, tmp_path / "nope.json", _skill_payload(skill="x"))

    assert code == 0
    assert out["hookSpecificOutput"]["permissionDecision"] == "deny"
    assert "missing/corrupt" in out["hookSpecificOutput"]["permissionDecisionReason"]
    assert out["decision"] == "block"
    assert out["reason"] == out["hookSpecificOutput"]["permissionDecisionReason"]


def test_given_corrupt_config_then_main_denies_tamper(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_path = tmp_path / "config.json"
    config_path.write_text("{not json")

    code, out = _run_main(monkeypatch, config_path, _skill_payload(skill="x"))

    assert code == 0
    assert out["hookSpecificOutput"]["permissionDecision"] == "deny"


def test_given_invalid_stdin_then_main_denies_and_exits_zero(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_path = _write_config(tmp_path)

    code, out = _run_main(monkeypatch, config_path, "this is not json")

    assert code == 0
    assert out["hookSpecificOutput"]["permissionDecision"] == "deny"
    assert "fail closed" in out["reason"]


def test_given_decide_crashing_then_main_denies_and_exits_zero(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    config_path = _write_config(tmp_path)

    def boom(*_args: Any, **_kwargs: Any) -> dict:
        raise RuntimeError("unexpected")

    monkeypatch.setattr(entry, "decide", boom)

    code, out = _run_main(monkeypatch, config_path, _skill_payload(skill="x"))

    assert code == 0
    assert out["hookSpecificOutput"]["permissionDecision"] == "deny"


def test_given_allowed_call_then_main_emits_dual_shape_allow(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, fake_home: Path
) -> None:
    _install_skill(fake_home, "good-skill")
    config_path = _write_config(tmp_path)
    monkeypatch.setattr(
        entry,
        "check_call_by_identifier",
        lambda *_a, **_k: {"allow": True, "reason": "rated green", "status": "green"},
    )
    monkeypatch.chdir(tmp_path)

    code, out = _run_main(monkeypatch, config_path, _skill_payload(skill="good-skill"))

    assert code == 0
    assert out == {
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow"},
        "decision": "approve",
    }


def test_given_blocked_call_then_main_emits_dual_shape_deny(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, fake_home: Path
) -> None:
    _install_skill(fake_home, "bad-skill")
    config_path = _write_config(tmp_path)
    monkeypatch.setattr(
        entry,
        "check_call_by_identifier",
        lambda *_a, **_k: {"allow": False, "reason": "never scanned", "status": "grey"},
    )
    monkeypatch.chdir(tmp_path)

    code, out = _run_main(monkeypatch, config_path, _skill_payload(skill="bad-skill"))

    assert code == 0
    deny = out["hookSpecificOutput"]
    assert deny["permissionDecision"] == "deny"
    assert "never scanned" in deny["permissionDecisionReason"]
    assert out["decision"] == "block"
    assert out["reason"] == deny["permissionDecisionReason"]
