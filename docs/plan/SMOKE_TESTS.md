# Docs smoke tests

This runbook verifies that first-time readers can successfully progress from install to run, contribution, and maintenance without hidden gaps.

## Current status

| Field | Value |
|---|---|
| Last run | Not run yet |
| Last result | Not run |
| Scope | Fresh clone -> install -> local scan/dashboard -> optional Live setup -> maintenance -> contribution |
| Failure policy | Doc-flow breaks are hard fails. Environment constraints are recorded as blockers (`blocked-by-env`) |

## Test boundary and evidence

Run this from a fresh clone when practical. Record whether `tripwire` was already
globally linked, whether `.env` already existed, and which Live providers were
available. Live checks must use disposable/test resources; never record tokens,
service-role keys, or credential-bearing URLs.

| Field | Record |
|---|---|
| Date and commit | UTC date and tested commit SHA |
| Mode | `local-only` or `live` |
| Providers enabled | Supabase, Modal, Snyk, Tessl, Cisco AI Defense as applicable |
| Result | `pass`, `fail`, or `blocked-by-env` |
| Evidence and follow-up | Command/output summary and linked issue, if needed |

## Rerun checklist (visitor-first)

### 1) Entry and map

- Start from [README.md](../README.md).
- Open [docs/README.md](./README.md).

Checks:
- `README.md` and `docs/README.md` render a clear ordered path (install → run → contributing → maintenance).
- No dead/obvious broken links from these entry points to first-run docs.

Expected result:
- You can find the complete startup path without requiring extra source files.

### 2) Local prerequisites

File: [docs/user-guide/prerequisites.md](./user-guide/prerequisites.md)

Run:

```bash
cd /path/to/repo

git --version
git -C . rev-parse --show-toplevel
node -v
python3 -V
```

Checks:
- Node 22 and Python 3.12 are available or clearly documented as required.
- Prereq page points next steps to existing setup docs.

Expected result:
- Local checks pass.
- No extra dependency not listed in the page.

### 3) One-off install/setup command flow

File: [docs/user-guide/setup-commands.md](./user-guide/setup-commands.md)

Run (per section order):

```bash
cd /path/to/repo

git clone https://github.com/neomatrix369/tripwire.git
after_dir=$PWD
cd tripwire
cd cli
npm install
npm link
cd ..
```

Checks:
- Bootstrapping commands are executable.
- Shared setup catalog is complete for one-off setup.

Expected result:
- CLI is linkable; user can follow to next section without missing commands.

### 3a) Installed CLI proof

Run:

```bash
tripwire --help
tripwire scan --help
```

Checks:
- The linked CLI is available in a new shell and exposes the documented scan command.
- Any Python or other runtime dependency required by the CLI is either installed
  by the documented flow or reported with an actionable error.

### 4) First-run local validation (no live keys)

File: [QUICKSTART.md](../QUICKSTART.md)

Run:

```bash
cd /path/to/repo/tripwire

git --version
node -v
tripwire scan --dry-discover ./fixtures/skills/safe-csv-cleaner
tripwire scan --dry-discover ./fixtures/mcp/mcp_manifest.json
node scripts/serve-dashboard.mjs
```

Checks:
- `--dry-discover` returns fixture targets.
- Dashboard starts in Mock mode path and displays demo path in docs guidance.

Environment caveat:
- Port binding can fail in restricted sandboxes (`127.0.0.1:8765`), classify as `blocked-by-env` and continue smoke run.

Expected result:
- Local validation commands are clear and discoverable.
- No doc-flow breakage; sandbox limits are explicitly identified.

### 5) Live capabilities onboarding order

Files:
- [supabase-setup.md](./user-guide/supabase-setup.md)
- [modal-setup.md](./user-guide/modal-setup.md)
- [env-vars.md](./user-guide/env-vars.md)

Run (read/sequence check; execution depends on environment):

```bash
# Read-only smoke check in this runbook
# Confirm docs order and required steps before copying .env.example
```

