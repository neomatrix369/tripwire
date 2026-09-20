# Slice 65: Language/Ecosystem Discovery + Coverage Ledger

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: Wave P **62** (fan-out) + **64** (package targets) landed on `main` (PRs #145/#146)
> Trigger: Approved-repo scanner must discover languages/ecosystems present and never claim full scan when unsupported
> Branch: `slice/65-lang-ecosystem-coverage-ledger`

## Session bootstrap
> Re-read CLAUDE.md before starting — use values there, not hardcoded commands here.
- **Runtime source**: → CLAUDE.md § Environment
- **Test source**: → CLAUDE.md § Testing
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → Wave P 62/64 → `sandbox/scanners.py` Snyk SCA markers

## Context
> Read before any implementation. Do not rely on conversation history alone.
- **Stage objective**: For an approved local repo+commit, discover languages and package ecosystems present; record a coverage ledger (scanner used, status, unsupported portions, reasons) so operators never confuse “no findings” with “safe” or “fully scanned”.
- **Depends on**:
  - Slice 62: git fan-out + identity (`cli/src/discovery.js`)
  - Slice 64: `package` targets + manifest markers (merged #145/#146)
  - Current branch WIP `fix/cargo-package-scan-error-status`: reuses/extends `_snyk_detect_sca_ecosystems` / Cargo-unsupported honesty in `sandbox/scanners.py` — do not duplicate; absorb or supersede that delta
- **Global invariants**: → `docs/plan/invariants.md` — fail-closed honesty; ADR-0016 unchanged; no remote fetch of unapproved remotes
> Executor may diverge from plan if new evidence warrants — document deviations in PROGRESS.md before marking PASSED.

## Non-goals
- Implementing new Rust/Cargo (or other) SCA engines — that is slice **72** when ledger shows a gap
- Changing Cisco/Tessl/MCP skill scanners
- Dashboard stepper UI (slices 68+)
- Hard-coding a closed language list (discovery-driven only; Rust is an example gap)

## Output contract
- **Baseline**: `tripwire scan` / dry-discover on a Cargo-only fixture reports package target but does not emit a structured per-ecosystem coverage ledger (WIP may only improve Snyk detail strings)
- After: each run persists/prints coverage rows: language/ecosystem, volume detected, scanner (if any), status (`not_started|running|completed|failed|timed_out|skipped`), coverage achieved, unsupported portions, reason not scanned
- Unsupported ecosystem (e.g. Rust/Cargo with no applicable completed scanner) is explicit — never rolled into “fully successful” solely because other ecosystems passed

## Slice Workflow Bundle
- Slice name: `slice-65-lang-ecosystem-coverage-ledger`
- Files: `cli/src/discovery.js` (or new coverage module), `cli/src/scannerInventory.js`, `sandbox/scanners.py` (absorb cargo honesty), tests, soft-amend STATUS
- Exit criteria: GWT-65.* green; Cargo-only repo shows unsupported ledger row; quality gates
- Commit pattern: `feat(slice-65): language and ecosystem coverage ledger`

## Branch
`slice/65-lang-ecosystem-coverage-ledger`

## Spec (GWT / User Story)

As an operator, I want every approved-repo scan to list which languages/ecosystems were found and which scanners covered them so I never assume an unscanned ecosystem was safe.

### GWT-65.1 — Discover ecosystems present
**Given** an approved checkout containing ≥2 ecosystems (e.g. Node `package.json` + Rust `Cargo.toml`)
**When** discovery/coverage runs at the specified commit
**Then** the ledger lists both ecosystems with non-zero volume indicators
**And** discovery is driven by repo contents (not a fixed closed language list)

### GWT-65.2 — Reuse existing scanner when supported
**Given** an ecosystem DepShield or Snyk SCA already supports (e.g. `package.json`)
**When** package scanners run
**Then** the ledger records the scanner name and a terminal status from the action set
**And** no parallel duplicate scanner is invented for that ecosystem

### GWT-65.3 — Unsupported ecosystem is explicit
**Given** a repo with only `Cargo.toml` / `Cargo.lock` (Rust) and no SCA-supported manifests
**When** the scan completes
**Then** the ledger marks Rust/Cargo as unsupported or skipped with reason (Snyk `snyk test` / DepShield gap)
**And** rollup is not `fully successful` solely from empty findings
**And** UI/CLI does not present the run as a complete multi-ecosystem scan

### GWT-65.4 — Scanner action statuses
**Given** mixed scanner outcomes (completed, skipped_missing_credential, failed, timed_out)
**When** coverage is summarised
**Then** each action status is one of: not_started, running, completed, failed, timed_out, skipped
**And** failed/timeout/skipped are never shown as successful scan of that ecosystem

### GWT-65.5 — Absorb Cargo honesty WIP
**Given** uncommitted or branch work on `fix/cargo-package-scan-error-status` improving Snyk exit-3 detail for Cargo
**When** slice 65 lands
**Then** that honesty is either merged into this slice’s ledger path or explicitly superseded with a DECISIONS row — no second parallel Cargo-detail path

## Before-Checks [GATE]
- [ ] Branch `slice/65-lang-ecosystem-coverage-ledger` created (not commit to main)
- [ ] Wave P 62–64 behaviour on `main` confirmed (package + inventory)
- [ ] GWT-65 written; tests RED first

## TDD Execution
- RED → GREEN → COMMIT per GWT; characterisation for inventory/coverage format

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage: every GWT clause has ≥1 test
- [ ] Branch coverage: repository-native CLI/sandbox targets; fail_under per CLAUDE.md
- [ ] Complexity evidence: policy `enforcing` or `reporting`; repository-native tool + scope named; local report path recorded
- [ ] Doc Audit: STATUS soft-amend — coverage ledger honesty; no “fully scanned” claim for Cargo-only

### Closing Gates
- [ ] `nw-at-completeness-check` — AT completeness audit (slice close gate #8)
- [ ] `nw-software-crafter-reviewer` — code quality + TDD discipline review (slice close gate #9)
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer` — data flow review (gate #9, parallel)
- [ ] `nw-gate-evidence-validator` — all 9 gate-evidence conditions pass
- [ ] `/verify-slice` — holistic evidence verdict COMPLETE

## Gate Status
📋 PLANNED — EFP Path B 2026-09-20 (Wave R)
