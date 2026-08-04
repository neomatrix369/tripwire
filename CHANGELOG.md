# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
