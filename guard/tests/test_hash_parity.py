"""
Parity tests for guard.status.hash_local_path against cli/src/hash.js.

The Python port must produce byte-identical digests to Node's hashLocalPath:
sorted recursive walk (JS UTF-16 code-unit sort order), hash.update(path
string) then hash.update(file bytes), path strings built like Node's
path.join recursion. Node-comparison cases skip cleanly when node is absent.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

from guard.status import _node_path_join, hash_local_path

_HASH_JS = Path(__file__).resolve().parents[2] / "cli" / "src" / "hash.js"

_NODE = shutil.which("node")

requires_node = pytest.mark.skipif(
    _NODE is None or not _HASH_JS.is_file(),
    reason="node (or cli/src/hash.js) not available for parity comparison",
)


def _node_hash(target: str) -> str:
    script = (
        f"import({str(_HASH_JS)!r}).then(async m => "
        "console.log(await m.hashLocalPath(process.argv[1])))"
    )
    assert _NODE is not None
    out = subprocess.run(
        [_NODE, "-e", script, target],
        capture_output=True,
        text=True,
        check=True,
        timeout=30,
    )
    return out.stdout.strip()


def _build_tree(root: Path) -> None:
    """Nested dirs + sort-order-sensitive names (case, digits, dotfiles)."""
    (root / "a_dir" / "nested").mkdir(parents=True)
    (root / "b_dir").mkdir()
    (root / "empty_dir").mkdir()  # contributes nothing, like Node
    files = {
        "zeta.txt": b"zeta",
        "Alpha.txt": b"alpha-upper",  # 'A' (0x41) sorts before 'a' (0x61)
        "Zebra.md": b"zebra",
        ".hidden": b"dotfile",  # '.' (0x2E) sorts before letters
        "a_dir/inner.bin": bytes(range(256)),
        "a_dir/nested/deep.txt": b"deep contents\n",
        "b_dir/b10.txt": b"b-ten",  # 'b10' < 'b2' in code-unit order
        "b_dir/b2.txt": b"b-two",
        "b_dir/B.txt": b"b-upper",
    }
    for rel, content in files.items():
        (root / rel).write_bytes(content)


@requires_node
def test_given_nested_tree_when_hashed_then_matches_node(tmp_path: Path) -> None:
    _build_tree(tmp_path)

    assert hash_local_path(str(tmp_path)) == _node_hash(str(tmp_path))


@requires_node
def test_given_trailing_slash_target_when_hashed_then_matches_node(tmp_path: Path) -> None:
    """path.join normalizes the doubled slash the same way in both ports."""
    _build_tree(tmp_path)
    target = str(tmp_path) + "/"

    assert hash_local_path(target) == _node_hash(target)


@requires_node
def test_given_single_file_target_when_hashed_then_matches_node(tmp_path: Path) -> None:
    target = tmp_path / "only.txt"
    target.write_bytes(b"single file contents")

    assert hash_local_path(str(target)) == _node_hash(str(target))


@requires_node
def test_given_real_fixture_skill_when_hashed_then_matches_node() -> None:
    fixture = Path(__file__).resolve().parents[2] / "fixtures" / "skills" / "safe-changelog-writer"
    if not fixture.is_dir():
        pytest.skip("fixture skill not present")

    assert hash_local_path(str(fixture)) == _node_hash(str(fixture))


def test_given_same_tree_when_hashed_twice_then_deterministic(tmp_path: Path) -> None:
    _build_tree(tmp_path)

    assert hash_local_path(str(tmp_path)) == hash_local_path(str(tmp_path))


def test_given_renamed_file_when_hashed_then_digest_changes(tmp_path: Path) -> None:
    """Path strings feed the hash: same bytes under a new name ⇒ new digest."""
    _build_tree(tmp_path)
    before = hash_local_path(str(tmp_path))
    (tmp_path / "zeta.txt").rename(tmp_path / "yeta.txt")

    assert hash_local_path(str(tmp_path)) != before


def test_given_modified_file_when_hashed_then_digest_changes(tmp_path: Path) -> None:
    _build_tree(tmp_path)
    before = hash_local_path(str(tmp_path))
    (tmp_path / "a_dir" / "nested" / "deep.txt").write_bytes(b"tampered")

    assert hash_local_path(str(tmp_path)) != before


def test_node_path_join_matches_node_semantics() -> None:
    # Expected values verified against Node: path.join('./foo','bar') === 'foo/bar', etc.
    assert _node_path_join("./foo", "bar") == "foo/bar"
    assert _node_path_join("/a/b/", "c") == "/a/b/c"
    assert _node_path_join("a", "b") == "a/b"
    assert _node_path_join("/a//b", "c") == "/a/b/c"
