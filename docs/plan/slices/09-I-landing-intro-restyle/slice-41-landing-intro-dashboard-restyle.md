# Slice 41 — Landing Intro + Dashboard Restyle

**Wave**: I — Landing Intro + Visual Refresh
**MoSCoW**: Must
**Status**: 🔨 IN PROGRESS
**Depends on**: none
**Branch**: main (editing `prototypes/dc-dashboard/`)

## Goal

Integrate `tripwire-landing-page-index.html` as a soft intro screen that appears
before the dashboard on first open, with a toggle to dismiss it and return. Apply
the landing page's visual identity to the existing dashboard UI.

## Scope (single file)

- `prototypes/dc-dashboard/Tripwire.dc.html`

## Before / After checks

### Before
- [ ] Dashboard opens directly with no intro
- [ ] Font: IBM Plex Mono, accent: `#4da2ff` (blue)
- [ ] No grid overlay, no HUD corner brackets

### After
- [ ] On first open: landing intro screen shows (sessionStorage key `tripwire-intro-dismissed` absent)
- [ ] "Enter Dashboard →" button dismisses intro and remembers choice (sessionStorage)
- [ ] Nav "About" button toggles intro back on / off
- [ ] Font: JetBrains Mono, accent: `#00D9FF` (cyan)
- [ ] Grid overlay (`body::before`, opacity 0.4, masked)
- [ ] HUD corner bracket system (`--accent` cyan) on intro stat cards
- [ ] Dashboard tab/guard/footer styling reflects new palette

## Acceptance scenarios (GWT)

### Scenario 1 — First open shows intro
**Given** the user has never opened the dashboard (no `tripwire-intro-dismissed` in sessionStorage)
**When** they navigate to `http://127.0.0.1:8765/`
**Then** the intro screen is visible, the dashboard content is hidden

### Scenario 2 — Enter Dashboard dismisses intro
**Given** the intro screen is showing
**When** the user clicks "Enter Dashboard →"
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

## Implementation notes

- `showIntro` state in DC component, seeded from `sessionStorage.getItem('tripwire-intro-dismissed')`
- `showDashboard` = `!showIntro` (computed in `renderVals` — avoids `{{ !x }}` template negation)
- Intro content: hero headline, wire-strip animation, 6 threat-stat cards (from landing page)
- HUD brackets: CSS-only `.hud`/`.hc-br` system matching landing page
- Grid overlay: `body::before` with `linear-gradient` grid, `mask-image` radial fade

## Gate evidence stub

```json
{
  "slice": 41,
  "gate_status": "IN_PROGRESS",
  "inferred": false,
  "note": "Manual visual verification — open dashboard, confirm intro shows, toggle works"
}
```
