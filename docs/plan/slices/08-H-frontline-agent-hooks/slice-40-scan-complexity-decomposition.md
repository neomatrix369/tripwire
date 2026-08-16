<!-- file: docs/plan/slices/slice-40-scan-complexity-decomposition.md -->
<!-- Source: skills_scanner repo — Slice 40 stub, authored 2026-08-16 during code study session; renumbered from 35 (conflict with H5 Ossprey Access) -->

## Slice: scan() Complexity Decomposition (skills_scanner)

Refactor the monolithic `scan()` orchestrator (CC=55, rank F) into focused single-responsibility
functions; target CC ≤ 15 (rank C) with no behaviour change.

**Project:** `tools-and-utilities/skills_scanner`
**Branch (in skills_scanner):** `slice/40-scan-complexity-decomposition`
**Depends on:** skills_scanner Slice 20c (Tessl CLI Migration)

---

### Files

- `skills_scanner/skills_scanner.py` — `scan()` decomposed into helper functions
- `skills_scanner/skill_utils.py` — may receive extracted helpers that fit the filesystem-utility remit
- `tests/test_skills_scanner.py` — characterisation tests added before refactor; regression tests updated

### Exit criteria

- [ ] `scan()` cyclomatic complexity ≤ 15 (rank C or better) — `uv run radon cc skills_scanner/skills_scanner.py -s`
- [ ] All extracted functions independently testable (each has ≥1 unit test)
- [ ] No behaviour change — all existing tests pass; no new failures introduced
- [ ] `uv run xenon --max-absolute B --max-modules B --max-average A skills_scanner/` passes
- [ ] Characterisation tests written before any refactor changes are committed
- [ ] No print statements outside `display.py` (existing rule preserved)
- [ ] `./scripts/quality-gates.sh` passes (all tiers)

### Commit pattern

```
refactor(slice-40): decompose scan() from CC=55 (rank F) to rank C

- Improves maintainability for remaining 12 PLANNED slices that touch scanner code
- Extracted functions are independently testable; no observable behaviour changed
```

---

### Motivation

`scan()` in `skills_scanner.py` has cyclomatic complexity 55 (rank F). It handles seven distinct
concerns in a single 284-line function: discovery loop, skip-set guard, hash-change check,
symlink/hard-link detection, metadata extraction, full Tessl lifecycle dispatch, and checkpoint +
tracker flush. This was flagged as technical debt in the original TRAIL.md scope and confirmed by
the 2026-08-16 code study.

12 PLANNED slices (20c through 34) will touch `skills_scanner.py`. Each one is cheaper to
implement, review, and test if `scan()` is an orchestration shell calling well-named, testable
helpers rather than a 284-line monolith. This slice pays the debt before those slices accrue it.

Depends on 20c: the Tessl CLI migration changes the tessl-dispatch calls inside `scan()`; refactoring
before that lands would create a merge conflict. Decomposition happens after 20c is on main.

### Spec (GWT / User Story)

As a developer maintaining the skills scanner, I want `scan()` to be a thin orchestration shell
calling well-named single-responsibility functions so that each concern can be read, tested, and
changed in isolation.

**Scenario: discovery filter is independently testable**
  Given a mix of directories (hidden, no SKILL.md, valid skill, symlink)
  When `_discover_skill_entries(scan_root)` is called
  Then only directories that pass all three gates are returned (is_dir, no dot-prefix, has SKILL.md)

**Scenario: hash guard short-circuits unchanged skills**
  Given a skill whose folder hash matches the cached value in the tracker
  When `_hash_unchanged(entry, tracker)` is called
  Then it returns True and scan() skips the Tessl lifecycle for that skill

**Scenario: symlink and hard-link detection is isolated**
  Given a skill directory that is a symlink
  When `_collect_link_info(entry_path)` is called
  Then it returns `{is_symlink: True, canonical_path: <resolved>, hard_linked: <bool>, source_path: <str>}`

**Scenario: Tessl lifecycle dispatch is a named step**
  Given a new or changed skill entry
  When `_run_tessl_lifecycle(entry, tracker_entry, display)` is called
  Then all Tessl CLI calls execute in order and the tracker_entry dict is mutated with results

**Scenario: checkpoint write is encapsulated**
  Given a skill has just been processed
  When `_write_checkpoint(abs_path, checkpoint_file)` is called
  Then the checkpoint JSON is written atomically and the skill path is in the resulting file

**Scenario: overall behaviour is unchanged**
  Given the same skill directories as before the refactor
  When `scan()` is run end-to-end
  Then `skills_tracker.json` contains identical data to a pre-refactor baseline

### Before-Checks

- [ ] skills_scanner Slice 20c is ✅ PASSED (dependency)
- [ ] `uv run radon cc skills_scanner/skills_scanner.py -s` confirms current CC ≥ 50 (baseline)
- [ ] Existing tests pass on main: `uv run pytest -q`
- [ ] Branch created: `git checkout -b slice/35-scan-complexity-decomposition`

### TDD Execution

**Phase RED — characterisation tests first (before any production change)**

1. Write `tests/test_scan_characterisation.py` calling `scan()` with a fixture skill directory;
   assert tracker output matches a golden snapshot. Locks observable behaviour.
2. Run — must pass on main (tests describe current behaviour, not desired refactor).
3. Commit: `test(slice-35): add characterisation tests locking scan() observable behaviour`

**Phase GREEN — extract helpers one at a time**

For each extracted function (suggested order):
1. Write a unit test for the function (RED).
2. Extract the function from `scan()` and call it from `scan()` in place (GREEN).
3. Run all tests — must stay green after each extraction.
4. Commit per extraction: `refactor(slice-35): extract <function_name> from scan()`

Suggested extraction order (lowest coupling first):
1. `_discover_skill_entries(scan_root)` → discovery + gate logic
2. `_hash_unchanged(entry_path, cached_hash)` → hash-comparison guard
3. `_collect_link_info(entry_path)` → symlink + hard-link detection (wraps existing helpers)
4. `_extract_skill_metadata(skill_path)` → thin wrapper over `extract_metadata_from_skill()`
5. `_write_checkpoint(abs_path, checkpoint_file)` → atomic checkpoint write
6. `_flush_tracker_if_dirty(tracker, tracker_file, dirty)` → conditional atomic write
7. `_run_tessl_lifecycle(entry_path, tracker_entry)` → all Tessl CLI calls in sequence

**Phase REFACTOR — simplify scan() shell**

After all extractions: `scan()` should read as a linear sequence of named steps (~30 lines).
Run `uv run radon cc skills_scanner/skills_scanner.py -s` — confirm rank C or better.

### After-Checks

- [ ] `uv run radon cc skills_scanner/skills_scanner.py -s` shows `scan` rated C or better (CC ≤ 15)
- [ ] `uv run xenon --max-absolute B --max-modules B --max-average A skills_scanner/` passes
- [ ] All existing tests pass: `uv run pytest -q`
- [ ] Characterisation tests pass (golden snapshot unchanged)
- [ ] Each extracted function has ≥1 unit test
- [ ] No print statements outside `display.py`
- [ ] Specification coverage: every GWT clause has ≥1 test
- [ ] Branch coverage: 100% target; fail_under=100; exclusions documented
- [ ] Complexity evidence: policy `enforcing`; tool `xenon` + `radon`
- [ ] `./scripts/quality-gates.sh` passes all tiers

### Gate Status

📋 PLANNED — blocked on skills_scanner Slice 20c (Q-04 probe)
