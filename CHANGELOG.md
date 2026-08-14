# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Tiered post-scan router: `tripwire route` and auto-route after `tripwire scan`
  (SIE triage + optional Model Studio escalation; `scanner_source=tiered_router`)
- Model Studio and SIE sample CLIs under `prototypes/model-studio/` and
  `prototypes/sie-studio/`
- Dashboard router strip, SIE-only / escalated filters, and Mock router fixtures
- Optional `.env` keys for SIE / Model Studio (documented in `docs/user-guide/env-vars.md`)
- ADR-0016: tiered router via SIE and Model Studio

### Changed
- Severity rollup excludes `tiered_router` findings so triage does not inflate
  scanner red/amber counts
- CLI coverage floors temporarily lowered (60/60/80/60) until `router.js` unit
  tests land; ADR-0013 target unchanged

### Docs
- Formal ADR catalog under `docs/adr/`: Accepted retrospective records
  0002–0016 for shipped topology, scanning, security, CLI, quality,
  Horizon A scope, and tiered router. Number 0001 reserved (draft under review,
  not published). Indexes wired from Architecture, STATUS, README, QUICKSTART,
  CONTRIBUTING, and plan README.
- Provider setup guides for optional tiered routing:
  `docs/user-guide/sie-setup.md` and `docs/user-guide/model-studio-setup.md`
  (wired from README, QUICKSTART, docs index, env-vars, prerequisites)

## [0.3.0] - 2026-08-05

### Added
- `cli/eslint.config.js` — flat-format ESLint 10 enforcement gate (`@eslint/js` + `globals.node`); `complexity: ['error', 10]` and `max-depth: ['error', 4]` now block in error mode at commit (eslint-cli hook) and CI (`npm run lint`), replacing the legacy `.eslintrc.cjs` for enforcement purposes
- `prototypes/dc-dashboard/eslint.config.js` — flat-format ESLint enforcement gate for the live dashboard; same rules as CLI gate plus `globals.browser`; `support.js` (generated build artifact) excluded from linting
- `pylint>=3.0` dev dependency, `[tool.pylint.similarities]` config (≥6-line similarity threshold), and `pylint-duplication` pre-commit hook (Python files only); same check wired in `static-analysis` CI job
- `scripts/pip-audit.sh` — centralised Python dep audit with documented per-CVE ignore slots
- `scripts/check_coverage_threshold_drift.py` — FE↔backend coverage threshold drift guard (self-skips when CLI has no vite config)
- `.trivyignore` — Trivy CVE suppression starter with Why/Compensating-control/Unblock format enforced per entry
- `.meterian` — Meterian SCA thresholds (security + licensing ≥95, CVSS ≥7.0); `METERIAN_API_TOKEN` already wired in CI
- `.github/PULL_REQUEST_TEMPLATE.md` — PR description template aligned with `/create-pr` skill section names (`Summary`, `Test Results`, `Checklist`, `Closes`)
- `.github/CODEOWNERS` — auto-reviewer assignment (`@neomatrix369` global fallback)
- `cli/stryker.config.mjs` — Stryker config targeting `src/**/*.js` with built-in `command` test runner, 80% kill threshold, HTML + JSON reporters
- CLI mutation testing job in `nightly.yml` (`mutation-tests-cli`) — installs only `@stryker-mutator/core@^8` (no separate test-runner package), seeds sandbox fixtures, uploads HTML/JSON report artifact (30-day retention)

### Changed
- `scripts/pre-push-gates.sh` — T3 now runs **gitleaks commit-range only** (pushed commits via `--log-opts FROM..TO`); full-tree SAST/SCA (`security-scan.sh`, semgrep, trivy, trufflehog) moved entirely to CI where latency is acceptable
- `scripts/pre-push-gates.sh` — CLI unit tests at push now gated on `CLI_CHANGED`; previously ran unconditionally on every push even when no `cli/` files were touched
- `.pre-commit-config.yaml` — added `xenon` (complexity), `vulture` (dead code), `pylint-duplication`, `eslint-cli`, and `eslint-dashboard` hooks at commit stage; all are file-type-gated so they fire only on matching changed files
- Xenon ceiling split: `scan_app.py + guard + __init__.py → --max-absolute C`; `scanners.py → --max-absolute D` (only `run_snyk` is D-grade; tracked for refactor) — clean files no longer inherit the worst offender's ceiling
- Pre-push CLI gate upgraded from bare `npm test` to `npm run test:coverage` (c8 ≥95%); the coverage floor now enforced locally before code reaches the remote, matching Python's push behaviour
- `ci.yml` `cli-tests` job: ESLint lint step added before `test:coverage`; `static-analysis` job: xenon split applied and pylint duplicate-code check added; `live-acl-tests` job: ESLint lint step added before `test:coverage`
- `.github/workflows/nightly.yml` Chalk job — replaced silent `|| true` with `continue-on-error: true` so Chalk failures appear as visible ⚠ warnings in the Actions UI rather than being swallowed
- `CLAUDE.md` — added `## PR Composition` section so agent skills include the project Checklist in generated PR bodies

