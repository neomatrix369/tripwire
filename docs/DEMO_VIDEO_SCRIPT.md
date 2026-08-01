# Demo video script & production

Canonical shot list, VO, capture runbook, and Remotion assembly for the Tripwire build-week cut.

**As of:** 2026-08-01 (re-review)
**Product readiness:** see [DEMO_READINESS.md](./DEMO_READINESS.md)
**Remotion skeleton:** `claude-remotion-kickstart` composition `Tripwire` (`src/compositions/tripwire/`)
**Target runtime:** ~90s (10 + 30 + 30 + 20). Retune after real VO.
**Scope:** Detection + Sandbox only. **No Drift segment.** No Phase 5 (reconciler / Overmind) claims.

Evidence labels: **VERIFIED** = observed this session · **IMPLEMENTED** = in code · **RECOMMENDED** = film guidance.

---

## Overall film strategy

| Beat | Prefer | Why |
|------|--------|-----|
| Cold open / Close | Remotion cards | No capture needed |
| **Detection** | **Mock dashboard** | Dense heatmap, file/line + snippet, MCP `entity_name` / tool handoff. Live has items + some Cisco findings (**VERIFIED** 12 items / 48 findings) but **0 `entity_name`**, messy heatmap colors on some vuln rows — thin for the “precise where” VO. |
| **Sandbox** | **Live CLI → Modal** (+ optional Mock sandbox panel cutaway) | Kickoff / `[acquire] packed` / scanner logs are the proof story. Mock has richer sandbox ID / egress UI if Modal logs are hard to read. |
| Optional CLI B-roll | Live `tripwire scan --force` | Can sit under Sandbox VO or as a short bridge; not a Remotion segment by itself |

---

## Shot list (film / assembly order)

| # | Time | Segment | Duration | On-screen action | VO (draft) | Source | Readiness |
|---|------|---------|----------|------------------|------------|--------|-----------|
| 1 | 0:00–0:10 | Cold open | 10s | Logo + title “Tripwire” + problem line | “Agents install skills and MCP servers nobody's checking.” | Remotion `ColdOpenSegment` | **READY** (skeleton) |
| 2a | 0:10–0:30 | Detection (skill) | ~20s | Mock dashboard: select `vuln-prompt-injection-notes` → red finding with `SKILL.md` / lines / snippet (`SYSTEM OVERRIDE`) | “Most tools cover skills or MCP — not both. Tripwire covers both, and every finding points at exactly where: a line number…” | Screen capture → `01-detection.mp4` | **READY via Mock** |
| 2b | 0:30–0:40 | Detection (MCP handoff) | ~10s | Same Mock UI: select `vuln-command-injection-server` → finding on tool `run_shell` / entity — then hard cut or dissolve into Sandbox | “…or a tool name and field — not a vague score.” | Continues in `01-detection.mp4` | **READY via Mock** (Live lacks `entity_name`) |
| 3 | 0:40–1:10 | Sandbox | 30s | Tall terminal: `tripwire scan --force ./fixtures/mcp/vuln-command-injection-server` → Modal init → `[acquire] packed` → scanner progress. Optional 5–8s Mock cutaway of sandbox ID / egress phase on that item. | “Scanning an MCP server means executing it — and their own docs say so. Tripwire runs the scan in a sandbox so you can prove what it actually does.” | Screen capture → `02-sandbox.mp4` | **READY** CLI path (Cisco **VERIFIED** on skill fixture; Tessl/Snyk may `unreachable`) |
| 4 | 1:10–1:30 | Close | 20s | Title + closing line (optional disagreement one-liner in VO only — cut first if tight) | “Tripwire scans what your agents actually install, and proves what they actually do.” | Remotion `CloseSegment` | **READY** (skeleton) |

Optional disagreement VO (not on-screen claim): “And when two scanners disagree — which they will — that's the next thing we're building toward.”

---

## Capture runbook

Do these **before** rolling. From tripwire repo root.

### Prep (once per session)

```bash
# Env keys present (do not print values)
tripwire --help
tripwire scan --help   # must list --force
tripwire setup         # expect {"status":"ready"}

# Dashboard config for Live list-view demos (optional; Detection uses Mock)
./scripts/sync-dashboard-config.sh
# or: node scripts/serve-dashboard.mjs

# Serve Mock/Live UI
cd prototypes/dc-dashboard && python3 -m http.server 8765
# open http://127.0.0.1:8765/Tripwire.dc.html
# Guard tab → data source → Mock (demo data)
```

Modal must show `tripwire-scan` **deployed** (`modal app list`). Redeploy only if packaging changed:

```bash
./scripts/setup-modal.sh --deploy-only
```

### Capture A — Detection (`01-detection.mp4`) · ~30s · **Mock**