Checks:
- Required platform steps are in order: Supabase setup -> Modal setup -> `.env`.
- The optional scanner choices are explicit: Snyk, Tessl, and Cisco AI Defense.
- Each provider has a documented account/key source and `.env` mapping.
- Omitted optional keys are documented to skip only that scanner engine.

Expected result:
- A new operator can provision live capabilities by following documented order.

### 5a) Live bootstrap proof (test resources only)

Run only with a disposable Supabase project and a Modal account. Do not paste
credentials into this document or command output.

```bash
tripwire setup
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
```

Checks:
- Platform setup completes without exposing credentials.
- Modal receives only non-empty scanner credentials from the documented allowlist.
- With no scanner credentials configured, the existing scanner secret is preserved.
- Authentication or cloud-account restrictions are recorded as `blocked-by-env`,
  with the documented recovery path noted.

### 5b) Scan-to-dashboard round trip

Run a fixture scan using the available mode, then start the dashboard:

```bash
tripwire scan ./fixtures/skills/safe-csv-cleaner
node scripts/serve-dashboard.mjs
```

Checks:
- A scan result is produced without requiring optional scanner credentials.
- Mock and Live dashboard modes are visibly distinct and the selected source is clear.
- In Live mode, the expected result is visible after the scan; otherwise record the
  exact dependency that blocked it.

Expected result:
- The documented path proves the product journey from scan to result review.

### 5c) Degraded mode and recovery

Checks:
- A missing optional scanner credential reports `skipped_missing_credential` and
  does not fail the complete scan.
- Modal authentication failures point to the documented login/setup path.
- Supabase connection or schema failures point to the documented setup or
  `tripwire setup --force` recovery path.
- A failure is recorded as `fail` or `blocked-by-env`; do not mask it with `|| true`.

### 6) Contributor path

File: [CONTRIBUTING.md](../CONTRIBUTING.md)

Run:

```bash
cd /path/to/repo/tripwire

./scripts/quality-gates.sh --quick
```

Checks:
- Shared path from `README.md` to CONTRIBUTING is explicit.
- Contributor flow references onboarding before dev work.
- Test locations, quality gates, and PR expectations are discoverable without a
  second installation route.

Expected result:
- Contributor path and quality-gate command map are discoverable and executable in context.

#### 6a) Keep onboarding docs in sync with code changes

If project behavior, setup flow, or maintenance flow changes, run this additional check:

- update docs linked from `README.md`, `docs/README.md`, and `CONTRIBUTING.md` first;
- update workflow/governance guidance files when behavior changed:
  - [AGENTS.md](../AGENTS.md)
  - [CLAUDE.md](../CLAUDE.md)
- review other likely impacted docs in this sequence:
  - `QUICKSTART.md`
  - `docs/user-guide/{prerequisites,setup-commands,supabase-setup,modal-setup,env-vars}.md`
  - `fixtures/OPTIONAL_SCANNER_KEYS.md`
  - `docs/STATUS.md`
  - `docs/ARCHITECTURE.md` (if architecture/deployment flow changed)
  - `docs/plan/{PROGRESS.md,TRAIL.md,gate-evidence/slice-17.json}` (if scope/status changed)
- re-run this docs smoke test before merge.

### 7) Maintenance / re-run path

File: [docs/user-guide/setup-commands.md](./user-guide/setup-commands.md)

Run:

```bash
cd /path/to/repo/tripwire

tripwire setup --force
./scripts/setup-modal.sh --secrets-only
./scripts/setup-modal.sh --deploy-only
./scripts/quality-gates.sh
```

Checks:
- Maintenance commands are separated from one-off setup.
- Optional flags are documented with expected behavior.
- Re-running setup does not duplicate or unexpectedly remove platform resources.
- Secret synchronization preserves scanner secrets when no scanner key is configured.
- Any command that changes cloud state or may incur provider cost is identified before execution.

Expected result:
- Rerun/maintenance flow is complete and not coupled to first-time onboarding.

Re-run this checklist after documentation changes that touch onboarding, running,
contributing, or maintenance guidance. Record environment constraints as
`blocked-by-env` rather than treating them as documentation failures.
