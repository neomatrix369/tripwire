# Slice 14: Documentation Onboarding Rewrite + Link Repair

## Objective

Align the primary user entry docs (`README.md`, `QUICKSTART.md`, `docs/README.md`,
and `docs/user-guide/*`) into a single onboarding flow that clearly answers:

- What are prerequisites / dependencies?
- What are one-off setup steps?
- What commands are used regularly?
- What commands are maintenance tasks?

Also remove stale optional scanner-reference material from docs/code and verify key
inventory alignment in `.env.example` / env-var guidance.

## Scope

- `README.md`
- `QUICKSTART.md`
- `docs/README.md`
- `docs/user-guide/prerequisites.md`
- `docs/user-guide/onboarding-cheatsheet.md` *(new)*
- `scripts/_modal_env_split.py`
- `fixtures/OPTIONAL_SCANNER_KEYS.md`
- `docs/user-guide/env-vars.md`
- `docs/research/adapters/scanner-output-adapters.md`
- `docs/plan/gate-evidence/slice-17.json`
- `fixtures/README.md` *(link-target verification only, no content change)*

Out of scope:

- Product architecture and claims updates (`ARCHITECTURE.md`, `STATUS.md`)
- New platform capabilities or slice implementation logic

## Files touched

- `/README.md` — one-stop onboarding + command lifecycle sections
- `/QUICKSTART.md` — clarified path map + dependency/verification snippets
- `/docs/README.md` — updated doc map, first-stop links
- `/docs/user-guide/prerequisites.md` — explicit version checks + platform dependency clarification
- `/docs/user-guide/onboarding-cheatsheet.md` — new command-by-command onboarding artifact
- `/scripts/_modal_env_split.py` — remove deprecated scanner key from Modal split allowlist
- `/fixtures/OPTIONAL_SCANNER_KEYS.md` and `/docs/user-guide/env-vars.md` — remove deprecated scanner key documentation
- `/docs/research/adapters/scanner-output-adapters.md` — remove deprecated analyzer mention from adapter docs
- `/docs/plan/gate-evidence/slice-17.json` — sync env-key evidence inventory

## Execution notes

- Keep every command grouped as:
  - One-off setup
  - Regular operation
  - Maintenance
- Include direct snippets under each command group.
- Preserve existing command semantics (`tripwire setup`, `tripwire scan`, dashboard scripts).
- Ensure links are absolute to this repository and avoid references to non-existent
  paths.

## Acceptance criteria

- New users can start with prerequisites and finish a first scan or first demo without
  external guessing.
- `docs/user-guide/onboarding-cheatsheet.md` exists and is referenced from README + docs map.
- `README.md` and `QUICKSTART.md` clearly separate one-off setup, regular, and maintenance commands.
- `docs/user-guide/prerequisites.md` documents platform vs non-platform requirements.
- No command snippet appears without a working target path or command context.
- `SUPABASE_ANON_KEY` remains present in `.env.example` and is consistently documented.
- Deprecated scanner key references are removed from this slice's target
  doc/code paths.

## Review disposition

- Slice artifact is ready for `/nw-review` (`@nw-software-crafter`, `implementation` or
  `step` depending on process mode) before merge.

## Manual review findings captured (pending implementation approval)

- [ ] Docs map anchor repair (SUGGESTION): `docs/README.md` references
  `../README.md#run-it` (line 7) which does not exist. Update the anchor to an
  existing README heading (for example `#choose-your-path`) or equivalent real
  section.
- [ ] Command placeholder repair (SUGGESTION): `docs/user-guide/onboarding-cheatsheet.md`
  contains `tripwire setup && ./scripts/setup-modal.sh && tripwire scan ...`
  (line ~12). Replace `...` with a concrete fixture path to preserve one-command
  executability for new operators.
- [ ] Execution hold: apply the above two doc edits only after explicit user prompt/approval.
