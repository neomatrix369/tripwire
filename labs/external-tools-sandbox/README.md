# External tools sandbox (lab)

Isolated lab for running four external GitHub tools inside **local Docker**
and/or **Modal**, without touching Tripwire product code.

| Path | Upstream | Owner |
|------|----------|--------|
| [`vibe-kanban/`](./vibe-kanban/) | [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban) | sibling agent |
| [`who-targets-me/`](./who-targets-me/) | [WhoTargetsMe/Who-Targets-Me](https://github.com/WhoTargetsMe/Who-Targets-Me) | sibling agent |
| [`pizauth/`](./pizauth/) | [ltratt/pizauth](https://github.com/ltratt/pizauth/) | sibling agent |
| [`snare/`](./snare/) | [softdevteam/snare](https://github.com/softdevteam/snare) | sibling agent |

Shared infra (this folder’s root + `shared/` + `scripts/`) is owned by the
lab scaffold agent. Sibling agents **only write under their tool subdirectory**.

## Why this folder

- Keeps clones, Dockerfiles, and smoke scripts out of `cli/`, `sandbox/`, and
  product docs.
- Reuses Tripwire’s **Modal-first** compute story (ADR-0003) with a documented
  **local Docker fallback**.
- One compose file + one smoke runner so operators can exercise all four
  sequentially.

## Runtime preference

1. **Prefer Modal** when the tool is a long-running daemon or needs an isolated
   Linux image without polluting the host (matches `sandbox/scan_app.py`).
2. **Fall back to local Docker / Compose** when Modal cannot expose ports,
   needs a GUI/browser extension, or the sibling agent finds Modal awkward for
   that tool’s smoke bar.
3. Document the choice in each tool’s `README.md` (`Runtime: modal | docker | both`).

Tripwire has **no product Dockerfiles** today — Live scans use Modal only
(`modal deploy sandbox/scan_app.py`). This lab introduces Compose as a
**lab-only** fallback, not a change to the product path.

## Quick start

```bash
# From repo root (branch: lab/external-tools-sandbox)
cd labs/external-tools-sandbox
cp .env.example .env   # fill placeholders; never commit .env

# Sequential smoke (skips tools whose smoke script is still a stub)
./scripts/smoke-all.sh

# Or Compose once siblings add Dockerfiles
docker compose --profile all up --build
# Single tool:
docker compose --profile vibe-kanban up --build
```

Per-tool Modal entrypoints (when present):

```bash
# Example pattern — siblings wire the real app path
modal run ./vibe-kanban/modal_app.py
```

## Layout

```
labs/external-tools-sandbox/
├── README.md                 # this file
├── STATUS.md                 # PASS/PARTIAL/FAIL board (siblings update)
├── docker-compose.yml        # four services (profiles)
├── .env.example              # placeholders only
├── .gitignore
├── scripts/
│   └── smoke-all.sh          # runs each tool smoke sequentially
├── shared/
│   ├── README.md             # what we reuse from Tripwire
│   ├── modal_image.py        # thin Image helper mirroring scan_app patterns
│   └── docker-smoke.sh       # common docker build+run helpers
├── vibe-kanban/              # sibling fills
├── who-targets-me/           # sibling fills
├── pizauth/                  # sibling fills
└── snare/                    # sibling fills
```

### Sibling contract (per tool dir)

Each tool directory should eventually contain:

| Artefact | Purpose |
|----------|---------|
| `README.md` | How to run; Modal vs Docker decision; ports; secrets |
| `Dockerfile` | Local Docker image (if used) |
| `modal_app.py` | Optional Modal app (if used) |
| `smoke.sh` | Exit 0 = PASS; print clear FAIL reason otherwise |
| `config/` or examples | Non-secret sample configs |
| `.env.example` | Tool-local placeholders (optional; prefer root `.env.example`) |

Do **not** commit upstream clones into git unless the sibling explicitly
documents a sparse vendor copy. Prefer clone-on-demand in Dockerfile
`ADD`/`git clone` or a gitignored `vendor/` directory.

## Smoke bar (definition of runnable)

1. **vibe-kanban** — container/Modal starts; UI or CLI health/version responds.
2. **Who-Targets-Me** — `npm run build-*` succeeds in container; web-ext start
   documented (full Facebook login may be HITL).
3. **pizauth** — daemon starts; config parse / status / listen socket works
   (OAuth client secrets may be HITL).
4. **snare** — daemon starts with example config; binds and accepts signed ping
   or at least authenticates config load.

## Reused Tripwire patterns

See [`shared/README.md`](./shared/README.md). Short list:

| Tripwire artefact | Lab reuse |
|-------------------|-----------|
| `sandbox/scan_app.py` | `modal.App` + `Image.debian_slim` + `Secret.from_name` pattern |
| `scripts/setup-modal.sh` | Auth + secret sync model (lab uses its own secret names) |
| `scripts/_modal_env_split.py` | Never print secret values; dotenv split idea |
| `cli/src/modalClient.js` | Prefer `modal run` / CLI spawn over inventing a new client |
| `.env` / `.env.example` | `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` placeholders |
| ADR-0003 + `docs/user-guide/modal-setup.md` | Modal-first narrative |

## Port lock (DECIDED — do not change)

| Host port | Owner | Notes |
|-----------|-------|-------|
| `:8000` | **Graphiti** (external) | Do not free or remap for this lab |
| `:18000` | **snare** lab | Compose/smoke default `SNARE_HOST_PORT=18000` → `18000:8000` |
| `:3000` | vibe-kanban lab | |
| `:14204` | pizauth lab | |

snare’s container still listens on **8000 internally**; only the host publish is 18000.

## Coordination

- Branch: `lab/external-tools-sandbox`
- Siblings write **only** under their tool subdirectory + update `STATUS.md`
  lines for their tool.
- Shared infra changes stay in root / `shared/` / `scripts/`.
- Do not modify `cli/`, product `sandbox/`, or core docs unless a thin pointer
  is explicitly requested later.
