# Demo video script & production

**As of:** 2026-08-01 ~16:20 UTC+1
**Primary deliverable this pass:** Mock dashboard **stills + recorded VO** (assets live in Remotion).
**Product readiness:** [DEMO_READINESS.md](./DEMO_READINESS.md) — **PARTIAL** for live E2E; **READY** for stills+VO path via Mock.

**Audio VO (canonical in Remotion repo — not in Tripwire):**
`…/claude-remotion-kickstart/public/projects/tripwire/VO_AUDIO.md` · `VO_AUDIO.txt` · `audio/vo.mp3`
**Status:** VO **script + `vo.mp3` on disk** (~73.9s / 73.888s) · `ENABLE_VO = true`.

Remotion composition: `Tripwire` in `claude-remotion-kickstart` (`src/compositions/tripwire/`).
Composition runtime **73.9s** (4434 frames @ 60fps: cold → Detection → Sandbox → Close). No Drift. No Phase 5 claims. Optional disagreement line omitted (past EOF / not in MP3).

---

## Shot → still → VO (film order)

| Shot | Visual | Mode | ~sec | VO (recording) |
|------|--------|------|------|----------------|
| 0 Cold open | Remotion `ColdOpenSegment` (logo) | Remotion-only | 8–10 | “Agents install skills and MCP servers nobody's checking.” |
| 1 Overview | `01-overview.png` | **Mock** | 8–10 | “Tripwire shows the whole estate — green, amber, and red — in one place.” |
| 2 Detection · skill | `02-detection-skill.png` | **Mock** | 15–20 | “Most tools cover skills or MCP — not both. Tripwire covers both, and every finding points at exactly where: a line number — here, a hidden SYSTEM OVERRIDE in SKILL.md.” |
| 3 Detection · MCP | `03-detection-mcp.png` | **Mock** | 10–12 | “Or a tool name and field — not a vague score. On this MCP server, command injection on run_shell.” |
| 4 Sandbox proof | `04-sandbox-evidence.png` | **Mock** | 12–15 | “Scanning untrusted code means executing it. Tripwire runs that in a sandbox — you see the sandbox id, the egress policy, what was denied, and cleanup confirmed.” |
| 5 CLI · Modal spawn | `05-cli-modal-spawn.png` | **Mock** | 10–12 | “From the CLI, Tripwire discovers the target, checks the content hash, and spawns a Modal sandbox — scanners run where the agent would.” |
| 6 Close | Remotion `CloseSegment` | Remotion-only | 8–12 | “Tripwire scans what your agents actually install, and proves what they actually do.” |
| — Optional | same close | — | +6–8 | “And when two scanners disagree — which they will — that's the next thing we're building toward.” |

**Film cut:** Remotion cold open → product stills `01`–`05` → Remotion close.
No separate mock-mode proof still in the cut — select **Mock (demo data)** before capturing `01`–`05` (see capture section below).

Full continuous narration with `[PAUSE]` marks → Remotion `public/projects/tripwire/VO_AUDIO.md`.

---

## Still assets (canonical)

**Canonical (Remotion only — not mirrored in Tripwire):**
`…/claude-remotion-kickstart/public/projects/tripwire/stills/`

Optional YouTube thumb: `…/claude-remotion-kickstart/public/projects/tripwire/images/youtube-thumbnail.png`

| File | Shows |
|------|--------|
| `01-overview.png` | Mock heatmap: 12 items, red/amber/green, skill + MCP cards |
| `02-detection-skill.png` | `vuln-prompt-injection-notes`: `prompt_injection`, `SKILL.md:14-18`, SYSTEM OVERRIDE, `sb_8f2a1c` |
| `03-detection-mcp.png` | `vuln-command-injection-server`: `tool: run_shell`, `server.py:28`, dual scanners |
| `04-sandbox-evidence.png` | `vuln-runtime-download`: sandbox id, denied egress `example.invalid`, cleanup |
| `05-cli-modal-spawn.png` | CLI mock: `$ tripwire scan …`, **Spawning Modal sandbox sb_8f2a1c…** |

---

## Suggested stills assembly order (~73.9s measured VO)

1. Remotion cold open
2. `01-overview` → `02-detection-skill` → `03-detection-mcp`
3. `04-sandbox-evidence` → `05-cli-modal-spawn`
4. Remotion close

Map to Remotion beats: Detection ≈ stills 01–03; Sandbox ≈ stills 04–05.

---

## How stills were captured (reproducible)

```bash
cd prototypes/dc-dashboard && python3 -m http.server 8766
# open http://127.0.0.1:8766/Tripwire.dc.html
# Force Mock: sessionStorage tripwire-data-source-mode = mock (or Guard tab → Mock)
```

Viewport used: 1440×900. Drawer clips for detail panels. CLI tab → run mock `vuln-prompt-injection-notes` scenario for spawn lines. **All product stills = Mock (not Live).** Drop PNGs into Remotion `public/projects/tripwire/stills/`.

---

## Video clips (optional later)

When replacing stills with motion (paths under Remotion `public/`):

| Clip | Path under `public/` |
|------|----------------------|
| Detection | `projects/tripwire/video/01-detection.mp4` |
| Sandbox | `projects/tripwire/video/02-sandbox.mp4` |
| VO / music | `projects/tripwire/audio/vo.mp3`, `music.mp3` |

Prefer **Mock** for Detection UI. Live CLI `--force` optional for Sandbox motion; Mock stills already cover the story.

---

## Remotion drop-in (stills + VO path)

1. Stills already at `public/projects/tripwire/stills/*.png` (`01`–`05`)
2. `vo.mp3` already at `public/projects/tripwire/audio/vo.mp3` (~73.9s; script: `VO_AUDIO.md` / `.txt`)
3. ~~Ken Burns stills~~ — **done** in Detection (01→02→03) + Sandbox (04→05); GapCards unused
4. ~~`ENABLE_VO = true`~~ — **done** in `config.ts`; beats retuned from `vo_transcript.json`
5. `pnpm exec remotion render Tripwire`

See Remotion `VIDEO_PLAN.md` + `public/projects/tripwire/ASSETS.md` + canonical `VO_AUDIO.md`.

---

## Readiness for stills + VO

| Item | Verdict |
|------|---------|
| Mock dashboard rich findings | **READY** — stills `01`–`05` in Remotion (captured in Mock mode) |
| Skill file/line precision | **READY** — `02` |
| MCP tool entity (`run_shell`) | **READY** — `03` |
| Sandbox id / deny / cleanup | **READY** — `04` |
| CLI “Spawning Modal…” | **READY** — `05` (mock CLI tab) |
| VO **script** for `vo.mp3` | **READY** — Remotion `VO_AUDIO.md` |
| Recorded `vo.mp3` | **READY** — ~73.9s (73.888s) at Remotion `audio/vo.mp3`; `ENABLE_VO = true` |
| Remotion stills + timing | **READY** — Ken Burns 01–05; 4434f / 73.9s |
| Live Tessl/Snyk depth | **NOT READY** — narrate as optional / skip |
| Live findings entity fields | **PARTIAL** — use Mock stills |

**Verdict: READY for a stills + VO demo cut.** Render `Tripwire`; Live Modal / Tessl remain optional polish.
