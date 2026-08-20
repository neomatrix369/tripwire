# Slice 43 — FolderGate × Tripwire Visual Blend

> Scenario: Brownfield | MoSCoW: Must
> Wave: I — Landing Intro + Visual Refresh (amendment to slice 41 tokens)
> Status: 🔨 IN PROGRESS
> Depends on: 41 (intro IA stays; tokens change)
> File overlap: 42 (`Tripwire.dc.html`) — cleared (42 merged to main)

## Slice Workflow Bundle
- Slice name: slice-43-foldergate-tripwire-visual-blend
- Files: `prototypes/dc-dashboard/Tripwire.dc.html`; hardcoded hex in `prototypes/dc-dashboard/tripwire-live.js` that currently assume `#00D9FF`
- Exit criteria: intro + dashboard share one CSS token set: cream paper field, tan primary CTA, serif display headlines, Tripwire HUD/grid/RAG status retained
- Commit pattern: `feat(slice-43): blend FolderGate cream/tan with Tripwire HUD`

## Branch
`slice/43-foldergate-tripwire-visual-blend`

## Goal

Keep Tripwire’s threat-ops chrome (grid overlay, HUD brackets, red/amber/green
status, SENSOR/SEC labels, live pulse) and restyle the **colour tone + type** to
the attached FolderGate landing: warm cream paper, charcoal text, sandy-tan
primary action, serif hero, generous whitespace. Do **not** clone FolderGate’s
product (GitHub URL scan, “WHAT THE GATE INSPECTS” file cards, demo-trap buttons).

## Design Context
| Field | Value |
|---|---|
| Component library | none — `x-dc` prototype HTML |
| Design system | CSS custom properties on `:root` in `Tripwire.dc.html` |
| Palette | Paper `#F5F2EA` / surface `#EFE9DC` / elevated `#E7DFD0`; charcoal text `#1C1915` / secondary `#5C564C`; tan CTA `#C4A574`; keep `--red` `#FF5D5D` `--amber` `#FFB020` `--green` `#34D399`; keep live signal `--signal` `#00D9FF` for SENSOR dots / wire pulse only |
| Typography | Display: Fraunces (serif) on `h1`/`h2` only. Body: IBM Plex Sans. HUD/labels/ticker/stat numbers: JetBrains Mono |
| Accessibility target | WCAG AA contrast for charcoal-on-cream and tan-on-cream CTA label (`#1C1915` on `#C4A574` or inverse) |
| Responsive strategy | desktop-first (existing dashboard) |
| Colour mode | light-native (replaces slice 41 dark-native) |
| Visual hierarchy driver | typography (serif hero) + data-visualisation (RAG) + UI-chrome (HUD) |
| Aesthetic register | boutique paper SaaS × industrial sensor HUD |
| Style reference | attached FolderGate landing (cream grid, tan Scan, serif headline) + current Tripwire intro HUD |

## Spec (GWT)

### GWT-43.1 — Paper field replaces dark canvas
**Given** the dashboard HTML is served
**When** the page renders (intro or dashboard)
**Then** `:root --bg-base` is `#F5F2EA` (or equivalent cream) and body/chrome backgrounds use the paper tokens — not `#05080B`

### GWT-43.2 — Tan is the primary action; cyan is signal-only
**Given** the intro screen is visible
**When** the user sees the primary CTA ("Open Dashboard")
**Then** that button uses tan `--cta` / `#C4A574`, not a full-bleed `#00D9FF` fill
**And** SENSOR dots / wire pulse / live indicators still use `--signal` `#00D9FF`

### GWT-43.3 — Serif display, HUD stays mono
**Given** the intro hero is visible
**When** the page is rendered
**Then** the main `h1` (and section `h2`) use a serif display face (Fraunces)
**And** ticker, SEC labels, stat numbers, and nav chrome stay JetBrains Mono

### GWT-43.4 — Tripwire chrome survives the restyle
**Given** any intro or dashboard state
**When** the page is rendered
**Then** the faint grid overlay, HUD corner brackets, and red/amber/green status colours are still present
**And** intro sections SEC/01–05 and sessionStorage dismiss behaviour from slice 41 still work

### GWT-43.5 — Hardcoded cyan fills do not fight the tokens
**Given** dynamically generated styles in `Tripwire.dc.html` / `tripwire-live.js`
**When** the dashboard grid and panels render
**Then** no leftover `#00D9FF` is used as a **surface/button/background fill** (signal/border/glow on live elements is allowed)