1. Browser: Mock mode, Dashboard tab, heatmap visible.
2. Click **vuln-prompt-injection-notes** (red). Zoom findings: `file_path` / `location` / snippet (~20s).
3. Click **vuln-command-injection-server**. Show tool / entity finding (~10s). Hold on entity name for handoff.
4. Export as `01-detection.mp4` (1080p, no mic if VO is separate).

Do **not** rely on Live for this beat even if Live list works — entity precision + clean red/green story is Mock.

### Capture B — Sandbox (`02-sandbox.mp4`) · ~30s · **Live CLI** (+ optional Mock)

```bash
# Prefer --force so idempotent skip never kills the take
tripwire scan --force ./fixtures/mcp/vuln-command-injection-server
```

Film tall terminal; keep readable:

- `✓ Initialized` / Modal app URL
- `[acquire] packed local target (N bytes)`
- Scanner lines (`[Cisco …]`, optional Tessl/Snyk `unreachable` — narrate as optional engines)
- JSON with `scan_run_ids`

**Alternate / cutaway (Mock):** item `vuln-command-injection-server` → sandbox panel (`sb_…`, egress phase). Use if live logs are noisy.

**Skill-only alternate** (if MCP scan flakes):

```bash
tripwire scan --force ./fixtures/skills/vuln-prompt-injection-notes
```

Still narrate MCP sandbox intent; don’t claim Tessl/Snyk completed unless logs show `completed`.

### Uncommitted discovery fix (MCP dirs)

Staged changes in `cli/src/discovery.js` teach discovery to treat a folder with `server.py` / `package.json` / etc. as a **single MCP server** (not only expand parents for `SKILL.md`).

**For Capture B:** keep those changes linked/loaded (`cd cli && npm link`) so
`tripwire scan --force ./fixtures/mcp/vuln-command-injection-server` resolves correctly.
Dry-check: `tripwire scan --dry-discover ./fixtures/mcp/vuln-command-injection-server` → one `mcp_server` target.

---

## Remotion assembly

Paths relative to Remotion repo `public/`.

| Drop | Path |
|------|------|
| Detection clip | `projects/tripwire/video/01-detection.mp4` |
| Sandbox clip | `projects/tripwire/video/02-sandbox.mp4` |
| Full VO | `projects/tripwire/audio/vo.mp3` |
| Optional music | `projects/tripwire/audio/music.mp3` |
| Transcript (later) | `projects/tripwire/audio/vo_transcript.json` |

### Wire-up steps

1. Place the two mp4s (and `vo.mp3`) at the paths above. Manifest: Remotion `public/projects/tripwire/ASSETS.md`.
2. In `DetectionSegment.tsx` / `SandboxSegment.tsx`, swap `GapCard` for:

   ```tsx
   <BRollVideo filename={CONTENT.detection.clipFile} />
   // / CONTENT.sandbox.clipFile
   ```

3. Set `ENABLE_VO = true` (and `ENABLE_MUSIC` if needed) in `src/compositions/tripwire/config.ts`.
4. Align draft VO in `content.ts` with the recorded track; retune `*_DURATION_SECONDS` if VO ≠ ~90s.
5. Optional: `/transcribe` → `vo_transcript.json` for captions.
6. Preview: `pnpm run dev` → composition **Tripwire**. Render: `pnpm exec remotion render Tripwire`.

Cold open / close stay Remotion-native (no clips). GapCards remain until clips land.

---

## VO outline (record order)

1. **Cold open:** Agents install skills and MCP servers nobody's checking.
2. **Detection:** Skills *and* MCP; findings point at a line number or a tool name/field — not a vague score.
3. **Sandbox:** Scanning MCP means executing it; Tripwire runs that in a sandbox so you can prove what it does.
4. **Close:** Tripwire scans what agents install and proves what they do.
5. **Optional cut:** Scanner disagreement = next build (not a shipped claim).

---

## If short on time

| Cut | Save |
|-----|------|
| Optional disagreement VO + shrink Close to ~12s | ~8s |
| Detection MCP handoff → 5s instead of 10s | ~5s |
| Skip Mock sandbox cutaway; CLI-only Sandbox | prep time |
| Skip Live dashboard entirely; Mock + CLI only | risk |

**Do not cut:** skill file/line beat, or sandbox kickoff / `[acquire] packed`.

**Minimum viable film order:** (1) Mock Detection skill+MCP → (2) CLI `--force` MCP scan → (3) record VO → (4) drop into Remotion.

---

## Related

- [DEMO_READINESS.md](./DEMO_READINESS.md) — P0/P1 smoke + day-of runbook
- Remotion `VIDEO_PLAN.md` + `public/projects/tripwire/ASSETS.md`
- Remotion `src/compositions/tripwire/content.ts` — VO strings + clip paths
- [fixtures/README.md](../fixtures/README.md) — green/amber/red fixtures
