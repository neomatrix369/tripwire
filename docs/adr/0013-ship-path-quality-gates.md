# ADR-0013: Ship-path quality gates; dashboard and Guard out of bar

- **Status:** Accepted
- **Date:** 2026-08-02
- **Deciders:** Tripwire maintainers
- **Tags:** quality, coverage, ci, nightly, hooks

## Context

The repo mixes a production ship path (CLI, sandbox adapters, Live ACL) with a
prototype dashboard, a Guard stub, scripts, and optional Live cloud E2E.
Applying one 95% coverage / complexity ceiling to every file either blocks on
HTML glue or lets ship-path regressions hide in untested adapters.

Local hooks must stay fast; SAST/SCA and mutation testing are too slow to
block every push.

## Decision

Govern **ship path only**, with three gate altitudes.

**Coverage (Must, CI + push when those trees change):**

| Surface | Floor | Out of bar |
|---|---|---|
| Python `sandbox/` | `fail_under=95` | `guard/` |
| Node `cli/src` | ≥95% lines/stmts; 100% funcs; **85%** branches | — |
| Live ACL four JS modules | ≥95% lines; funcs 85 / branches 80 | `support.js` |
| `prototypes/dc-dashboard` overall | Normal tests only | coverage + complexity |
| Remotion, scripts | — | Won't |

**Hooks vs CI vs Nightly:**

- Commit: ruff, mypy, bandit, xenon, vulture, pylint dupes, gitleaks, fast tests,
  ESLint when CLI/dashboard JS staged.
- Push: full pytest + coverage when Python changes; CLI coverage when CLI
  changes; T3 gitleaks **warn-only**; full SAST/SCA is CI.
- CI: Semgrep, OSV, Meterian, CodeQL, Trivy, TruffleHog, coverage jobs.
- Nightly: mutation (mutmut, Stryker) and extra SCA are **non-gating**.
- Live Modal/Supabase E2E as CI Must = **Won't** (skip-without-config).

## Consequences

- Dashboard reliability still needs tests (wave G slices 21–22) but will not
  fail a coverage number.
- Branch floors are lower than line floors where residual defensive branches
  remain (orchestrator, CDN import).
- Green Nightly does not mean a high mutation score.

## Alternatives considered

### A. 95% on the whole repo including dashboard and Guard

Rejected: Guard is not a production entry; dashboard is a prototype ship UI.

### B. Coverage as a report only (no fail_under)

Rejected: ship-path floors were locked as Must (slices 11–13).

## References

- [docs/plan/coverage-audit.md](../plan/coverage-audit.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md) Dev hygiene
- [docs/plan/DECISIONS.md](../plan/DECISIONS.md) coverage-scope / coverage-e2e
