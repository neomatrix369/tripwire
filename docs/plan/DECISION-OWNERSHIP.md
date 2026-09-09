# Decision Ownership
> Portable contract: always-on `decision-ownership` rule.
> Instantiated for Tripwire execution 2026-09-09 (slice 62) from portable roles + existing DECISIONS — not a ceiling raise.

| Who | Owns |
|-----|------|
| **Human** | MoSCoW / YAGNI; irreversible ADRs (Accept); trust/safety *policy*; quality *thresholds*; flag *defaults*; gate *topology*/order; ceiling **raises**; identity namespace registry; merge/release; ambiguous product intent |
| **Agent** | Reversible implementation within slice AC; gate *wiring* inside locked topology; enforce ceilings/tripwires; docs/diagram sync; safe Adapt; Red→Green; strengthen tests only (never weaken/skip/delete assertions) |
| **Shared** | ADR draft → human Accept; CF deferrals with owner slice; reviewer SKIPPED only on wrong-repo evidence + human confirm |

## Fail-closed (agent must not loosen)

- `--no-gate` / human-gate bypass = **CI-only** (attested); never invent to clear a stuck gate
- Never auto-merge
- Red→Green gates stay **armed** on live paths
- Raise budget/concurrency/timeout ceilings = **HITL**
- Collapse or rename identity namespaces = **HITL + ADR**
- Gate topology add/skip/reorder = **HITL**

## Slice 62 note

Identity shape `org/repo/<relpath>` was **DECIDED** in the slice stub (2026-09-09). Agent may implement that contract; changing the namespace shape later requires HITL + ADR.
