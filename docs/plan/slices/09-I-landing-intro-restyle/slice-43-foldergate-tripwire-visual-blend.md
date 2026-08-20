# Slice 43 — FolderGate × Tripwire Visual Blend

> Scenario: Brownfield | MoSCoW: Must
> Wave: I — Landing Intro + Visual Refresh (amendment to slice 41 tokens)
> Status: 🔀 ON BRANCH (PR [#96](https://github.com/neomatrix369/tripwire/pull/96))
> Depends on: 41 (intro IA stays; tokens change)
> File overlap: 42 (`Tripwire.dc.html`) — cleared (42 merged to main)

## Slice Workflow Bundle
- Slice name: slice-43-foldergate-tripwire-visual-blend
- Files: `prototypes/dc-dashboard/Tripwire.dc.html`; `prototypes/dc-dashboard/tripwire-status.js`; tests `tripwire-visual-tokens.test.js`, `tripwire-status.test.js`
- Exit criteria: paper + tan CTA + Fraunces (43.1–43.5) **and** AA-readable ink tokens for status/links/muted (43.6–43.10)
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
| Palette | **Fills** (dots/borders/CTA button): paper `#F5F2EA`, tan `--cta #C4A574`, `--red #FF5D5D`, `--amber #FFB020`, `--green #34D399`, `--signal #00D9FF`. **Ink** (text on paper, ≥4.5:1): `--text-muted #6B645A` (5.22), `--cta-ink #7A5C2E` (5.52), `--red-ink #B42318` (5.88), `--amber-ink #8B5A00` (5.27), `--green-ink #0F766E` (4.89), `--signal-ink #0E7490` (4.79), `--violet-ink #6D28D9` (6.35). CTA *label* stays charcoal on tan fill. |
| Typography | Display: Fraunces (serif) on `h1`/`h2` only. Body: IBM Plex Sans. HUD/labels/ticker/stat numbers: JetBrains Mono |
| Accessibility target | WCAG AA 4.5:1 for all **text** on `#F5F2EA` (including status labels, links, muted). Fills/dots exempt. |
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

### Amendment — paper AA ink (pile-on, 2026-08-20)

Reviewers: [AT](d56ee410-7810-4084-9cc8-7f01c650a568) rejected pending GWTs + SSOT; [craft](2110f375-484d-4ca0-acb6-e0b2678ed40c) revise — CSS `:root` owns hex; `STATUS_META` maps status → ink token/hex that **must match** `:root`; binding test required. No new slice. No Cucumber `.feature` (repo uses GWT in this stub + node tests).

**SSOT:** hex lives in `:root` only. `STATUS_META.color` copies the **ink** hex and is named in a comment (`must equal --red-ink` etc.). HTML fallbacks use the same ink hex. `running` SSOT = `--signal-ink #0E7490` for **text**; `--signal #00D9FF` for dots only — drop `#4da2ff` vs `#00D9FF` split.

**`--accent`:** deprecate in this pile-on (comment: use `--cta` / `--signal` / `--*-ink`). Delete alias only if remaining `var(--accent)` call sites are cheap; else leave alias + comment (craft: removal can wait one commit on this same branch).

### GWT-43.6 — Status *text* uses ink, not neon fill
**Given** cream paper `#F5F2EA`
**When** a card or ticker uses red/amber/green/scanning as **text**
**Then** colours are `--red-ink` / `--amber-ink` / `--green-ink` / `--signal-ink` (or `STATUS_META` copies of those hexes)
**And** fill tokens `--red` / `--amber` / `--green` / `--signal` remain for dots, borders, badges backgrounds

### GWT-43.7 — Links and logo are AA on paper
**Given** intro + nav
**When** the page renders
**Then** `a { color }` is `--cta-ink` (not raw `--cta` / `#C4A574`)
**And** the TRIPWIRE wordmark is `--text-primary`, not tan
**And** muted chrome text is `--text-muted #6B645A` or darker (not `#8A8278`)

### GWT-43.8 — Binding: STATUS_META matches `:root` ink
**Given** `tripwire-status.js` `STATUS_META` and `Tripwire.dc.html` `:root`
**When** the token contract test runs
**Then** `STATUS_META.red.color` equals `--red-ink`, amber→`--amber-ink`, green→`--green-ink`, running→`--signal-ink`, error→`--violet-ink`, grey → muted/grey ink
**And** HTML `statusMeta` fallbacks use the same hexes (no `#f59e0b` / `#34d399` / `#4da2ff` as **text**)

### GWT-43.9 — Rejection: neon as body text is gone
**Given** `Tripwire.dc.html` + `tripwire-status.js`
**When** scanned for status/label text colours
**Then** `#FFB020`, `#34D399`, `#00D9FF`, `#C4A574` are **not** used as `color:` for body/label/logo text (fills/dots/CTA **background** allowed)
**And** finding-count badges that currently use `#f43f5e` / `#f59e0b` as `color:` switch to ink

### GWT-43.10 — Glow and hover do not blow cream
**Given** intro stat cards and pointer hover
**When** rendered
**Then** `.stat-card.risk .stat-num` has no neon `text-shadow` (or shadow opacity ≤ 0.15)
**And** `div[style*="cursor:pointer"]:hover` does not use `filter: brightness(1.12)` (use border/background shift instead)

## Out of scope
- FolderGate scan URL field, demo-trap/control chips, “WHAT THE GATE INSPECTS” tool-file cards
- Copy rewrite of Tripwire headlines
- Slice 42 data-quality behaviour
- New CSS framework or component library
- New slice number; Cucumber `.feature`; DISCUSS user-story tags (not this repo’s UI-slice contract)
- Changing cream paper / tan CTA **button fill** / Fraunces (already in 43.1–43.3)

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
5. RED: GWT-43.6–43.10 — ink tokens absent; STATUS_META still neon; binding test fails
6. GREEN: add `:root` ink tokens (hex table in Design Context); point `STATUS_META.color` at ink; replace badge/chip `color:` hex; drop glow + brightness hover
7. Binding test: each `STATUS_META.*.color` appears as `--*-ink` in `:root`

**Complexity evidence:** policy `reporting`. Scope is prototype HTML/CSS, not Python/JS quality-gates xenon. Reviewer summary: this stub + screenshot notes in `docs/plan/gate-evidence/slice-43.json`. No enforcing cyclomatic ceiling on HTML.

**Coverage:** N/A for CSS token swap — same docs-only/visual exception as slice 41. Token contract grep (or a tiny fixture test if one already exists under `prototypes/`) is the specification-coverage stand-in.

## After-Checks [GATE]
- [x] GWT-43.1–43.10 observed (visual + token grep + STATUS_META binding)
- [x] Specification coverage: every GWT clause has ≥1 check (visual and/or token tests)
- [x] Branch coverage: N/A — no new Python/JS product module; reason: prototype HTML restyle
- [x] Complexity evidence: policy `reporting`; recorded in `docs/plan/gate-evidence/slice-43.json`
- [x] Intro GWT 1–4 from slice 41 still pass (browser sessionStorage flow)
- [x] Contrast: all **text** tokens in Design Context ink table ≥4.5:1 on `#F5F2EA` (documented ratios)
- [x] `CHANGELOG.md` notes visual identity v2 (paper + tan CTA + AA ink)
- [x] Docs: this stub + TRAIL/PROGRESS; README screenshot regen deferred
- [x] Gate evidence `docs/plan/gate-evidence/slice-43.json` written at ON_BRANCH
- [x] Mutation testing: N/A (no behavioural Python/JS feature)

## Doc Audit (14-row checklist)
| # | Item | Check |
|-|------|-------|
| 1 | README updated | Yes — ON BRANCH visual note + screenshot staleness pointer |
| 2 | Inline comments added where non-obvious | Token map `--cta` vs `--signal`; `:root` hex SSOT; `--accent` deprecate |
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
🔀 ON BRANCH — [PR #96](https://github.com/neomatrix369/tripwire/pull/96); evidence `docs/plan/gate-evidence/slice-43.json` (`verdict: ON_BRANCH`). Promote to ✅ after merge.

## What Changed
| File | Type | Reason |
|------|------|--------|
| `prototypes/dc-dashboard/Tripwire.dc.html` | style | Paper palette, CTA/signal split, Fraunces, AA ink text |
| `prototypes/dc-dashboard/tripwire-status.js` | style | STATUS_META copies :root ink hex |
| `prototypes/dc-dashboard/test/tripwire-visual-tokens.test.js` | test | Token contract GWT-43.1–43.10 + STATUS_META binding + console contrast |
| `docs/plan/gate-evidence/slice-43.json` | docs | ON_BRANCH gate evidence |
| `CHANGELOG.md` | docs | Visual identity v2 + AA ink |

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1 (~25 min) |
| Execution time | ~90 min (5 commits) |
| Blockers encountered | file overlap with slice 42 (cleared) |
| Next-session notes | Merge PR #96 → promote trackers to ✅ PASSED; regen screenshots optional |
