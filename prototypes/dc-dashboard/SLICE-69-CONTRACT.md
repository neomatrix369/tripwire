# Slice 69 — Module Contract (parallel streams)

**Worktree:** `.worktrees/slice-69-fix-propose-apply-clean`
**Absolute worktree:** `/Users/swami/git-repos/ai-ml-dl-stuff/tools-and-utilities/tripwire/.worktrees/slice-69-fix-propose-apply-clean`
**Branch:** `slice/69-fix-propose-apply-clean` (from `main` @ b0b5027, slice 68 merged #152)
**UI surface:** 1A — extend `prototypes/dc-dashboard/` only
**Commit only when orchestrator asks** — agents write code + tests; do not commit.
**Do not edit another stream's files.**

## Invariants
- Proposed patch only — never auto-modify the approved repository
- Apply patch only to a temporary copy/worktree
- No host execution of untrusted PoC beyond isolated temp apply (`git apply`, not running scanned code)
- Never claim a vulnerability is fixed solely because a patch was generated (GWT-69.4)
- Won't-fix requires a non-empty reason
- Never colour-only status (pair colour with text/icon/`aria-*`)
- Keyboard accessible (J/K next/prev, buttons, `aria-*`)
- ESM `export` only; no inline imports
- Pure functions where possible; max ~20 lines/function; complexity ≤ 10 (modified)
- WHY-NEW-FILE comment at top of each new module (CLOSEST-EXISTING / EXTENSION-COST / PARALLEL-RATIONALE)

## Files (one owner each)

| Stream | File | Owns |
|--------|------|------|
| A Propose | `tripwire-fix-propose.js` | Minimal unified diff, root-cause vs quick-patch label, regression-test suggestion, side-by-side view model |
| B Apply | `tripwire-apply-clean.js` | Temp-copy apply-clean evaluation; injected I/O port; approved repo never written |
| C Controls | `tripwire-fix-controls.js` | Mark fixed / won't-fix (reason), copy patch / copy git apply, J/K nav, progress N of M, persistence |
| D Tests | `test/tripwire-fix.test.js` + `test/tripwire-fix-coverage.test.js` | GWT-69.1–69.4 + branch coverage of A–C |
| E Wire | `Tripwire.dc.html` + `package.json` `test:coverage --include` | Mount Fix step; import A–C; **only E edits HTML and package.json** |

## Shared finding shape (extends slice 68)

```js
{
  id, title, severity, triageStatus,
  evidenceHighlight, source, sink, explanation, verdictLine,
  howWeDecided: { final, judges, rawIds },  // final may be 'true_positive'
  evidenceVerification,  // string; 'verified' when evidence was confirmed
  proposedPatch: {       // optional inbound from SIE / fixture
    unifiedDiff, patchClass, rootCause, regressionTest
  }
}
```

Fix queue: `isFixCandidate(finding)` is true when
`howWeDecided?.final === 'true_positive'` OR `triageStatus === 'to_fix'`.
GWT-69.1 happy path uses a true_positive with verified evidence.

## Export requirements

### A `tripwire-fix-propose.js`

- `PATCH_CLASSES` — frozen `['root_cause', 'quick_patch']`
- `isFixCandidate(finding)` → boolean (see above)
- `buildProposedFix(finding, { generateFn } = {})` →
  ```
  {
    unifiedDiff,          // string, unified diff (---/+++ @@)
    patchClass,           // 'root_cause' | 'quick_patch'
    rootCause,            // short explanation
    regressionTest,       // suggestion string
    source: 'provided' | 'generateFn' | 'heuristic',
    verificationStatus: 'not_verified',  // ALWAYS — slice 70 owns verify
    claimedFixed: false                  // ALWAYS from generation
  }
  ```
  Priority: `finding.proposedPatch` if it has a non-empty `unifiedDiff` → source `'provided'`.
  Else if `generateFn` is a function, call it (SIE optional port — do not import CLI/SIE).
  Else heuristic: build a **minimal** unified diff from `source` + `evidenceHighlight` labelled `quick_patch`.
  Guard: null/empty finding → empty diff, `quick_patch`, `claimedFixed: false`, `verificationStatus: 'not_verified'`.
- `buildFixProposeView({ finding, proposedFix })` →
  ```
  {
    problemText,      // evidence / explanation (left pane)
    diffText,         // unified diff (right pane)
    patchClassLabel,  // 'Root-cause fix' | 'Quick patch'
    regressionTest,
    verificationStatus,
    claimedFixed,
    fixedClaimForbidden: true  // UI must not show "Fixed" from generation
  }
  ```

### B `tripwire-apply-clean.js`

- Inject I/O. Default tests use a fake port; one GWT-69.2 test may use a real temp dir.
- `evaluateApplyClean({ patch, approvedRepoPath, applyPort })` →
  ```
  {
    applyClean: boolean,
    approvedRepoUnchanged: true,  // MUST be true if port honours contract
    appliedTo: 'temp' | 'none',
    error: string | null
  }
  ```
- `applyPort` shape:
  ```
  {
    snapshotApprovedRepo(path) → snapshotId,        // record, do not mutate
    createTempCopy(approvedRepoPath) → tempPath,    // copy or worktree
    applyPatch(tempPath, patch) → { ok: boolean, error?: string },
    cleanup(tempPath) → void,
    approvedRepoFingerprint(path) → string          // same before/after
  }
  ```
- Contract: `applyPatch` is called **only** with `tempPath`, never `approvedRepoPath`.
- Empty/missing patch → `{ applyClean: false, appliedTo: 'none', approvedRepoUnchanged: true }`.
- After apply, compare fingerprints; if they differ, treat as **contract violation** (`approvedRepoUnchanged: false`) — production port must not do this.
- Do **not** spawn git against the approved repo. Do **not** execute scanned code.
- Export `createMemoryApplyPort()` for tests: records calls, `applyPatch` succeeds when patch contains `+++`, fails otherwise; fingerprint is stable.

### C `tripwire-fix-controls.js`

- Operator decisions: `'fixed' | 'wont_fix' | null`
- `requireWontFixReason(reason)` → boolean (trim non-empty)
- `markFixed({ findingId, storage })` — persist `{ status: 'fixed' }`
- `markWontFix({ findingId, reason, storage })` — if reason empty, return `{ ok: false, error: 'reason_required' }` and persist nothing
- `loadFixDecision(findingId, storage)` / `applyPersistedFixDecisions(findings, storage)`
- Storage key prefix: `tripwire-fix:` (do not collide with `tripwire-triage:`)
- `copyPatchText(unifiedDiff)` → the diff string (clipboard is the wire layer)
- `gitApplyCommand(unifiedDiff)` → `git apply <<'EOF'\n${diff}\nEOF` (for copy)
- `navigateFix({ key, index, count })` → `{ index }`
  - `j` / `J` → next (clamp)
  - `k` / `K` → previous (clamp)
  - other keys → unchanged
- `buildFixProgress({ findings, decisions })` → `{ reviewed, total, label }` where `label` is `"N of M reviewed"`
  - `total` = count of `isFixCandidate` (import from A — allowed; C may import A)
  - `reviewed` = candidates with persisted/in-memory `fixed` or `wont_fix`
- Import `isFixCandidate` from `./tripwire-fix-propose.js` (top-level import only).

### D Tests

- `node:test` + `node:assert/strict`
- File header: Author swami, Created 2026-09-20, Scope GWT-69.*
- Names: `test('GWT-69.x given … when … then …')` plus `// -- Given --` / `When` / `Then`
- One reason to fail per test; assertion messages required
- Cover:
  - GWT-69.1: true_positive + verified evidence → unified diff + patchClass label + regression suggestion; heuristic vs provided vs generateFn
  - GWT-69.2: applyPort.applyPatch called only with temp path; approved fingerprint unchanged; empty patch → not applied
  - GWT-69.3: won't-fix without reason fails; with reason persists; J/K; progress label
  - GWT-69.4: `claimedFixed === false` and `verificationStatus === 'not_verified'` after generate/heuristic/provided; view has `fixedClaimForbidden: true`
- Invalid/null inputs table for public functions
- Coverage file hits remaining branches (null storage, clamp nav, fingerprint mismatch path)
- Do **not** implement production modules. If imports fail, leave tests as written — orchestrator joins after A–C.

### E Wire (`Tripwire.dc.html` + `package.json`)

- Add `import('./tripwire-fix-propose.js')`, `import('./tripwire-apply-clean.js')`, `import('./tripwire-fix-controls.js')` to the existing `Promise.all` workflow kit load. Store as `wf.fixPropose`, `wf.applyClean`, `wf.fixControls`.
- `workflowIsFix` when `currentStep === 'fix'`; `workflowIsStub` only for `verify` or `report`.
- New Fix panel (replace stub **only when step is fix**):
  - Side-by-side problem vs diff (`<pre>` or `white-space:pre-wrap`)
  - Patch class label text (not colour-only)
  - Regression-test suggestion
  - Apply-clean line: `Applies cleanly: yes|no` (text)
  - Buttons: Copy patch, Copy git apply, Mark fixed, Won't fix (reason `<input>` required)
  - Progress `"N of M reviewed"`
  - `aria-label="Fix"`
  - Do **not** render the word “Fixed” as a vulnerability status from generation. Operator mark-fixed may show “Operator marked fixed — not verified” (slice 70).
- Keyboard: when `currentStep === 'fix'`, `j`/`k` move selection among fix candidates (ignore when typing in the reason input).
- `package.json` `test:coverage` `--include` add the three new modules.
- Touch HTML as little as possible; keep slice 68 Run/Triage/Investigate wiring intact.
- Verify/Report continue to show the existing “Coming in later slice” stub.

## GWT mapping (smoke)

1. Proposed minimal fix → A
2. Apply-clean on temp copy → B
3. Operator controls → C (+ E for copy/keyboard chrome)
4. Never claim fixed from generation → A (+ E copy)

## Out of scope
- Slice 70 re-scan
- Auto-commit / `git apply` on the approved repo
- Live SIE HTTP calls (inject `generateFn` only)
- Editing slice 68 module files
