<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## PR Composition

When creating or updating a PR with `/create-pr` or `/update-pr`, include a **Checklist**
section in the generated body (after Test Results, before Closes):

```markdown
## Checklist

- [x] `./scripts/quality-gates.sh` passes locally
- [x] New tests added or updated (or change is docs-only)
- [x] Docs updated where applicable
- [ ] No secrets or credentials committed
```

**Auto-tick rules:**
- Tick quality-gates and tests if the Test Results section shows all stacks passing
- Tick docs if the commit subjects mention docs/chore/refactor (no new behaviour)
- Leave "No secrets" **always unchecked** — the reviewer confirms this manually

This mirrors `.github/PULL_REQUEST_TEMPLATE.md` so human-opened and skill-opened PRs
share the same Checklist structure.
