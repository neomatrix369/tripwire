# Slice 17: User-Guide Onboarding (Prerequisites + Env Procurement)

> Scenario: Brownfield | MoSCoW: **Must** | Priority: **next Must after slice 7**, before coverage 8/11–13

## Slice Workflow Bundle
- Slice name: `slice-17-user-guide-onboarding`
- Branch: `slice/17-user-guide-onboarding`
- Commit: `docs(slice-17): user-guide onboarding prerequisites and env procurement`
- Exit criteria: Demo / Scanner / Platform can go tools → accounts (if needed) → procure → commands without `internal-docs`; every `.env.example` key has a row in `env-vars.md`; README ≤100 lines, exactly 4 H2s; Gate A badge strip unchanged (no Overmind/Ossprey).

## Decisions captured
- Adopt **rag-params-finder principles** (persona → setup guide → `.env` → run; Choose Your Path) — **not** RPF’s long marketing README.
- Lean README stays (documentation-best-practices); depth lives in `docs/user-guide/`.
- **Phase 1 (this slice):** prerequisites, supabase-setup, modal-setup, env-vars + wire QUICKSTART/README/docs index/CONTRIBUTING.
- **Phase 2 (later slice, e.g. 18):** troubleshooting, CLI ref, dashboard-guide, contributor-guide, ADRs, screenshots — out of scope here.
- Demo path: Node 22 + operator must **select Mock** (Live is default) — slice-16 compatible.
- Scanner path: zero cloud accounts.
- Platform path: accounts/procure **before** `cp .env.example`.
- Operate secrets → `env-vars.md` (not bare `.env.example`).
- Priority: wave **D** next after 7 ✅ → **17** → wave E 8 → 11 → 12 → 13. Spec dir: `docs/plan/04-D-operator-onboarding/`.

## Files
| Path | Action |
|------|--------|
| `docs/user-guide/prerequisites.md` | new — persona × tool matrix; Node 22 / Python 3.12 verify |
| `docs/user-guide/supabase-setup.md` | new — RPF-style numbered account + key procure |
| `docs/user-guide/modal-setup.md` | new — account, `modal setup`, `setup-modal.sh` |
| `docs/user-guide/env-vars.md` | new — procurement SSOT for all `.env.example` keys |
| `.env.example` | light cross-links to env-vars.md |
| `QUICKSTART.md` | Platform phases; Demo Mock-select + Node pin |
| `README.md` | Run-it → prerequisites/env-vars; Operate secrets → env-vars |
| `docs/README.md` | User guide + Choose Your Path tables |
| `CONTRIBUTING.md` | step 0 prerequisites; keep ≤80 lines |
| `docs/plan/PROGRESS.md` / `TRAIL.md` / `gate-evidence/slice-17.json` | status + evidence |

## Spec (GWT)
**Demo** — Given Git + Node 22; When QUICKSTART Demo + select Mock; Then dashboard works without Supabase/Modal.

**Scanner** — Given Git + Node 22 + npm, no cloud; When `tripwire scan --dry-discover` fixture; Then targets print, exit 0, no Modal.

**Platform** — Given no `.env`; When prerequisites → supabase-setup → modal-setup → env-vars → QUICKSTART Platform; Then required SUPABASE_* sources known, `tripwire setup` + `setup-modal.sh` + fixture scan toward Live.

## Before-Checks [GATE]
- [ ] Branch `slice/17-user-guide-onboarding`
- [ ] Phase 1 only (no Phase 2 creep)
- [ ] `.env.example` key inventory for env-vars coverage
- [ ] README baseline: 4 H2s, ≤100 lines

## After-Checks [GATE]
- [ ] `docs/user-guide/{prerequisites,supabase-setup,modal-setup,env-vars}.md` all exist
- [ ] Every key in `.env.example` has a row in `env-vars.md` (diff inventory in evidence)
- [ ] QUICKSTART Platform section links setup guides before `cp .env.example`; Demo states Node 22 + select Mock
- [ ] README Run-it → prereqs/env-vars; `docs/README.md` Choose Your Path; CONTRIBUTING step 0 + `wc -l` ≤80
- [ ] README still exactly 4 H2s and ≤100 lines (`rg '^## ' README.md` + `wc -l`)
- [ ] `rg -i 'overmind|ossprey' README.md QUICKSTART.md CONTRIBUTING.md` empty
- [ ] PROGRESS/TRAIL critical path shows **17** → 8 → 11–13 (wave D→E; 7 ✅)
- [ ] `docs/plan/gate-evidence/slice-17.json` `"verdict": "PASS"` + commands; ✅ only after merge

## Doc Audit
| # | Check |
|---|--------|
| 1 | README 4 H2s ≤100 |
| 2 | QUICKSTART setup before `.env` |
| 3 | env-vars complete vs `.env.example` |
| 4 | CONTRIBUTING ≤80 |
| 5 | Gate A badge strip intact |
| 6 | Demo Mock select |
| 7 | Choose Your Path in docs/README |
| 8 | No Phase 2 files in this slice |

## Context
- RPF: https://github.com/neomatrix369/rag-params-finder (principles)
- Pins: `.nvmrc` 22 · `.python-version` 3.12
- Scripts: `scripts/setup-modal.sh`, `scripts/setup-supabase.sh`
- Templates: `.env.example`, `fixtures/OPTIONAL_SCANNER_KEYS.md`

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 2 (~50 min) |
| Next after PASS | Phase 2 docs slice (18+) or coverage Must 8 |
