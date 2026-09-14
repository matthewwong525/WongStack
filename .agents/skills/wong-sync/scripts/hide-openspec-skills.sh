#!/usr/bin/env bash
# Hide the CLI-generated openspec-* skills from the user's / menu.
#
# WongStack fronts every OpenSpec step with a verb — /explore, /plan, /apply,
# /ship — that owns behavior the generated skill does not (the /save handoff,
# the git boundary, the exit round). A user who reaches for /openspec-propose
# instead of /plan gets the bare step with none of it, silently. So the six
# generated skills carry `user-invocable: false`: hidden from the / menu, still
# invocable by the Skill tool, which is what keeps the handoffs working.
#
# `disable-model-invocation` is NOT the flag to use here — it blocks the Skill
# tool itself and would sever every handoff.
#
# Why this is a script and not a one-time edit: `openspec init` and
# `openspec update` rewrite these files from CLI templates, discarding the key.
# Every skill that runs either command runs this afterwards.
#
# Idempotent: re-running when the key is present changes nothing and exits 0.
# Usage: hide-openspec-skills.sh
set -uo pipefail

KEY="user-invocable: false"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$ROOT" ]; then
  echo "hide-openspec-skills: not inside a git repository" >&2
  exit 1
fi

# `.claude` is a symlink to `.agents` in some layouts, and the CLI's
# .openspec-target decides which one it generates into. Glob both, then dedupe
# by real path so a shared directory is not patched (or counted) twice.
declare -A seen=()
targets=()
for dir in "$ROOT/.claude/skills" "$ROOT/.agents/skills"; do
  [ -d "$dir" ] || continue
  for f in "$dir"/openspec-*/SKILL.md; do
    [ -f "$f" ] || continue
    real=$(readlink -f "$f" 2>/dev/null || echo "$f")
    [ -n "${seen[$real]:-}" ] && continue
    seen[$real]=1
    targets+=("$real")
  done
done

if [ ${#targets[@]} -eq 0 ]; then
  echo "hide-openspec-skills: no generated openspec-* skills found — nothing to do"
  exit 0
fi

patched=0
already=0
failed=0

for f in "${targets[@]}"; do
  name=$(basename "$(dirname "$f")")

  if [ ! -r "$f" ]; then
    echo "hide-openspec-skills: cannot read $f" >&2
    failed=$((failed + 1))
    continue
  fi

  # Frontmatter must open with --- on line 1 and close with a later ---.
  if [ "$(head -n 1 "$f")" != "---" ]; then
    echo "hide-openspec-skills: $f has no opening --- fence; refusing to edit" >&2
    failed=$((failed + 1))
    continue
  fi

  close=$(awk 'NR>1 && $0=="---" {print NR; exit}' "$f")
  if [ -z "$close" ]; then
    echo "hide-openspec-skills: $f has no closing --- fence; refusing to edit" >&2
    failed=$((failed + 1))
    continue
  fi

  # Already patched? Only look inside the frontmatter block.
  if awk -v c="$close" 'NR>1 && NR<c && /^[[:space:]]*user-invocable[[:space:]]*:/ {found=1} END {exit !found}' "$f"; then
    already=$((already + 1))
    continue
  fi

  # Insert at the TOP of the block: the frontmatter ends with a nested
  # `metadata:` block, so a key appended at the bottom reads as though it
  # belongs to it. Write to a temp file and move, so a failure never leaves a
  # half-rewritten SKILL.md behind.
  tmp=$(mktemp "${f}.XXXXXX") || { failed=$((failed + 1)); continue; }
  if awk -v key="$KEY" 'NR==1 {print; print key; next} {print}' "$f" > "$tmp"; then
    chmod --reference="$f" "$tmp" 2>/dev/null
    mv "$tmp" "$f" && patched=$((patched + 1)) || {
      rm -f "$tmp"
      echo "hide-openspec-skills: failed to write $f" >&2
      failed=$((failed + 1))
    }
  else
    rm -f "$tmp"
    echo "hide-openspec-skills: failed to rewrite $name" >&2
    failed=$((failed + 1))
  fi
done

echo "hide-openspec-skills: patched $patched, already-hidden $already"

if [ "$failed" -gt 0 ]; then
  echo "hide-openspec-skills: $failed file(s) could not be patched" >&2
  exit 1
fi
exit 0
