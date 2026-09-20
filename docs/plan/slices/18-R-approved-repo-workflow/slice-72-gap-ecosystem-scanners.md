# Slice 72: Gap Scanners for Unsupported Ecosystems

> Scenario: Brownfield | MoSCoW: **Could** | Status: 🔨 IN PROGRESS
> Wave: R — Approved-repo security workflow
> Depends on: **65** (coverage ledger shows gaps)
> Trigger: Only where discovery shows an unsupported language/ecosystem — e.g. Rust/Cargo if Snyk SCA + DepShield still cannot cover
> Branch: `slice/72-gap-ecosystem-scanners` (docs stream: `slice/72-gap-ecosystem-scanners-docs`)

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 65 → `sandbox/scanners.py`

## Context
- **Stage objective**: When the coverage ledger reports unsupported ecosystems with real code/packages present, add scanning capability by extending an existing adapter where practical (prefer reuse over a parallel stack). Example motivating gap: Rust/Cargo discovered but `snyk test` + DepShield (`package.json`/`requirements.txt` only) cannot audit — do not silently leave unscanned.
- **Depends on**: Slice 65 ledger proving the gap; Wave P package path on main
- **Branch note**: Cargo SCA honesty (#147) is on `main`. RustSec **Cargo Audit** is already **IMPLEMENTED** in `SCANNER_GROUPS` (`run_cargo_audit`) for `Cargo.lock` / `Cargo.toml` when installed. Slice 72 **formalizes** that path as the Rust/Cargo gap scanner — it does not invent a second stack. Snyk SCA + DepShield Rust gaps stay explicit.
- **Global invariants**: reuse-first; no hard-coded closed language list; do not claim full scan until a scanner actually completes for that ecosystem

## Non-goals
- Duplicating Cisco/Snyk/Tessl/DepShield/Ossprey for ecosystems they already cover
- Claiming Snyk or DepShield now support Rust/Cargo
- Snippet-specific checks / prior-run comparison as separate Musts (add only if still missing after this slice and confirmed needed)
- Changing ADR-0016

## Output contract
- **Baseline**: Cargo-only repos are discovered as `package`; Snyk/DepShield report unsupported / N/A; zero completed engines → **NO COVERAGE** (honesty path from 65 / #147)
- **Current (IMPLEMENTED on `main`)**: Cargo Audit covers Cargo.lock/toml when `cargo-audit` is installed; absent binary → unreachable/skipped honesty
- After (when slice closes): docs/STATUS honesty + GWTs/evidence aligned; “fully scanned” only when Cargo Audit (or another named engine) actually completed

## Slice Workflow Bundle
- Slice name: `slice-72-gap-ecosystem-scanners`
- Files: docs/STATUS · CHANGELOG · plan trackers · DECISIONS (this docs stream); product path already in `sandbox/scanners.py` Cargo Audit — further product/test work only if GWT gaps remain
- Exit criteria: GWT-72.* green for the chosen gap ecosystem(s); Doc Audit STATUS honesty
- Commit pattern: `docs(slice-72): …` (docs stream); `feat(slice-72): …` only if further product work is required

## Branch
`slice/72-gap-ecosystem-scanners` · docs: `slice/72-gap-ecosystem-scanners-docs`

## Spec (GWT / User Story)

### GWT-72.1 — Gap driven by ledger
**Given** slice 65 ledger shows ecosystem E unsupported with non-zero volume
**When** this slice is scoped
**Then** work targets E only (or the highest-volume unsupported set confirmed in DECISIONS)
**And** supported ecosystems are not reimplemented

### GWT-72.2 — Prefer extend existing adapter
**Given** an existing scanner that can be extended for E
**When** support is added
**Then** it lands in `SCANNER_GROUPS` / existing adapter modules
**And** no parallel orphan scanner stack is introduced

### GWT-72.3 — Coverage honesty after support
**Given** E is now scannable
**When** a repo containing E is scanned
**Then** ledger shows scanner used + completed/failed/skipped honestly
**And** “fully scanned” is only claimed for ecosystems that actually completed

### GWT-72.4 — Example: Rust/Cargo
**Given** Rust/Cargo remains unsupported by Snyk SCA + DepShield
**When** this Could is promoted to execute
**Then** Cargo packages are covered by RustSec **Cargo Audit** (named tool in `SCANNER_GROUPS`)
**And** prior “unsupported” reasons stay accurate for Snyk/DepShield; Cargo Audit path is documented as IMPLEMENTED when installed

## Before-Checks [GATE]
- [x] Branch created (`slice/72-gap-ecosystem-scanners-docs` from `main`)
- [x] DECISIONS row names which ecosystem gap(s) are in scope for this execution (Rust/Cargo via cargo-audit — APPLIED 2026-09-20)
- [ ] GWT RED tests / fixtures (product path already tested on `main`; close only with evidence if further RED→Green needed)

## After-Checks [GATE]
- [ ] Tests pass
- [ ] Specification coverage
- [ ] Complexity evidence recorded
- [ ] Doc Audit: STATUS capability honesty for new ecosystem

### Closing Gates
- [ ] `nw-at-completeness-check`
- [ ] `nw-software-crafter-reviewer`
- [ ] `nw-solution-architect-reviewer` + `nw-system-designer-reviewer`
- [ ] `nw-gate-evidence-validator`
- [ ] `/verify-slice` — COMPLETE

## Gate Status
🔨 IN PROGRESS — docs stream 2026-09-20; Cargo Audit production path IMPLEMENTED on `main`; Could formalization — do not mark ✅ until After-Checks + evidence
