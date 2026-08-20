# Slice 41 — Landing Intro + Dashboard Restyle

**Wave**: I — Landing Intro + Visual Refresh
**MoSCoW**: Must
**Status**: ✅ PASSED
**Depends on**: none
**Branch**: main (editing `prototypes/dc-dashboard/`)
**Commits**: `dc8e033`

## Amendment (2026-08-20)

Intro behaviour (GWT 1–4, sessionStorage, About toggle, SEC/01–05 content) remains
**in force**. The **visual identity** from this slice (dark canvas, JetBrains Mono
headlines, accent `#00D9FF`) is **superseded** by
[slice 43](slice-43-foldergate-tripwire-visual-blend.md) — FolderGate cream/tan
tone blended with Tripwire HUD/grid/status. Do not revert intro IA when executing 43.

## Goal

Integrate `tripwire-landing-page-index.html` as a soft intro screen that appears
before the dashboard on first open, with a toggle to dismiss it and return. Apply
the landing page's visual identity to the existing dashboard UI.

## Scope (single file)

- `prototypes/dc-dashboard/Tripwire.dc.html`

## Before / After checks

### Before
- [x] Dashboard opens directly with no intro
- [x] Font: IBM Plex Mono, accent: `#4da2ff` (blue)
- [x] No grid overlay, no HUD corner brackets

### After
- [x] On first open: landing intro screen shows (sessionStorage key `tripwire-intro-dismissed` absent)
- [x] "Open Dashboard →" button dismisses intro and remembers choice (sessionStorage)
- [x] Nav "About" button toggles intro back on / off
- [x] Font: JetBrains Mono, accent: `#00D9FF` (cyan)
- [x] Grid overlay (`body::before`, opacity 0.4, masked)
- [x] HUD corner bracket system (`--accent` cyan) on intro stat cards
- [x] Dashboard tab/guard/footer styling reflects new palette

## Acceptance scenarios (GWT)

### Scenario 1 — First open shows intro
**Given** the user has never opened the dashboard (no `tripwire-intro-dismissed` in sessionStorage)
**When** they navigate to `http://127.0.0.1:8765/`
**Then** the intro screen is visible, the dashboard content is hidden

### Scenario 2 — Enter Dashboard dismisses intro
**Given** the intro screen is showing
**When** the user clicks "Open Dashboard →"
**Then** the intro hides, the dashboard appears, and `tripwire-intro-dismissed` is set in sessionStorage

### Scenario 3 — Returning user skips intro
**Given** `tripwire-intro-dismissed` is set in sessionStorage
**When** the user navigates to the dashboard
**Then** the dashboard loads directly with no intro screen

### Scenario 4 — About toggle re-shows intro
**Given** the dashboard is showing (intro dismissed)
**When** the user clicks "About" in the nav
**Then** the intro screen appears; clicking "Dashboard" in nav returns to the dashboard

### Scenario 5 — Visual identity applied
**Given** any state of the dashboard
**When** the page is rendered
**Then** JetBrains Mono is used for monospaced text, the accent colour is `#00D9FF`, and the grid overlay is visible behind the content

## Implementation summary

All sections from `tripwire-landing-page-index.html` were ported to the dashboard intro:

| Section | Status |
|---|---|
| Ticker bar (animated scrolling threat stats) | ✅ Implemented |
| Hero headline + dual CTAs (Dashboard + repo link) | ✅ Implemented |
| SENSOR-01 / SENSOR-05 labels on wire strip | ✅ Implemented |
| SEC/01 — H2 + description + stat legend (red/amber/green key) | ✅ Implemented |
| SEC/01 — 6 threat stat cards (risk/warn) with HUD brackets | ✅ Implemented |
| SEC/02 — Anatomy of breach (Install → Trust → Breach) | ✅ Implemented |
| SEC/03 — 5-node architecture flow | ✅ Implemented |
| SEC/03 — RAG status card grid (Green / Amber / Red / Unscanned) | ✅ Implemented |
| SEC/04 — Shipped today (/tw-* skill cards + config bar) | ✅ Implemented |
| SEC/05 — Roadmap (6-milestone vertical timeline) | ✅ Implemented |
| Section tags (SEC/01 … SEC/05) on dashed dividers | ✅ Implemented |
| Footer install CTA ($ tripwire setup-agent-hooks) | ✅ Implemented |
| Visual restyle: JetBrains Mono, #00D9FF accent, grid overlay | ✅ Implemented |
| All hardcoded JS colours updated (#4da2ff → #00D9FF etc.) | ✅ Implemented |

### Key technical decisions

- `showIntro` state seeded from `sessionStorage.getItem('tripwire-intro-dismissed')`
- `showDashboard: !s.showIntro` computed in `renderVals()` — avoids `{{ !x }}` negation (dc framework limitation)
- `enterDashboard` / `toggleIntro` methods manage sessionStorage + state transitions
- Ticker uses `@keyframes ticker-scroll` with content doubled for seamless loop
- HUD brackets: CSS-only `.hud` / `.hc-br` system with colour variants (`hud-red`, `hud-amber`, `hud-green`)
- Grid overlay: `body::before` with `linear-gradient` crosshatch + radial `mask-image` fade
- Wire pulse: `@keyframes travel` dots riding `::after` on `.wire-line`
- All inline `style=""` strings in JS methods updated to `#00D9FF` / `rgba(0,217,255,x)` to bypass CSS variable limitation in dynamically generated styles

### Slice-first rule added (process improvement)
During this slice, the slice stub was initially skipped before code was written.
Two guardrails were added to prevent recurrence:
- `CLAUDE.md` (project): **Slice-first rule (MUST NOT skip)** section
- `~/.claude/skills/enhanced-flow-planner/SKILL.md`: explicit Critical Rule banning code before stub

## Gate evidence

```json
{
  "slice": 41,
  "gate_status": "PASSED",
  "inferred": false,
  "verification": "Manual visual — intro screen, dashboard toggle, sessionStorage, all sections rendered",
  "commits": ["dc8e033"],
  "note": "Pure UI/HTML slice — no automated test runner applicable. Visual verification is the gate."
}
```
