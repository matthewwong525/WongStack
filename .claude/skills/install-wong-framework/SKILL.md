---
name: install-wong-framework
description: Install or update the Wong Framework in the current repo — a guided, question-driven integration that deep-researches what's already there, merges your existing CLAUDE.md with the framework's conventions, installs the workflow skills (/save, /preview, /continue, /ship, /document), and seeds the docs/ progressive-disclosure wiki. Re-run it any time to update to the latest version: it diffs what's installed, walks you through each change, and re-merges without clobbering your customizations. Use when setting up a new or existing repo to use the Wong Framework, or to upgrade an existing install.
user-invocable: true
---

# /install-wong-framework

Guided installer **and** updater. First run installs; later runs update — diffing what's installed, explaining what's new, and re-merging. Two rules hold throughout:
- **Never clobber the user's work** — existing `CLAUDE.md`, docs, and customized skills are merged or confirmed, never silently overwritten.
- **Research, propose, ask, then change.** Use `AskUserQuestion` if available, else ask in plain text and wait.

## Step 0 — locate the framework source

The payload is **the WongFramework repo itself** (root holds `.claude/skills/`, `docs/`, `CLAUDE.md`, `VERSION`, `CHANGELOG.md`); this skill is one skill inside it. Resolve the repo root — `$WF` — from this skill's own path (3 dirs up), following symlinks:
```bash
WF=$(cd "$(dirname "$(readlink -f "<this SKILL.md path>")")/../../.." && pwd)
ls "$WF/VERSION" "$WF/.claude/skills/ship/SKILL.md" && LATEST=$(cat "$WF/VERSION")
```
If `$WF` lacks those (the skill was **copied** into `~/.claude/skills/` rather than symlinked, so it can't see its source), **ask for the WongFramework clone path**. If `$WF` is the current repo, **stop** — that's the source, not a target.

## Step 1 — deep-research the target repo

Launch a subagent (`Explore` if available) to report, with file paths:
> 1. **What the app is** — purpose + stack, from `README*`/manifests/entry points.
> 2. **How it ships** — CI workflows (`.github/workflows/*`) and what they gate; any preview-deploy provider; the default branch (`git symbolic-ref refs/remotes/origin/HEAD`).
> 3. **`CLAUDE.md`** — exists? Its section headings; any `WONG-FRAMEWORK:BEGIN/END` markers (already integrated) and a "What this is".
> 4. **`docs/`** — exists? Structure, and whether it's already a progressive-disclosure wiki (`README.md` hub, `wiki-style.md`).
> 5. **`.claude/skills/`** — existing skills, especially collisions: `save`, `preview`, `continue`, `ship`, `document`.
> 6. **Legacy traces** — `.claude/.wong-framework.json` manifest? a `daily/` folder? an old `claude-framework` plugin in `.claude/settings.json`?
> 7. **Tooling** — `gh` authed (`gh auth status`)? `jq`?
> Read, don't modify.

This drives every question and default below.

## Step 2 — mode

```bash
ROOT="$(git rev-parse --show-toplevel)"          # the TARGET repo, not $WF
cat "$ROOT/.claude/.wong-framework.json" 2>/dev/null
```
- **No manifest** → **fresh install** (Step 3F). (Legacy traces but no manifest → fresh install that also migrates, Step 5.)
- **Manifest** → **update** (Step 3U); compare its `version` to `$LATEST` (equal → offer to re-verify or stop).

## Step 3F — fresh install

Summarize the research, then propose the plan and ask (batch the questions — this is the moment to get the merge right):
1. **App facts** — confirm stack / how it deploys / preview deploys / default branch (these fill `CLAUDE.md`'s "What this is").
2. **CLAUDE.md merge** — the framework owns one block: the generic conventions between `WONG-FRAMEWORK:BEGIN/END` in `$WF/CLAUDE.md`. "What this is" is always app-specific and lives *outside* the markers. No existing file → create one (generated "What this is" + the block). Existing → insert the block, preserving their content (including their own "What this is"); where their rules conflict with the framework's, **ask which wins**.
3. **docs/** — none → seed `docs/README.md` (sections from research) + copy the rulebook. Existing → don't restructure; just add `docs/wiki-style.md` if missing and ensure `docs/README.md` links it.
4. **Skills** — install `save`, `preview`, `continue`, `ship`, `document` (never the installer itself). Collision with an existing skill → ask per-collision (keep theirs / replace / install under another name).
5. **Workflow fit** — confirm GitHub-Actions-as-only-gate + issue-per-`/ship` suits them (thin/absent CI is fine — just nothing to wait for).

Then integrate (`$ROOT` = target, `$WF` = source):
```bash
mkdir -p "$ROOT/.claude/skills" "$ROOT/docs"
for s in "$WF"/.claude/skills/*/; do
  name=$(basename "$s"); [ "$name" = install-wong-framework ] && continue
  if [ -e "$ROOT/.claude/skills/$name" ]; then echo "COLLISION: $name — apply the agreed resolution"
  else cp -R "$s" "$ROOT/.claude/skills/$name"; fi
done
[ -f "$ROOT/docs/wiki-style.md" ] || cp "$WF/docs/wiki-style.md" "$ROOT/docs/wiki-style.md"
```
- **CLAUDE.md** — Read + Edit/Write to create-or-merge (never blind overwrite). Lift the marker block (markers included) from `$WF/CLAUDE.md`; ensure a "## What this is" exists outside it (generate from the facts if absent); keep the markers.
- **docs/README.md** — from `$WF/docs/README.md` (seeded sections) only if absent; else ensure it links `wiki-style.md`.
- Then write the manifest (Step 4).

## Step 3U — update

Bring the repo to `$LATEST` **without** undoing customizations.
1. **Show what's new** — `$WF/CHANGELOG.md` entries newer than the installed `version`.
2. **Walk each change, ask:**
   - **Skills** — compare each `$WF/.claude/skills/<name>` (except the installer) to the installed copy: identical → update silently; **differs (customized)** → show the diff and ask (keep / take new / merge); new skill → offer it.
   - **CLAUDE.md** — re-merge **only between the markers**; leave everything outside (their "What this is") untouched. Markers missing → show the block, ask where to insert. Flag any new rule that conflicts with their content.
   - **Rulebook** — `docs/wiki-style.md` unchanged → refresh from `$WF`; edited → diff and ask.
3. Apply only what's approved, then update the manifest.

## Step 4 — manifest

```bash
cat > "$ROOT/.claude/.wong-framework.json" <<EOF
{ "version": "$LATEST", "installedAt": "<existing, or today>", "updatedAt": "$(date +%F)",
  "components": { "skills": ["save","preview","continue","ship","document"], "claudeMd": true, "docs": true } }
EOF
```
Adjust `components` to what was actually installed. Always write this last, reflecting reality — it's the source of truth for the next run.

## Step 5 — migrate legacy traces (ask first; never delete unprompted)

- A `daily/` folder (old daily notes, now replaced by `/ship` summary issues) → leave as history or remove; don't migrate content.
- An old `claude-framework` marketplace / `framework@...` plugin in `.claude/settings.json` → offer to remove (commands are plain `/save`, `/ship`, … now).
- `${CLAUDE_PLUGIN_ROOT}` in a copied-over skill → obsolete; the framework's skills use repo-relative paths.

## Step 6 — report

Mode (fresh / X→`$LATEST`); skills installed/updated/skipped (+ collisions); CLAUDE.md created-or-merged (+ conflicts reconciled); docs seeded or left intact; migrations. Then: *"Start working, then `/save` to checkpoint and `/ship` to merge — it records a summary issue and updates the docs. Re-run `/install-wong-framework` any time to update."* **Don't commit or push** — leave it for the user to review.

## Hard rules
- Research before touching anything; merge or ask, never blind-overwrite a `CLAUDE.md`, doc, or customized skill.
- **Never install the installer into a target repo.** Keep the `WONG-FRAMEWORK` markers; the user's "What this is" is theirs.
- Manifest is source-of-truth; write it last. Don't commit or push.
