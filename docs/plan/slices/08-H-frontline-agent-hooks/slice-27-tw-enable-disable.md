# Slice 27: /tw-enable and /tw-disable

> Scenario: Brownfield | MoSCoW: Must | Depends on: 26

## Outcome

`/tw-enable` and `/tw-disable` toggle only the `enable` flag in `~/.tripwire/config.json`. `/tw-scan` and `/tw-verify` continue to work when enforcement is disabled.

## GWT acceptance specification

**DISTILL ATs (2026-08-15)** — ≤7; product-code + Claude skill SKILL.md.

| # | Scenario | Tags | Real-surface binding |
|---|----------|------|----------------------|
| 1 | Enable sets flag true, preserves keys | `@US-27` | `guard.config.set_enable` + `.claude/skills/tw-enable/SKILL.md` |
| 2 | Disable sets flag false, preserves keys | `@US-27` | `guard.config.set_enable` + `.claude/skills/tw-disable/SKILL.md` |
| 3 | Manual verify/scan still work when disabled | `@US-27` | `guard.control_skills.manual_skill_probe` (parametrized) |
| 4 | Skills shipped at Claude layout path | `@US-27` | `.claude/skills/tw-{enable,disable}/SKILL.md` |
| 5 | Missing config created on toggle | `@US-27` | `guard.config.set_enable` |

1. **Enable sets flag true** `@US-27`
   - Given config with `enable=false` and an extra key,
     when `/tw-enable` / `set_enable(..., True)` runs,
     then `enable=true` and other keys (incl. `scan_validity_days` + extras) are unchanged.
2. **Disable sets flag false** `@US-27`
   - Given config with `enable=true` and an extra key,
     when `/tw-disable` / `set_enable(..., False)` runs,
     then `enable=false` and other keys are unchanged.
3. **Verify/scan still work when disabled** `@US-27`
   - Given `enable=false`, when a manual `verify` or `scan` probe runs for a resolvable name,
     then it still produces status/submit-shaped output (does not no-op solely because enforcement is off).
4. **Skills installed at Claude layout** `@US-27`
   - Given the repo checkout, when an operator looks for `/tw-enable` and `/tw-disable`,
     then `.claude/skills/tw-enable/SKILL.md` and `.claude/skills/tw-disable/SKILL.md` exist
     and instruct config-only toggles (no enforcement API calls).
5. **Missing config created on toggle** `@US-27`
   - Given no config file, when enable or disable runs,
     then `~/.tripwire/config.json` (or fixture path) is created with the requested `enable`
     value and default `scan_validity_days=14`.

**Test inventory (5 acceptance tests):**
`guard/tests/test_tw_enable_disable.py`

**Named verification command:**

```bash
.venv/bin/pytest guard/tests/test_tw_enable_disable.py -q --tb=short
```

**Coverage / complexity (AT design):**

- Coverage target: **≥95% lines** on `guard/config.py` (incl. `set_enable`) and
  `guard/control_skills.py` (new).
- Complexity: **enforcing** for product-code; cite `./scripts/quality-gates.sh` /
  xenon in gate evidence.

## Design / test treatment

- Skills write config only via `guard.config.set_enable`; they do not call Tripwire
  enforcement APIs for enable/disable.
- Preserve `scan_validity_days` and any future/unknown keys across toggles (raw JSON
  round-trip — do not strip via `load_config`).
- Claude skill layout (evidence): project-local
  `.claude/skills/tw-enable/SKILL.md` and `.claude/skills/tw-disable/SKILL.md`
  (same roots as `cli/src/discovery.js` DEFAULT_SKILL_ROOTS).
- Manual verify/scan independence is asserted via `manual_skill_probe` until slices
  28–29 replace the probe with full skills.
- **AT design complete** — ready for 🔨 IN PROGRESS.

## Before-Checks [GATE]

- [x] Slice 26 gate-evidence `verdict` is `PASS` (PR #78 merged to Frontline)
- [x] Branch `slice/27-tw-enable-disable` created from Frontline integration
      (DECISIONS Wave H branch-base waiver)
- [x] Skill install path / Claude skill layout for `/tw-*` noted in evidence
      (`.claude/skills/tw-{enable,disable}/SKILL.md`)
- [x] Coverage target ≥95% lines on `guard/config.py` + `guard/control_skills.py`;
      complexity enforcing for product-code

## TDD execution

RED: add GWTs for enable/disable config mutation and verify/scan-still-works.
GREEN: implement `set_enable` + two skills + manual probe.
REFACTOR: shared config read/write helper if needed; no enforcement logic in these skills.

## After-Checks [GATE]

- [x] Enable/disable GWTs pass; only `enable` changes
- [x] Verify/scan-still-works when disabled is asserted observably
- [x] Named test command(s) from AT design exit 0 (record in gate evidence)
- [x] Coverage target: ≥95% lines on `guard/config.py` + `guard/control_skills.py`; recorded % meets that target (100%)
- [x] Complexity policy: **enforcing** for product-code; evidence cites quality-gates / complexity report
- [x] `docs/plan/gate-evidence/slice-27.json` records commands, coverage, complexity, reviewers, and `verdict: ON_BRANCH` (PASS after merge)
- [x] Review: `acceptance: APPROVED` and `implementation: APPROVED` (nw-software-crafter-reviewer)
- [ ] `PROGRESS.md` + `TRAIL.md` show slice 27 ✅ (after merge)

## Doc Audit

| # | Check | Result |
|---|--------|--------|
| 1 | `/tw-enable` and `/tw-disable` documented as config toggles only | PASS — setup-commands + SKILL.md |
| 2 | Note that `/tw-scan` and `/tw-verify` remain usable when disabled | PASS |
| 3 | Cross-link gate-evidence ↔ TRAIL/PROGRESS | PASS |

## Gate Status

🔀 ON BRANCH (pending review + merge)
