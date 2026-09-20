# Slice 70 — Module Contract (parallel streams)

**Worktree:** `.worktrees/slice-70-verify-worktree-rescan`
**Absolute worktree:** `/Users/swami/git-repos/ai-ml-dl-stuff/tools-and-utilities/tripwire/.worktrees/slice-70-verify-worktree-rescan`
**Branch:** `slice/70-verify-worktree-rescan` (from `main` @ 165ef1f, slice 69 merged #154)
**UI surface:** 1A — extend `prototypes/dc-dashboard/` only
**Commit only when orchestrator asks** — agents write code + tests; do not commit.
**Do not edit another stream's files.**

## Invariants
- Never modify the approved repo (verify runs on temp copy/worktree only)
- Never claim **finding gone** when scanners failed, timed out, or were missing (GWT-70.3)
- Never claim fixed solely because a patch was generated (slice 69) — Verify owns outcomes
- Inject I/O via `verifyPort` — no live scanner subprocess in unit tests (memory port)
- Never colour-only status (pair colour with text/icon/`aria-*`)
- ESM `export` only; no inline imports
- Pure functions where possible; max ~20 lines/function; complexity ≤ 10 (modified)
- WHY-NEW-FILE comment at top of each new module

## Depends on (slice 69 — do not rewrite)
- `tripwire-fix-propose.js` — `buildProposedFix` / `isFixCandidate`
- `tripwire-apply-clean.js` — apply-clean pattern (port seam); verify may reuse fingerprint/temp ideas but owns its own port
- Fix step remains as-is; Verify step replaces the stub

## Files (one owner each)

| Stream | File | Owns |
|--------|------|------|
| A Verify | `tripwire-verify-rescan.js` | Apply patch to temp tree, re-run applicable scanners via port, map to outcomes |
| B View | `tripwire-verify-view.js` | Dashboard Verify step view model (labels, scanner action list, honesty copy) |
| C Tests | `test/tripwire-verify.test.js` + `test/tripwire-verify-coverage.test.js` | GWT-70.1–70.3 + branch coverage of A–B |
| D Wire | `Tripwire.dc.html` + `package.json` `test:coverage --include` | Mount Verify step; import A–B; **only D edits HTML and package.json** |
| E Docs | `docs/STATUS.md`, `CHANGELOG.md`, `docs/plan/PROGRESS.md`, `docs/plan/TRAIL.md`, slice-70 stub Gate Status | STATUS Verify honesty; progress IN PROGRESS → leave COMPLETE mark for orchestrator |

## Shared shapes

Finding (from 68/69) plus optional:
```js
{
  id, title, severity, source, evidenceHighlight,
  howWeDecided: { final },
  proposedPatch: { unifiedDiff, ... }
}
```

### A `tripwire-verify-rescan.js`

- `VERIFICATION_OUTCOMES` — frozen `['finding_gone', 'still_present', 'unable_to_verify']`
- `verifyFixOnWorktree({ finding, patch, approvedRepoPath, verifyPort })` →
  ```
  {
    outcome: 'finding_gone' | 'still_present' | 'unable_to_verify',
    reason: string | null,          // required when unable_to_verify
    scannerActions: Array<{ name: string, status: string, detail?: string }>,
    approvedRepoUnchanged: boolean, // MUST be true when port honours contract
    verificationStatus: same as outcome
  }
  ```
- Outcome rules:
  1. Empty/missing patch → `unable_to_verify`, reason `'no_patch'`, `scannerActions: []`
  2. Apply fails → `unable_to_verify`, reason `'apply_failed'` (or port error)
  3. Scanner port returns `status: 'missing'|'failed'|'timeout'` → `unable_to_verify` with that reason — **never** `finding_gone`
  4. Scanner `status: 'ok'` and finding still matched in `findings` → `still_present`
  5. Scanner `status: 'ok'` and finding **not** matched → `finding_gone`
- Finding match: same `id` OR (same `title` AND same `source`) when present in scanner `findings`.
- `verifyPort` shape:
  ```
  {
    createTempCopy(approvedRepoPath) → tempPath,
    applyPatch(tempPath, patch) → { ok: boolean, error?: string },
    runApplicableScanners({ tempPath, finding }) → {
      status: 'ok' | 'failed' | 'timeout' | 'missing',
      findings: Array<{ id?, title?, source? }>,
      actions: Array<{ name, status, detail? }>,
      reason?: string
    },
    cleanup(tempPath) → void,
    approvedRepoFingerprint(path) → string
  }
  ```
- Contract: `applyPatch` / `runApplicableScanners` only receive `tempPath`, never `approvedRepoPath`.
- Always `cleanup` in `finally`.
- Fingerprint before/after; mismatch → `approvedRepoUnchanged: false` (contract violation).
- Export `createMemoryVerifyPort({ applyOk?, scanResult? })` for tests.

### B `tripwire-verify-view.js`

- `OUTCOME_LABELS` — frozen map to operator text:
  - `finding_gone` → `'Finding gone'`
  - `still_present` → `'Still present'`
  - `unable_to_verify` → `'Unable to verify'`
- `buildVerifyView({ finding, verification })` →
  ```
  {
    outcomeLabel,           // from OUTCOME_LABELS
    reasonText,             // '' or human reason
    scannerActionsLines,    // string[] e.g. "semgrep: ok — no match"
    honestyLine,            // always present; when finding_gone: "Verified on temp worktree — approved repo unchanged"
    claimedFixedForbidden: true when outcome !== 'finding_gone'
    ariaLabel: 'Verify'
  }
  ```
- Null/empty verification → treat as `unable_to_verify` / `'not_run'`.

### C Tests

- `node:test` + `node:assert/strict`
- Header: Author swami, Created 2026-09-20, Scope GWT-70.*
- Names: `test('GWT-70.x given … when … then …')` with Given/When/Then comments
- Cover:
  - GWT-70.1: patch removes issue + scanners ok → `finding_gone`
  - GWT-70.2: patch does not remove + scanners ok → `still_present`
  - GWT-70.3: missing / failed / timeout scanners → `unable_to_verify` with reason; assert outcome !== `finding_gone`
  - Apply fail / empty patch → unable
  - Port never called with approved path for apply/scan
  - Fingerprint unchanged
  - View labels match outcomes; honesty line present
- Do **not** implement A/B — leave imports; orchestrator joins after A–B land.

### D Wire (`Tripwire.dc.html` + `package.json`)

- Import `./tripwire-verify-rescan.js` and `./tripwire-verify-view.js` in workflow kit `Promise.all`. Store as `wf.verifyRescan`, `wf.verifyView`.
- `workflowIsStub` **only** when there is no live step left — Verify is live; Report already live (71). So `stubSteps = false` always for workflow panel OR remove stub for verify only.
- New Verify panel when `currentStep === 'verify'`:
  - Outcome text (not colour-only): Finding gone | Still present | Unable to verify
  - Reason when unable
  - List of scanner actions that ran
  - Honesty line about temp worktree / approved repo unchanged
  - `aria-label="Verify"`
  - Trigger verify using selected fix-candidate’s proposed patch (from `buildProposedFix`) + memory or injected port (default memory in UI is OK for prototype; wire a function `runWorkflowVerify()`)
- `package.json` `test:coverage` `--include` add both new modules.
- Touch HTML as little as possible; keep Fix/Report wiring intact.
- Update any test that asserts “only Verify stays stubbed” — Verify is no longer a stub.

### E Docs

- `docs/STATUS.md`: Verify step honesty — outcomes + temp worktree; not claimed fixed from generation
- `CHANGELOG.md`: Unreleased note for slice 70
- `docs/plan/PROGRESS.md` + `TRAIL.md`: mark 70 🔨 IN PROGRESS on branch (orchestrator sets ✅ later)
- Slice stub Gate Status → 🔨 IN PROGRESS

## GWT mapping (smoke)

1. Finding gone → A (+ B label)
2. Still present → A (+ B label)
3. Unable to verify → A (+ B; never finding gone)

## Out of scope
- Expert export polish (71 already landed)
- New ecosystem scanners (72)
- Auto-apply to approved repo
- Live Modal/scanner HTTP in unit tests
