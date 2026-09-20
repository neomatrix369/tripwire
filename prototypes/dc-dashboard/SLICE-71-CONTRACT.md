# Slice 71 — Module Contract (Expert + Report Export)

**Worktree:** `.worktrees/slice-71-expert-export-report`  
**Branch:** `slice/71-expert-export-report`  
**Depends on:** Slice 68 (Simple/Expert toggle, Investigate, triage)  
**Commit only when orchestrator asks.**

## Invariants
- Secrets masked by default in exports (`revealSecrets` opt-in)
- Nothing uploaded — export is local copy/download only
- Expert off = Simple; jargon/raw IDs hidden
- Never colour-only; keyboard accessible

## Files

| Stream | File | Owns |
|--------|------|------|
| A Expert | `tripwire-investigate.js` | Expert-only fields: raw judges, model IDs, confidence, weakness/AI-sec IDs, scanner details, data-flow |
| B Export | `tripwire-report-export.js` | `maskSecrets`, `buildReportPayload`, `serializeReportJson`, `serializeReportMarkdown` |
| C Report | `tripwire-report.js` | `buildReportView` — fixed / left / won't fix headline + primary export label |
| D Tests | `test/tripwire-report*.test.js` + Expert cases in investigate tests | GWT-71.1–71.3 |
| E Wire | `Tripwire.dc.html` + `package.json` c8 includes | Report panel; import kits; map expert fields |

## Disposition mapping
Prefer `reportDisposition`: `fixed` | `left` | `wont_fix`.  
Else: `dismissed`→wont_fix, `fixed`→fixed, else→left.

## GWT
1. Expert on → raw judges / model IDs / confidence / weakness IDs / scanner / data-flow visible  
2. Export → evidence, verdicts, fixes, verification, provenance, coverage; secrets masked unless revealed  
3. Report step → headline fixed/left/won't fix + one primary export action
