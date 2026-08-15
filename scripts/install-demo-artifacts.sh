#!/usr/bin/env bash
# Install the Claude Code demo artifacts (plan §9 step 6 / A6):
#   - three fixture skills copied to ~/.claude/skills/ under demo names
#     (frontmatter `name:` rewritten so Claude Code registers the demo name),
#   - a demo MCP manifest at ~/.tripwire/demo-mcp.json (safe-tool / vuln-tool /
#     amber-tool pointing at the fixture run.sh scripts in place),
#   - a scan of the INSTALLED skill copies' canonical absolute paths (never
#     the pristine fixture paths — the installed, rewritten copy is what the
#     PreToolUse hook sees) plus the demo MCP manifest file itself (MCP
#     servers are scanned as manifest entries keyed by config key — key-only
#     identity, never a server directory path).
# Idempotent: re-runs overwrite the three skill dirs and re-merge the
# manifest. Clobber guard: a dir is only rm -rf'd when it carries this
# script's .tripwire-demo-marker or its SKILL.md frontmatter name equals the
# demo name; anything else is moved to a timestamped backup, never deleted.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NO_SCAN=0
for arg in "$@"; do
  case "$arg" in
    --no-scan) NO_SCAN=1 ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--no-scan]"
      echo "  --no-scan   install artifacts but skip the tripwire scan step"
      exit 0
      ;;
    *) echo "Unknown argument: $arg (try --help)" >&2; exit 1 ;;
  esac
done

SKILLS_DEST="$HOME/.claude/skills"
TRIPWIRE_DIR="$HOME/.tripwire"
DEMO_MCP="$TRIPWIRE_DIR/demo-mcp.json"

