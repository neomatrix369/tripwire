# Slice 29: /tw-scan

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26

## Outcome

`/tw-scan` resolves multiple names like `/tw-verify`, accepts both `--force` and `force` to resubmit over a valid non-stale result, submits via the existing `tripwire scan` API, and returns introspected identifiers from that API.

## Response shape (AT contract)

`guard.scan.scan_artifacts` returns a `ScanResult` with:

| Surface | Contents |
|---------|----------|
| `to_machine()` | dict with **API echo**: `batch_id` (str), `scan_run_ids` (list[str]), `failed_targets` (list[dict]); plus **skill-composed**: `submitted` (list[str] names in request order), `force` (bool — operator flag applied) |
| `to_markdown()` | Human confirmation including every submitted name and the `batch_id` / `scan_run_ids` receipt |

Do **not** invent extra `tripwire scan` stdout fields beyond slice-26 introspection.

## GWT acceptance specification

**DISTILL ATs (2026-08-15, revised after acceptance review)** — ≤7; product-code + Claude skill.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Multi-name submit confirmation | `@US-29` | `guard.scan.scan_artifacts` |
| 2 | `--force` yields new run IDs | `@US-29` | `guard.scan.scan_artifacts` |
| 3 | Bare `force` yields new run IDs | `@US-29` | `guard.scan.parse_scan_args` + `scan_artifacts` |
| 4 | Identifiers returned | `@US-29` | `ScanResult.to_machine()` |
| 5 | Force tokens excluded from submitted | `@US-29` | `parse_scan_args` → `submitted` |
| 6 | Skill shipped at Claude layout | `@US-29` | `.claude/skills/tw-scan/SKILL.md` |
| 7 | Not-found skipped from submit | `@US-29` | `guard.scan.scan_artifacts` |

1. **Multi-name submit** `@US-29`
   - Given two resolvable names,
     when `scan_artifacts` runs,
     then `to_machine()["submitted"]` equals both names in order,
     `to_markdown()` contains both names, and a single submit receives both
     resolved paths.
2. **`--force` works** `@US-29`
   - Given a submit double that returns empty `scan_run_ids` when `force=False`
     and non-empty IDs when `force=True` (fresh/cached resubmit),
     when `scan_artifacts(..., force=True)` runs,
     then `to_machine()["force"]` is true and `scan_run_ids` is a non-empty list.
3. **Bare `force` works** `@US-29`
   - Given tokens `["skill-a", "force"]`,
     when `parse_scan_args` then `scan_artifacts` with the parsed force flag
     and the same force-sensitive submit double as AT-2,
     then `to_machine()["force"]` is true, `submitted == ["skill-a"]`,
     and `scan_run_ids` is non-empty (same effect as `--force`).
4. **Identifiers returned** `@US-29`
   - Given a successful submit returning slice-26 fields,
     when `scan_artifacts` responds,
     then `to_machine()` includes non-empty string `batch_id`,
     list `scan_run_ids`, and list `failed_targets` (may be empty);
     no other API-echo keys beyond those three.
5. **Force tokens not submitted names** `@US-29`
   - Given tokens `["skill-a", "--force", "skill-b", "force"]`,
     when `parse_scan_args` runs,
     then returned names are exactly `["skill-a", "skill-b"]` and `force` is true
     (`"--force"` / `"force"` absent from names).
6. **Skill at Claude layout** `@US-29`
   - Given the repo checkout,
     when an operator reads `.claude/skills/tw-scan/SKILL.md`,
     then the file exists and its text includes `guard.scan.scan_artifacts`,
     `batch_id`, `scan_run_ids`, and `frontline-output-contract`.
7. **Not-found skipped from submit** `@US-29`
   - Given one resolvable name and one unresolved name,
     when `scan_artifacts` runs,
     then submit receives only the resolved path, `submitted` lists only the
     resolved name, and `to_markdown()` mentions the unresolved name as not found.

**Test inventory (7 acceptance tests):**
`guard/tests/test_tw_scan.py`

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_tw_scan.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Coverage target: **≥95% lines** on `guard/scan.py`.
- Complexity: **enforcing** for product-code; cite `./scripts/quality-gates.sh` /
  xenon in gate evidence.

## Design / test treatment

- Wire to existing `tripwire scan` submit path via injectable `submit(paths, force)`
  → `{batch_id, scan_run_ids, failed_targets}`; no parallel submit API.
- Dual force syntax mandatory; reuse `ResolvedArtifact` from `guard.verify`.
- **AT design complete (revised)** — ready for 🔨 IN PROGRESS.

## Before-Checks [GATE]

- [x] Slice 26 gate-evidence `verdict` is `PASS` (PR #78)
- [x] Branch `slice/29-tw-scan` created from Frontline integration
      (DECISIONS Wave H branch-base waiver)
- [x] Observed `tripwire scan` response fields recorded
      (`batch_id`, `scan_run_ids`, `failed_targets` in frontline-output-contract.md)
- [x] Coverage target ≥95% lines on `guard/scan.py`; complexity enforcing

## TDD execution

RED: add scan GWTs for multi-name, `--force`, bare `force`, ID return, force-token strip, skill layout.
GREEN: implement `/tw-scan` submit wiring only as needed.
REFACTOR: share resolution types with `/tw-verify` without coupling enable flag.

## After-Checks [GATE]

- [x] Multi-name submit and both force syntaxes pass
- [x] Response includes introspected scan/batch identifiers
- [x] Named test command(s) from AT design exit 0 (record in gate evidence)
- [x] Coverage target: ≥95% lines on `guard/scan.py`; recorded % meets that target (98.7%)
- [x] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [x] `docs/plan/gate-evidence/slice-29.json` records commands, coverage, complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (nw-software-crafter-reviewer)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 29 ✅ (after merge)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | `/tw-scan` multi-name + `--force`/`force` documented | PASS — setup-commands + SKILL.md |
| 2 | Link to existing `tripwire scan` API + slice-26 ID fields | PASS — SKILL.md + frontline-output-contract |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

🔀 ON BRANCH (pending commit + merge)
