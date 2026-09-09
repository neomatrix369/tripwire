# Prerequisites

> Canonical prerequisite page for all onboarding and command execution.

Start here: [QUICKSTART](../../QUICKSTART.md) · Hub: [docs/README](../README.md)

**No clone:** [hosted dashboard](https://neomatrix369.github.io/demos/tripwire-dashboard/) (Mock on GitHub Pages) · [demo walkthrough video](https://youtu.be/omGOw9ruN3Y).

Pins: Node **22** (`.nvmrc`) · Python **3.12** (`.python-version`).

Use this page to determine what must be ready before running any command sequence.
Cloud and scanner dependency order (diagram): [ARCHITECTURE — dependency order](../ARCHITECTURE.md#dependency-order-what-before-what).
Full service list: [ARCHITECTURE — External services](../ARCHITECTURE.md#0-external-services-inventory).

## Who can set up and run Tripwire

Tripwire is for a developer, platform/operations engineer, security-minded
technical practitioner, or other product user. It is an early-adopter tool with
a hands-on setup and management component.

| Need | Required familiarity |
|---|---|
| Install and configure Tripwire | Terminal and shell commands; Git; Node/Python tooling; careful editing of `.env` and other configuration files |
| Run Live scans | The above, plus cloud account setup, credential handling, and deployment/configuration troubleshooting |
| Interpret results | Enough security background or interest to interpret findings and decide when to escalate them |

You do not need to be a security expert to install or use Tripwire. Contributors
follow the same product setup before using the development guide.

## Tools and capabilities

| Need | Tools | Accounts |
|---|---|---|
| Install, dry-discover, or use Mock | Git, Node 22, npm, Python 3.12 | None |
| Run Live scans and store findings | Git, Node 22, npm, Python 3.12, `modal` CLI | Supabase + Modal |
| Enable all scanner vendors | Above tools | Snyk + Tessl + Cisco AI Defense (+ Ossprey when keyed), in addition to Supabase + Modal. DepShield needs no account |
| Enable optional tiered routing | Above tools | Superlinked SIE + Alibaba Cloud Model Studio (SIE required; Model Studio for escalation) |

## Before you start

```bash
git --version
node -v      # v22.x (.nvmrc)
npm -v       # supplied with the Node installation
python3 -V   # 3.12.x (.python-version)
```

- Use the [setup command catalog](./setup-commands.md) for concrete command runs.
- Use [QUICKSTART.md](../../QUICKSTART.md) for validation and scan workflows.

## What can Tripwire scan?

Explicit path or URL arguments (see [ADR-0012](../adr/0012-sandbox-target-acquisition.md) for sandbox dispatch):

| Input type | Example | Notes |
|---|---|---|
| Skill directory | `./fixtures/skills/safe-csv-cleaner` | Contains `SKILL.md` |
| MCP server entrypoint | `./path/to/mcp-server/index.js` | Inspected for structure |
| Git URL | `https://github.com/owner/repo` or `https://github.com/owner/repo/tree/<ref>/<path>` or `…/blob/<ref>/<path>` | **Wave P (slice 62, in progress):** GitHub browse URLs (`/tree/…`, `/blob/…`) normalize to the cloneable repo root before clone; the repo fans out to **N** skill and MCP scan targets (`identifier` `org/repo/<relpath>`; card **name** = skill/MCP identity — SKILL.md frontmatter when set — not the bare repo name; cards also show `org/repo`). Repos with no skill or MCP artifacts fail closed — no synthetic single clean scan. Spec: [slice 62](../plan/slices/16-P-git-repo-scan/slice-62-git-repo-discover-fanout.md). On `main` until merge: one opaque `cloneable` target; browse URLs may fail at `git clone`. |
| Local copy path | `/abs/path/to/dir` | Tar-uploaded to sandbox |

Use `tripwire scan --dry-discover <target>` to list expanded targets before a Live run.

**Findability at scale:** When many artifacts share a basename or skill frontmatter name across paths in one repo, the card title uses the repo-relative path when the leaf equals the GitHub repo name, and the muted `org/repo` signature remains the namespace disambiguator. Filtering/sorting by org or path may follow in later UX work.

## Capability-specific notes

| Capability | Requires |
|---|---|
| Demo / dry-discover | No vendor accounts — local tools only |
| Live (MVP) | Supabase + Modal accounts and keys |
| Full scanner coverage | + Snyk, Tessl, Cisco AI Defense keys (missing Snyk/Cisco key → `skipped_missing_credential`; missing `TESSL_TOKEN` or `TESSL_WORKSPACE` → Review (Quality) and Review (Security) are `needs_setup`, Lint still runs). DepShield: no keys. Optional `OSSPREY_API_KEY` (absent → `skipped_missing_credential`) |
| Optional tiered router | + SIE + Model Studio keys (missing → warn and skip; scan unaffected) |

Key mapping and procurement → [env-vars.md](./env-vars.md).

## Vendor setup map

**Setup** = create the vendor account / project. **Configure** = collect keys and
map them into `.env` via [env-vars.md](./env-vars.md). Open the account page for
every Live capability you intend to enable, then configure keys.

| Vendor | Account (Setup) | Keys (Configure) |
|---|---|---|
| Supabase | [Supabase setup](./supabase-setup.md) · [Dashboard](https://supabase.com/dashboard) | Project URL, API keys, DB connection string → [env-vars](./env-vars.md) |
| Modal | [Modal setup](./modal-setup.md) · [Modal](https://modal.com) | Token pair for non-interactive setup → [env-vars](./env-vars.md) |
| Snyk | [Snyk account](https://app.snyk.io) · [procurement](./env-vars.md#vendor-procurement-quick-steps) | `SNYK_TOKEN` |
| Tessl | [Tessl](https://tessl.io) · [procurement](./env-vars.md#vendor-procurement-quick-steps) | `TESSL_TOKEN`, `TESSL_WORKSPACE` |
| Cisco AI Defense | [Cisco Developer](https://developer.cisco.com) · [procurement](./env-vars.md#vendor-procurement-quick-steps) | AI Defense and MCP scanner credentials as applicable |
| DepShield | None (baked into Modal image) | None |
| Ossprey | [ossprey.com](https://ossprey.com) when access available · [procurement](./env-vars.md#vendor-procurement-quick-steps) | `OSSPREY_API_KEY` (leave blank until access lands) |

Minimum Live needs only Supabase + Modal (Setup then Configure). Scanner rows are optional until you want full coverage.

## Secrets SSOT

- `.env` keys: [env-vars.md](./env-vars.md)
- Optional key allowances: [OPTIONAL_SCANNER_KEYS.md](../../fixtures/OPTIONAL_SCANNER_KEYS.md)
