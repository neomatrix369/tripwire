# Slice 15: Horizon A Factual Claim Audit

> Scenario: Brownfield | MoSCoW: Must

## Slice Workflow Bundle
- Slice name: slice-15-horizon-a-claim-audit
- Files: canvases / findings artifact (or `docs/plan/claim-audit.md`), gate-evidence
- Exit criteria: Claim PASS/FAIL/PARTIAL table closed for Horizon A public claims vs
  code/config/SoT; Bugbot+Security on branch diff attempted; unit suites run; Live 3B
  attempted or blocked→3C requested. **Findings only** — no claim remediations here.
- Commit pattern: `docs(slice-15): horizon A claim audit findings`

## Branch
`slice/15-horizon-a-claim-audit`

## Priority
Close-path Must. Execute after **slice 14** for final evidence synchronization and after slice 7 for Gate A trust strip.

## Context references (mandatory)
- Product SoT: private references
- Build gates: private references
- Matrix seed: `docs/plan/coverage-audit.md` (slice 7)
- Public: `docs/STATUS.md`, `docs/ARCHITECTURE.md`, `README.md`, `QUICKSTART.md`,
  `CONTRIBUTING.md`, `prototypes/README.md`

## Spec (GWT / User Story)
**Given** slice-7 coverage-audit.md and Gate A trust strip landed, and
slice 14 is complete with finalized coverage/docs evidence
**When** auditors run Bugbot + Security on branch diff, unit suites, live 3B attempt (or escalate with 3C),
and whole-repo claim close-out
**Then** a findings artifact marks each Horizon A claim PASS/FAIL/PARTIAL with path
evidence; Live result logged or 3C requested

## Out of scope
- Remediating FAIL rows (slice 16 📦 deferred with demo/hackathon; reinstate if needed)
- Phase 4/5 product implementation
- Raising coverage floors
- VO/Remotion / film-day claims (slice 4 📦)

## Before-Checks [GATE]
- [ ] Branch created
- [ ] Slices 7 + 14 ✅ (matrix + trust strip + final coverage matrix sync)
- [ ] Context pack + coverage-audit.md opened

## TDD Execution
Docs/audit-only. Findings canvas or `docs/plan/claim-audit.md`.

### 3B / 3C protocol

- **3B attempt target:** Live path proof from `tripwire scan` → Live dashboard.
- **3B command (standard):**
  1. Complete the Supabase, Modal, Snyk, Tessl, and Cisco setup paths in
     `docs/user-guide/`, then copy `.env.example` to `.env` and fill its
     values using `docs/user-guide/env-vars.md` (or source a pre-provisioned
     `.env`).
  2. `cd cli && npm install && npm link && cd ..`
  3. `tripwire setup`
  4. `tripwire scan ./fixtures/skills/safe-csv-cleaner`
  5. `node scripts/serve-dashboard.mjs`
- **3B evidence:** command output must show scan-run ID or findings written and at least one dashboard render path with live data rows.
- **3C request:** if 3B cannot be executed due missing credentials/infra, log a blocker in `DECISIONS.md` with:
  - owner
  - blocker reason
  - action to resolve
  - target date

## After-Checks [GATE]
- [ ] Claim inventory file exists (path list in `docs/plan/coverage-audit.md` + `docs/STATUS.md`) and each claim is marked PASS/FAIL/PARTIAL + evidence path in findings artifact
- [ ] Findings artifact exists (`docs/plan/claim-audit.md` or canvas path) with complete claim matrix and evidence links
- [ ] Bugbot check command + pass/fail recorded **or** blocker recorded as 3C request in `DECISIONS.md`
  - Preferred command (if available): `uv run python -m tripwire.audit` (or equivalent repo command)
- [ ] Security command + pass/fail recorded **or** blocker recorded as 3C request in `DECISIONS.md`
  - Command: `./scripts/security-scan.sh --dry-run` (minimum) and `./scripts/security-scan.sh` when toolchain supports full run
- [ ] Exact unit suite commands recorded with pass/fail result lines:
  - `cd cli && npm test`
  - `uv run pytest`
  - `cd prototypes/dc-dashboard && npm test` (if deps present) and/or `cd prototypes/dc-dashboard && npm run test:coverage`
- [ ] Live 3B attempt command/result recorded in `docs/plan/claim-audit.md` (or blocker recorded as 3C request in `DECISIONS.md`)
- [ ] `/nw-review` recorded (APPROVED) for slice-15 review report or explicit exception noted in `DECISIONS.md`
- [ ] No remediations required for ✅ (slice 16 📦); FAIL rows may remain documented
- [ ] `docs/plan/gate-evidence/slice-15.json` has `"verdict": "PASS"` + `commands[]` (Bugbot/Security + unit suites + 3B/3C)
- [ ] PROGRESS/TRAIL updated; ✅ only after merge

## Execution Capture Template (command-ready)

- Set `status` to `PASS`, `FAIL`, or `BLOCKED` and paste full stdout/stderr in each block.
- Gate evidence file target: `docs/plan/gate-evidence/slice-15.json`
- Findings target: `docs/plan/claim-audit.md`

### Command 15.1 (Bugbot/audit command)
- command: `uv run python -m tripwire.audit`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.2 (Security fallback 1)
- command: `./scripts/security-scan.sh --dry-run`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.3 (Security fallback 2)
- command: `./scripts/security-scan.sh`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.4 (CLI unit suite)
- command: `cd cli && npm test`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.5 (Python suite)
- command: `uv run pytest`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.6 (Dashboard suite)
- command: `cd prototypes/dc-dashboard && npm test`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.7 (Dashboard coverage)
- command: `cd prototypes/dc-dashboard && npm run test:coverage`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.8 (Live bootstrap + scan)
- command: `tripwire setup && tripwire scan ./fixtures/skills/safe-csv-cleaner` (after completing the documented vendor setup and filling `.env`)
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.9 (Live dashboard render)
- command: `node scripts/serve-dashboard.mjs`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

### Command 15.10 (`/nw-review` plan artifact)
- command: `/nw-review @nw-software-crafter task "docs/plan/slices/06-F-claim-audit/slice-15-horizon-a-claim-audit.md"`
- status: `PENDING`
- exit_code: ``
- stdout: |
  <paste command output>
- stderr: |
  <paste stderr output if any>

## /nw-review (OpenAI `gpt-5.6-terra`, low effort)

### Verdict
`APPROVED` (plan-shape audit)

### Findings

- praise: The claim-audit protocol correctly separates evidence collection, command requirements, and governance fallback (`3C`), which makes execution and audit traceable.
- praise: Scope is correctly limited to findings/verification and does not mix remediations into this slice.
- suggestion (non-blocking): move the `security-scan.sh` fallback command into a single "preferred/fallback" block in a consistent order to reduce ambiguity in later execution logs.

## Gate Status
📋 PLANNED

## Session Metrics
| Metric | Value |
|--------|-------|
| Estimated Pomos | 1–2 |
| Next-session notes | Audit-only; slice 16 deferred — log FAIL rows; fix via 17 or reinstate 16 if needed |