canon() {
  python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

# Frontmatter `name:` of a SKILL.md (empty output when unreadable/absent).
frontmatter_name() {
  python3 - "$1" <<'PY'
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as fh:
        lines = fh.readlines()
except OSError:
    sys.exit(0)
if not lines or lines[0].strip() != "---":
    sys.exit(0)
for line in lines[1:]:
    if line.strip() == "---":
        break
    if line.startswith("name:"):
        print(line[len("name:"):].strip().strip("'\""))
        break
PY
}

# --- 1. Skill demos: copy with frontmatter `name:` rewrite -------------------
# fixture source -> installed demo name
SKILL_SOURCES=(
  "fixtures/skills/safe-changelog-writer:safe-skill"
  "fixtures/skills/vuln-runtime-download:vuln-skill"
  "fixtures/skills/disagreement-naive-domain-check:amber-skill"
)

mkdir -p "$SKILLS_DEST" "$TRIPWIRE_DIR"

INSTALLED_SKILL_DIRS=()
for mapping in "${SKILL_SOURCES[@]}"; do
  src_rel="${mapping%%:*}"
  demo_name="${mapping##*:}"
  src="$ROOT/$src_rel"
  dest="$SKILLS_DEST/$demo_name"

  if [[ ! -f "$src/SKILL.md" ]]; then
    echo "Missing fixture: $src/SKILL.md" >&2
    exit 1
  fi

  # Clobber guard: only rm -rf a dir we can attribute to a prior demo install
  # (marker file from this script, or frontmatter name already equal to the
  # demo name). Anything else is a user's own skill that happens to share the
  # name — move it to a timestamped backup instead of destroying it.
  if [[ -d "$dest" ]]; then
    if [[ -f "$dest/.tripwire-demo-marker" ]] || \
       [[ "$(frontmatter_name "$dest/SKILL.md")" == "$demo_name" ]]; then
      # rsync-style overwrite: the installed dir exactly mirrors the fixture
      # on every run (stale files from previous versions are removed).
      rm -rf "$dest"
    else
      backup="${dest}.backup-$(date +%Y%m%d-%H%M%S)"
      mv "$dest" "$backup"
      echo "NOTE: existing $dest was not a Tripwire demo install — moved it to $backup"
    fi
  fi
  mkdir -p "$dest"
  cp -R "$src/." "$dest/"
  # Provenance marker: lets future re-runs prove the dir is safe to overwrite.
  # Fixed content (no timestamp) so the installed dir's content hash is stable
  # across re-runs of the same fixture version.
  printf '%s\n' "installed by scripts/install-demo-artifacts.sh — safe to overwrite on reinstall" \
    > "$dest/.tripwire-demo-marker"

  # Rewrite only the frontmatter `name:` line of the installed copy (python3,
  # not sed: bounded to the YAML block, hard-fails on malformed frontmatter).
  python3 - "$dest/SKILL.md" "$demo_name" <<'PY'
import sys

path, new_name = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as fh:
    lines = fh.readlines()
if not lines or lines[0].strip() != "---":
    sys.exit(f"{path}: no YAML frontmatter block")
end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
if end is None:
    sys.exit(f"{path}: unterminated frontmatter block")
name_idx = next((i for i in range(1, end) if lines[i].startswith("name:")), None)
if name_idx is None:
    sys.exit(f"{path}: no 'name:' line in frontmatter")
lines[name_idx] = f"name: {new_name}\n"
with open(path, "w", encoding="utf-8") as fh:
    fh.writelines(lines)
PY

  echo "Installed skill: $demo_name  <-  $src_rel"
  INSTALLED_SKILL_DIRS+=("$(canon "$dest")")
done

# --- 2. MCP demos: write/merge the demo manifest -----------------------------
# The MCP fixtures are not copied — the manifest points at the fixture run.sh
# scripts in place (canonical absolute paths). An MCP server's identity is its
# CONFIG KEY (safe-tool / vuln-tool / amber-tool), never a path derived from
# command/args — the fixture dirs are launch details, not identities.
MCP_SOURCES=(
  "safe-tool:safe-time-server"
  "vuln-tool:vuln-command-injection-server"
  "amber-tool:vuln-unauthenticated-http-server"
)

for mapping in "${MCP_SOURCES[@]}"; do
  fixture="${mapping##*:}"
  run_sh="$ROOT/fixtures/mcp/$fixture/run.sh"
  if [[ ! -f "$run_sh" ]]; then
    echo "Missing fixture: $run_sh" >&2
    exit 1
  fi
done

python3 - "$DEMO_MCP" "$ROOT" <<'PY'
import json
import os
import sys

dest, root = sys.argv[1], sys.argv[2]
servers = {
    "safe-tool": "safe-time-server",
    "vuln-tool": "vuln-command-injection-server",
    "amber-tool": "vuln-unauthenticated-http-server",
}

data = {}
if os.path.exists(dest):
    try:
        with open(dest, encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError):
        print(f"Warning: {dest} was unparseable — rebuilding it", file=sys.stderr)
        data = {}
if not isinstance(data, dict):
    data = {}
data.setdefault("mcpServers", {})

for key, fixture in servers.items():
    run_sh = os.path.realpath(os.path.join(root, "fixtures", "mcp", fixture, "run.sh"))
    data["mcpServers"][key] = {"type": "stdio", "command": "bash", "args": [run_sh]}

with open(dest, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
PY
echo "Wrote demo MCP manifest: $DEMO_MCP (safe-tool, vuln-tool, amber-tool)"

# --- 3. Scan the INSTALLED copies + the demo MCP manifest --------------------
# The MCP servers are scanned by passing the MANIFEST FILE as a target: the
# CLI's manifest expansion emits one entry per config key, stored with
# items.identifier = the bare key and content_hash 'pending:<key>' — exactly
# the key-only identity the PreToolUse hook resolves mcp__<key>__* calls to.
# Known accepted consequence: MCP verdicts carry no content binding (pending
# hash), and same-named keys in different projects share one identity row —
# this matches the plan §5.4 manifest-only rule. Never pass a bare key (it
# would be misclassified as a filesystem path) and never a fixture dir.
SCAN_TARGETS=("${INSTALLED_SKILL_DIRS[@]}" "$DEMO_MCP")
SCAN_CMD="cd $ROOT && tripwire scan ${SCAN_TARGETS[*]} --no-defaults"

run_scan() {
  local out status=0
  # cwd=repo root: the Modal spawn resolves sandbox/scan_app.py cwd-relatively
  # until T3 lands. Exit 1 can coexist with valid JSON (mixed stdout), so never
  # hard-fail here — extract the batch-result JSON object and surface it. Only
  # a dict carrying "batch_id" counts: trailing [route]/[sie] lines (and merged
  # stderr) can embed unrelated JSON objects that must not shadow the result.
  out="$(cd "$ROOT" && tripwire scan "${SCAN_TARGETS[@]}" --no-defaults 2>&1)" || status=$?
  local json
  json="$(printf '%s' "$out" | python3 -c '
import json, sys

text = sys.stdin.read()
decoder = json.JSONDecoder()
result = None
idx = text.find("{")
while idx != -1:
    try:
        obj, _ = decoder.raw_decode(text[idx:])
    except json.JSONDecodeError:
        pass
    else:
        if isinstance(obj, dict) and "batch_id" in obj:
            result = obj
    idx = text.find("{", idx + 1)
if result is not None:
    print(json.dumps(result, indent=2))
')"
  if [[ -n "$json" ]]; then
    echo "Scan submitted (exit $status). Result:"
    echo "$json"
  else
    echo "Warning: scan produced no parseable JSON (exit $status). Raw output:" >&2
    echo "$out" >&2
    echo "Re-run later with:"
    echo "  $SCAN_CMD"
  fi
}

echo ""
if [[ "$NO_SCAN" -eq 1 ]]; then
  echo "=== SCAN SKIPPED (--no-scan) ==="
  echo "Run it later with:"
  echo "  $SCAN_CMD"
  echo "================================"
elif ! command -v tripwire >/dev/null 2>&1; then
  echo "=== SCAN SKIPPED ('tripwire' not on PATH — run 'npm link' in cli/) ==="
  echo "Run it later with:"
  echo "  $SCAN_CMD"
  echo "======================================================================"
elif [[ ! -f "$ROOT/.env" ]]; then
  echo "=== SCAN SKIPPED (no $ROOT/.env — Supabase/Modal credentials needed) ==="
  echo "Create .env from .env.example, then run:"
  echo "  $SCAN_CMD"
  echo "========================================================================"
else
  run_scan
fi

# --- 4. Stale-row cleanup note (printed, never executed) ---------------------
cat <<EOF

--- Operator-reviewed cleanup (NOT executed by this script) ---
Fixtures scanned before path canonicalization left items rows keyed by
relative identifiers ('fixtures/...') that absolute-path lookups never match
(plan §5.4). After reviewing your dashboard, delete them (children first — no
ON DELETE CASCADE in db/schema.sql):

  psql "\$SUPABASE_DB_URL" -c "DELETE FROM findings WHERE item_id IN (SELECT id FROM items WHERE identifier LIKE 'fixtures/%'); DELETE FROM coverage WHERE scan_run_id IN (SELECT id FROM scan_runs WHERE item_id IN (SELECT id FROM items WHERE identifier LIKE 'fixtures/%')); DELETE FROM scan_run_scanners WHERE scan_run_id IN (SELECT id FROM scan_runs WHERE item_id IN (SELECT id FROM items WHERE identifier LIKE 'fixtures/%')); DELETE FROM scan_runs WHERE item_id IN (SELECT id FROM items WHERE identifier LIKE 'fixtures/%'); DELETE FROM items WHERE identifier LIKE 'fixtures/%';"
---------------------------------------------------------------
EOF

# --- 5. Summary --------------------------------------------------------------
echo ""
echo "✅ Demo artifacts installed."
echo "   Skills:  $SKILLS_DEST/{safe-skill,vuln-skill,amber-skill}"
echo "   MCP:     $DEMO_MCP"
echo ""
echo "   The demo MCP names resolve for the hook and the /tw-* skills straight"
echo "   from $DEMO_MCP — no merge needed for status/enforcement."
echo "   To actually LAUNCH the demo MCP servers in a project, merge the"
echo "   mcpServers keys from $DEMO_MCP into that project's .mcp.json"
echo "   (this script never edits any project's .mcp.json), e.g.:"
echo "     python3 -c \"import json;p='.mcp.json';d=json.load(open(p)) if __import__('os').path.exists(p) else {};d.setdefault('mcpServers',{}).update(json.load(open('$DEMO_MCP'))['mcpServers']);json.dump(d,open(p,'w'),indent=2)\""
echo ""
echo "   Verify with /tw-verify safe-skill vuln-skill amber-skill safe-tool vuln-tool amber-tool"
echo "   Restart your Claude Code session so the installed skills register."