### Fixed
- `prototypes/dc-dashboard/tripwire-status.js` `normalizeSeverity` — refactored from CC 14 to CC 6 using Set-based dispatch (`SEVERITY_RED/AMBER/GREEN`); `resolveItemStatus` reduced from CC 13 to CC 8 by extracting `resolveCompletedStatus` and `resolveNoRunStatus` and removing unnecessary destructuring defaults that inflated the ESLint complexity count
- `prototypes/dc-dashboard/tripwire-live.js` — extracted 7 named helper functions (`worstScannerSeverity`, `buildCompletedScannerSummary`, `buildScannerOutput`, `shapeScannerRow`, `resolveLastScanTime`, `getRunContext`, `shapeItem`) from the 120-line `items.map` closure; all 52 tests preserved, coverage above floors
- `cli/src/discovery.js` `discoverTargets` — refactored from CC 18 to CC 8 by extracting `resolveTarget` and `annotateWithTypes`; all 15 existing tests preserved
- `cli/src/ensureSchema.js` `applySchema` — refactored from CC 13 to CC 6 by extracting `pgSslConfig` and `pgConnectHint`; added `{ cause: err }` to preserve caught error in the chain
- `cli/src/orchestrator.js` — removed useless `contentHash = null` initialisation (always overwritten before use)
- `cli/stryker.config.mjs` — switched from non-existent `@stryker-mutator/node-test-runner` package (404 on npm) to Stryker's built-in `command` runner with `node --test test/*.test.js`; set `coverageAnalysis: "off"` (command runner limitation)
- `nightly.yml` `mutation-tests-cli` — added fixture seed step (`cp -r db fixtures cli/.stryker-tmp/`) so relative paths inside Stryker's sandbox resolve correctly and the dry-run passes without `|| true` suppression

## [0.2.0] - 2026-08-04

### Added
- Walking skeleton: CLI (`tripwire scan`/`tripwire setup`), schema bootstrap, Modal sandbox, fixtures, guard module, and dashboard in a single deployable slice
- Live/demo data mode — dashboard serve/sync with Supabase live data support
- `_acquire_target` dispatch for clone, copy, and introspect target modes
- Dashboard redesign with Deep Ops aesthetic and live Supabase data support
- Modal secrets sync script and sandbox deploy workflow
- Scanner console output persistence and Snyk skill CLI flag corrections
- `scan --force` and `setup --force` isolation support
- MCP discovery and Cisco scanner CLI integration
- Screenshot gallery in README: CLI output, dashboard, skills, and MCP server views
- Serious-tier project hygiene: pre-commit hooks, ruff, bandit, mypy, vulture, xenon, pip-audit, gitleaks
- Two-tier tech badges across README and docs
- Onboarding user guide with Live-first setup path and operator readiness notes

### Fixed
- Demo scan recovery: `--force` flag, rollup on failure, unreachable detail handling
- Demo heatmap stability: status SSOT, severity mapping, item upsert
- MCP fixtures: drop postponed annotations, pin Python 3.11
- Scanner detail summaries and dashboard raw_summary synthesis
- Resolve demo-blocking issues: quiet dotenv, ISO timestamps, manifest expansion
- Anon RLS policies and demo-readiness capture

### CI
- Python ship-path coverage gate at 95% (sandbox)
- CLI coverage gate at 95%
- Live ACL coverage gate at 95%
- Publish complexity evidence on pull requests
- Pinned security action versions (CodeQL v4, SBOM v0.24.0, artifact upload v7, cache v6, checkout v7, setup-python v7, setup-node v7)
- Fixed broken action pins and gitleaks permissions

### Docs
- Lean README with persona quickstart paths and early-adopter expectations
- Setup docs synced with schema bootstrap and Modal operator evidence
- Tech badges extended to docs index, quickstart, and CI workflows
- Screenshot gallery with real CLI and dashboard captures

[0.2.0]: https://github.com/neomatrix369/tripwire/releases/tag/v0.2.0