## Out of scope
- FolderGate scan URL field, demo-trap/control chips, “WHAT THE GATE INSPECTS” tool-file cards
- Copy rewrite of Tripwire headlines
- Slice 42 data-quality behaviour
- New CSS framework or component library

## Before-Checks [GATE]
- [x] Not on `slice/42-dashboard-data-quality-fixes` (file overlap)
- [x] Branch `slice/43-foldergate-tripwire-visual-blend` created from `main` (or from 42 **after** it merges)
- [x] Slice 41 intro behaviour still present (sessionStorage key `tripwire-intro-dismissed`)
- [x] Current tokens recorded: `--bg-base: #05080B`, `--accent: #00D9FF`, mono headlines

## TDD Execution
UI slice — outside-in. Slice 41 used **manual visual verification** (no HTML test runner). Same exception, plus one **token contract** check:

1. RED: assert `:root` in `Tripwire.dc.html` contains `--bg-base: #F5F2EA`, `--cta: #C4A574` (or named tan), `--signal: #00D9FF`, and a serif `--font-display`
2. GREEN: retoken `:root`, Google Fonts link (add Fraunces), map `--accent` usages: CTA → `--cta`, live → `--signal`, borders → warm grey/tan dim
3. Replace hardcoded `#00D9FF` **fills** in JS/inline styles; leave signal glows
4. Visual pass: intro + dashboard on `http://127.0.0.1:8765/`

**Complexity evidence:** policy `reporting`. Scope is prototype HTML/CSS, not Python/JS quality-gates xenon. Reviewer summary: this stub + screenshot notes in `docs/plan/gate-evidence/slice-43.json`. No enforcing cyclomatic ceiling on HTML.

**Coverage:** N/A for CSS token swap — same docs-only/visual exception as slice 41. Token contract grep (or a tiny fixture test if one already exists under `prototypes/`) is the specification-coverage stand-in.

## After-Checks [GATE]
- [ ] GWT-43.1–43.5 observed (visual + token grep)
- [ ] Specification coverage: every GWT clause has ≥1 check (visual and/or `rg` on `:root` / CTA fill)
- [ ] Branch coverage: N/A — no new Python/JS product module; reason: prototype HTML restyle
- [ ] Complexity evidence: policy `reporting`; no xenon/eslint complexity run on HTML; recorded in gate-evidence
- [ ] Intro GWT 1–4 from slice 41 still pass
- [ ] Contrast: primary text and CTA label meet AA on cream
- [ ] `CHANGELOG.md` notes visual identity v2 (paper + tan CTA)
- [ ] Docs: this stub + TRAIL/PROGRESS; README screenshot not required
- [ ] Gate evidence `docs/plan/gate-evidence/slice-43.json` written at PASSED
- [ ] Mutation testing: N/A (no behavioural Python/JS feature)

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | N/A — prototype chrome only |
| 2 | Inline comments added where non-obvious | Token map `--cta` vs `--signal` |
| 3 | Function signatures documented | N/A |
| 4 | Error paths documented | N/A |
| 5 | CHANGELOG entry written | Yes at PASS |
| 6 | Architecture doc updated | N/A |
| 7 | API doc updated | N/A |
| 8 | Config/env vars documented | N/A |
| 9 | Examples added or updated | N/A |
| 10 | Deprecated features marked | Slice 41 dark `#00D9FF` fill identity superseded |
| 11 | Migration guide written | N/A |
| 12 | Troubleshooting section added | N/A |
| 13 | Related links cross-referenced | Slice 41 amendment pointer |
| 14 | No orphaned file references | Yes |

## Gate Status
🔨 IN PROGRESS

## What Changed
| File | Type | Reason |
|------|------|--------|
| `prototypes/dc-dashboard/Tripwire.dc.html` | style | Paper palette, CTA/signal split, Fraunces, light chrome |
| `prototypes/dc-dashboard/test/tripwire-visual-tokens.test.js` | test | Token contract GWT-43.1–43.5 |
| `CHANGELOG.md` | docs | Visual identity v2 |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | — |
| Blockers encountered | file overlap with slice 42 |
| Next-session notes | New branch; CSS `:root` first, then CTA/hero type, then leftover hex fills |
