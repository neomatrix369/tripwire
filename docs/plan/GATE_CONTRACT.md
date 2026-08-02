# Slice Gate Contract
> SSOT for Before/After checks and ✅ PASSED. Last updated: 2026-08-02

## Closing rule (hard)

A slice may move to **✅ PASSED** only when **all** of the following are true:

1. **Before-Checks** — every box checked, or each unmet box has a **waiver** row in `DECISIONS.md` (see Waivers).
2. **After-Checks** — every box checked (same waiver rule). No “close enough.”
3. **Exit criteria** in the slice bundle are satisfied (and Doc Audit rows, if the slice has them).
4. **`docs/plan/gate-evidence/slice-N.json`** exists with `"verdict": "PASS"` (or `"VERIFIED"` for legacy 1–6) and records the commands/observations that prove the After-Checks.
5. **Review** — `/nw-review` APPROVED, **or** docs-only exception recorded in `DECISIONS.md`.
6. **Trackers** — `PROGRESS.md` + `TRAIL.md` show ✅, completed date set, Execution order advanced.

If any After-Check is open → status stays `🔨` / `🔀` / `🔴`, never ✅.

## Status meanings (gates)

| Status | Meaning vs gates |
|--------|------------------|
| `📋 PLANNED` | Before-Checks not started |
| `🔨 IN PROGRESS` | Before-Checks done (or waived); After-Checks incomplete |
| `🔀 ON BRANCH` | All After-Checks green **on the slice branch**; PR open/unmerged; evidence may say `ON_BRANCH`. **Not** ✅ yet |
| `✅ PASSED` | Closing rule fully met **and** work landed on the integration branch (`main`) |
| `🔴 BLOCKED` | A required check cannot run; blocker logged in PROGRESS |
| `📦 DEFERRED` | Slice removed from Horizon A execute path; gates frozen; reinstate to reopen |

`🔀` does **not** waive merge: mark ✅ only after merge (or explicit DECISIONS merge-equivalent).

## Check quality bar

Every Before/After item must be **binary and observable**. Prefer one of:

| Kind | Example |
|------|---------|
| Command + outcome | `` `pytest sandbox/ -q --tb=short` exit 0 `` |
| Threshold | `` Ship-path coverage ≥95% (record % in evidence) `` |
| Path / grep | `` `rg -i 'overmind\|ossprey' README.md` empty `` |
| File presence | `` `docs/user-guide/env-vars.md` exists `` |
| Tracker sync | `` PROGRESS + TRAIL show this slice ✅ `` |

**Reject / rewrite** soft checks such as:

- “Tests pass” (name the command)
- “Acceptance criteria met” (list the criteria or point to Exit criteria boxes)
- “Coverage improved” (require baseline → after numbers in evidence)
- “Docs updated” (name paths + one greppable claim)

Open Must/Should slices must meet this bar before execution starts. Strengthening checks is plan work, not optional polish.

## Waivers

- Only via a **new row** in `DECISIONS.md`: date, slice #, exact check text, reason, substitute evidence (if any).
- In the slice file, leave the box unchecked and annotate: `(waived: DECISIONS YYYY-MM-DD)`.
- Waivers do **not** delete the check; they document non-compliance for audit.
- Prefer 📦 DEFER or 🔴 BLOCK the slice over silent skips.

## Gate-evidence minimum schema

```json
{
  "slice": 17,
  "date": "YYYY-MM-DD",
  "branch": "slice/…",
  "verdict": "PASS",
  "before_checks": "all green | waived: …",
  "after_checks": ["short id of each check with result"],
  "commands": [{ "cmd": "…", "result": "…" }],
  "review": "nw-review APPROVED | docs-only DECISIONS …",
  "pr": null
}
```

Legacy files (slices 1–6) may use `"verdict": "VERIFIED"`. New slices use `"PASS"`. Use `"ON_BRANCH"` only while status is 🔀.

## Agent / interrupt duties

1. Do not start implementation until Before-Checks are green or waived.
2. Resume from the **first unchecked** Before/After item (`PROGRESS` Interrupt Recovery).
3. Do not mark ✅ in chat or trackers until the Closing rule is satisfied.
4. When drafting a new slice stub, include Before/After that already meet the quality bar.
