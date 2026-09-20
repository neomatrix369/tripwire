# Slice 72: Gap Scanners for Unsupported Ecosystems

> Scenario: Brownfield | MoSCoW: **Could** | Status: 📋 PLANNED
> Wave: R — Approved-repo security workflow
> Depends on: **65** (coverage ledger shows gaps)
> Trigger: Only where discovery shows an unsupported language/ecosystem — e.g. Rust/Cargo if Snyk SCA + DepShield still cannot cover
> Branch: `slice/72-gap-ecosystem-scanners`

## Session bootstrap
- **Load first**: CLAUDE.md → docs/plan/invariants.md → this stub → slice 65 → `sandbox/scanners.py`

## Context
- **Stage objective**: When the coverage ledger reports unsupported ecosystems with real code/packages present, add scanning capability by extending an existing adapter where practical (prefer reuse over a parallel stack). Example motivating gap: Rust/Cargo discovered but `snyk test` + DepShield (`package.json`/`requirements.txt` only) cannot audit — do not silently leave unscanned.
- **Depends on**: Slice 65 ledger proving the gap; Wave P package path on main
- **Branch note**: Current WIP `fix/cargo-package-scan-error-status` improves honesty (unsupported detail) — that is **not** full Cargo scanning; full coverage remains this slice when promoted
- **Global invariants**: reuse-first; no hard-coded closed language list; do not claim full scan until a scanner actually completes for that ecosystem

## Non-goals
- Duplicating Cisco/Snyk/Tessl/DepShield/Ossprey for ecosystems they already cover
- Snippet-specific checks / prior-run comparison as separate Musts (add only if still missing after this slice and confirmed needed)
- Changing ADR-0016

## Output contract
- **Baseline**: Cargo-only repos are discovered as `package` but SCA reports unsupported / no supported projects (honesty path from 65 / cargo fix branch)
- After (when executed): an applicable scanner path exists for at least one previously unsupported ecosystem proven by ledger evidence (starting with Rust/Cargo if still gap), with statuses honest on failure

## Slice Workflow Bundle
- Slice name: `slice-72-gap-ecosystem-scanners`
- Files: `sandbox/scanners.py` (extend), possibly DepShield/Snyk/Ossprey adapters, fixtures (Cargo), tests, STATUS
- Exit criteria: GWT-72.* green for the chosen gap ecosystem(s)
- Commit pattern: `feat(slice-72): gap scanner for unsupported ecosystem`

## Branch
`slice/72-gap-ecosystem-scanners`

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
**Given** Rust/Cargo remains unsupported after 65
**When** this Could is promoted to execute
**Then** Cargo packages (and/or Rust source checks if in scope) are covered by a named tool
**And** prior “unsupported” reason is updated or removed for that path

## Before-Checks [GATE]
- [ ] Branch created
- [ ] DECISIONS row names which ecosystem gap(s) are in scope for this execution
- [ ] GWT RED tests / fixtures

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
📋 PLANNED — EFP Path B 2026-09-20 (Wave R); Could — execute only when ledger proves gap
