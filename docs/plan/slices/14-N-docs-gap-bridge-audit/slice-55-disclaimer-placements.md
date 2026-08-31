# Slice 55 — Disclaimer Placements (Docs + UI)

> Scenario: Brownfield | MoSCoW: **Must** | Status: 📋 PLANNED
> Wave: N — Docs Gap-Bridge Audit
> Depends on: 44 ✅ (GWT-44.9 pile-on merged first)
> Audit source: `docs/plan/docs-gap-bridge-audit.md §Disclaimers`

## Slice Workflow Bundle
- Slice name: `slice-55-disclaimer-placements`
- Branch: `slice/55-disclaimer-placements`
- Exit criteria: Placeholder disclaimer text added at all 8 surfaces (D1–D8) in docs and dashboard; every placement explicitly marked "pending Mani/legal review"; no wording treated as final

## Goal

Add placeholder disclaimer text to all surfaces where a user could act on scan results without understanding the tool's limits. **Not final copy** — every insertion must carry a pending-review marker. Placement only; wording improvement deferred until legal/Mani review completes.

Surfaces: README.md (D1), QUICKSTART.md (D2), STATUS.md (D3), ARCHITECTURE.md (D4), dashboard risk-score area (D5), dashboard per-finding card (D6), CLI output banner (D7), CONTRIBUTING.md (D8).

**Reorganise before writing.** Check each surface for any existing cautionary language; extend rather than duplicate.

## Spec (GWT)

### GWT-55.1 — README carries no-warranty disclaimer
**Given** a new user opens README.md
**When** they read §What Tripwire does
**Then** they see a one-sentence no-warranty + heuristic notice before the provider/scanner table
**And** the notice contains "pending legal review" in an HTML comment or inline marker

### GWT-55.2 — QUICKSTART Live section carries data-handling notice
**Given** a user is about to run Live scans
**When** they read QUICKSTART.md §Live Advanced
**Then** a data-handling notice ("submits paths to third-party scanner APIs; review vendor policies") appears before the first scan command
**And** the notice is marked pending review

### GWT-55.3 — Dashboard has risk-score and per-finding disclaimers
**Given** a user opens the Live dashboard and reads a risk score or per-finding card
**When** they look near the score badge or finding row
**Then** an **adjacent copy** element directly below the risk-score badge states: "Results are heuristic — not a compliance certification. <!-- D5: pending legal review -->"
**And** each per-finding card has an inline marker: "Source: [scanner]. False positives/negatives possible. <!-- D6: pending legal review -->"
**And** both placements are in `prototypes/dc-dashboard/Tripwire.dc.html` as static text nodes (not tooltips or separate popups)

> Placement locked to **adjacent copy** (not tooltip, not footer note) — static HTML prototype has no tooltip infrastructure; adjacent copy is grep-able and survives re-renders. Decision recorded 2026-08-31.

### GWT-55.4 — CLI output carries one-line banner
**Given** a user runs `tripwire scan`
**When** the scan completes
**Then** a one-line banner appears: "⚠ Results are heuristic. Verify critical findings independently."
**And** the banner is guarded so it does not appear in `--json` or `--quiet` output modes

### GWT-55.5 — All other surfaces (STATUS, ARCHITECTURE, CONTRIBUTING) carry placements
**Given** docs edits are made
**When** STATUS.md §IMPLEMENTED, ARCHITECTURE.md §0 external services, and CONTRIBUTING.md §Dev setup are opened
**Then** STATUS.md contains: "> ⚠ **D3 — Heuristic triage**: Gate scores represent automated heuristic analysis only. They are not audits or compliance certifications. <!-- D3: pending Mani/legal review -->"
**And** ARCHITECTURE.md §External services contains: "> ⚠ **D4 — Data handling**: Running Live scans submits code paths and metadata to third-party scanner APIs (Snyk, Cisco AI Defense, Tessl, DepShield, Ossprey). Review each vendor's data policy before use. <!-- D4: pending Mani/legal review -->"
**And** CONTRIBUTING.md §Dev setup contains: "> ⚠ **D8 — Contributor note**: Tripwire orchestrates third-party scanners. Contributed scanner adapters must not store or forward scan targets beyond the Modal sandbox lifecycle. <!-- D8: pending Mani/legal review -->"
**And** all three markers are verifiable by `grep "pending Mani/legal review"` in the respective files

## Acceptance criteria (short-form)
- [ ] All 8 disclaimer surfaces (D1–D8) have placeholder text
- [ ] Every placement has a "pending Mani/legal review" marker
- [ ] No wording is presented as final in any surface
- [ ] CLI banner skipped for `--json` / machine-output modes (GWT-55.4)
- [ ] Dashboard changes are in `prototypes/dc-dashboard/Tripwire.dc.html` only (not a new file)

## Doc audit
- Edits: `README.md`, `QUICKSTART.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`
- Edits: `prototypes/dc-dashboard/Tripwire.dc.html` (dashboard risk-score + per-finding)
- Edits: `cli/` (CLI banner after scan complete)
- Log: `docs/plan/DECISIONS.md` (append one row per surface confirming placement)
