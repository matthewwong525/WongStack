---
name: install-wong-stack
description: Install or update the WongStack in the current repo — a guided, question-driven integration that deep-researches what's already there, merges your existing CLAUDE.md with WongStack's conventions, sets up the OpenSpec planning layer (openspec init), installs the workflow skills (/explore, /plan, /apply, /save, /continue, /ship, /document, /improve), optionally enables the auto-push Stop hook, and seeds the docs/ progressive-disclosure wiki. Re-run it any time to update to the latest version: it diffs what's installed, walks you through each change, and re-merges without clobbering your customizations. Use when setting up a new or existing repo to use the WongStack, or to upgrade an existing install.
user-invocable: true
---

# /install-wong-stack

Guided installer **and** updater. First run installs; later runs update — diffing what's installed, explaining what's new, and re-merging. Two rules hold throughout:
- **Never clobber the user's work** — existing `CLAUDE.md`, docs, and customized skills are merged or confirmed, never silently overwritten.
- **Research, propose, ask, then change.** Use `AskUserQuestion` if available, else ask in plain text and wait.

## Step 0 — locate (or fetch) the WongStack source

The payload is **the WongStack repo itself** (root holds `.claude/skills/`, `.claude/hooks/`, `.claude/settings.json`, `docs/`, `CLAUDE.md`, `VERSION`, `CHANGELOG.md`, and the OpenSpec planning layer — `openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills); this skill is one skill inside it. The `openspec/` scaffold and its generated commands/skills are (re)generated in the target by `openspec init` (Step 3F.4a), not copied, so they always match the installed CLI. You may be running these instructions two ways — as the installed `/install-wong-stack` skill, or read fresh from the public repo (e.g. someone pasted the SKILL.md URL into Claude). Either way you need a local clone of WongStack as `$WS`. Resolve it, cloning if there's no local source:
```bash
# (a) running as an installed skill — source is 3 dirs up from this SKILL.md (follow symlinks)
WS=$(cd "$(dirname "$(readlink -f "<this SKILL.md path>")")/../../.." 2>/dev/null && pwd)
# (b) no usable source? clone the public repo into a cache and use that
if ! ls "$WS/VERSION" >/dev/null 2>&1; then
  WS="$HOME/src/WongStack"
  [ -d "$WS/.git" ] || git clone https://github.com/matthewwong525/WongStack "$WS"
  git -C "$WS" pull --ff-only
fi
ls "$WS/VERSION" "$WS/.claude/skills/ship/SKILL.md" && LATEST=$(cat "$WS/VERSION")
```
If `$WS` resolves to the current repo, **stop** — that's the source, not a target. Optional: symlink the installer so `/install-wong-stack` is available as a real command for future updates — `ln -sf "$WS/.claude/skills/install-wong-stack" ~/.claude/skills/install-wong-stack`.

## Step 1 — deep-research the target repo

Launch a subagent (`Explore` if available) to report, with file paths:
> 1. **What the app is** — purpose + stack, from `README*`/manifests/entry points.
> 2. **How it ships** — CI workflows (`.github/workflows/*`) and what they gate; any preview-deploy provider; the default branch (`git symbolic-ref refs/remotes/origin/HEAD`).
> 3. **`CLAUDE.md`** — exists? Its section headings; any `WONG-STACK:BEGIN/END` markers (already integrated) and a "What this is".
> 4. **`docs/`** — exists? Structure, and whether it's already a progressive-disclosure wiki (`README.md` hub, `wiki-style.md`).
> 5. **`.claude/skills/`** — existing skills, especially collisions: `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `document`, `improve`. Also `.claude/settings.json` (does it already define a `hooks.Stop` entry?) and `.claude/hooks/`.
> 6. **OpenSpec** — is the `openspec` CLI installed (`command -v openspec`)? Is there already an `openspec/` folder (init'd already) or generated `.claude/commands/opsx/` commands? Is `node`/`npm` present (needed to install the CLI)?
> 7. **Legacy traces** — `.claude/.wong-stack.json` manifest? a `daily/` folder? an old `claude-framework` plugin in `.claude/settings.json`? A removed `preview` skill (pre-3.0, folded into `/save`)?
> 8. **GitHub readiness** (WongStack runs on GitHub — every skill needs this): is this a git repo (`git rev-parse --is-inside-work-tree`)? Is `gh` installed (`command -v gh`) and authed (`gh auth status`)? Is there an `origin` remote pointing at GitHub (`git remote -v`), and does it resolve (`gh repo view`)? `jq` present?
> Read, don't modify.

This drives every question and default below.

## Step 1.5 — get GitHub working (newcomer-friendly; ask before each action)

WongStack's whole workflow lives on GitHub — `/save`, `/continue`, and `/ship` push branches, open PRs, and wait on Actions (planning lives in `openspec/`, not issues). So before installing, close any gap the research found. **Don't assume the user has done this before** — explain what each piece is for, offer to run it, and never run an interactive/account-changing command without asking. Work top to bottom; skip any rung already satisfied.

1. **Git repo?** No `.git` → explain it and offer `git init` (then `git add -A && git commit -m "initial commit"` once they're ready).
2. **`gh` installed?** `command -v gh` fails → it's GitHub's official CLI and everything below needs it. Offer the right install for the platform (macOS `brew install gh`; otherwise point to <https://cli.github.com>). It's a one-time machine setup, so confirm before installing.
3. **`gh` authed?** `gh auth status` fails → this links the CLI to their GitHub account. `gh auth login` is **interactive** (browser/device-code) — don't try to drive it headless; ask them to run it in their terminal (recommend `gh auth login --web --git-protocol https`) and tell you when it's done, then re-check. If they don't have a GitHub account yet, point them to <https://github.com/signup> first.
4. **GitHub remote?** No `origin` (or it doesn't resolve) → offer to create one and push: `gh repo create <name> --source=. --remote=origin --push` (ask **private vs public** first; default the name to the directory name). If `origin` exists but isn't GitHub, surface that and ask rather than reassigning it.
5. **Preview deploys (optional).** If they want per-commit preview URLs from `/save`, mention that needs a provider (e.g. Vercel/Netlify) wired to the repo — out of scope for this installer, just flag it.

If GitHub still isn't fully working after this (e.g. they want to set up the account later), say so plainly: install can still proceed, but `/save` and `/ship` won't work until auth + a remote exist. Don't block — let them choose.

## Step 2 — mode

```bash
ROOT="$(git rev-parse --show-toplevel)"          # the TARGET repo, not $WS
# current manifest, falling back to the pre-2.0 WongFramework name
cat "$ROOT/.claude/.wong-stack.json" 2>/dev/null || cat "$ROOT/.claude/.wong-framework.json" 2>/dev/null
```
- **No manifest** (neither name) → **fresh install** (Step 3F). (Legacy traces but no manifest → fresh install that also migrates, Step 5.)
- **Manifest** → **update** (Step 3U); compare its `version` to `$LATEST` (equal → offer to re-verify or stop). A `.wong-framework.json` manifest is a pre-2.0 install — update, and migrate the old names per Step 5.

## Step 3F — fresh install

Summarize the research, then propose the plan and ask (batch the questions — this is the moment to get the merge right):
1. **App facts** — confirm stack / how it deploys / preview deploys / default branch (these fill `CLAUDE.md`'s "What this is").
2. **CLAUDE.md merge** — WongStack owns one block: the generic conventions between `WONG-STACK:BEGIN/END` in `$WS/CLAUDE.md`. "What this is" is always app-specific and lives *outside* the markers. No existing file → create one (generated "What this is" + the block). Existing → insert the block, preserving their content (including their own "What this is"); where their rules conflict with WongStack's, **ask which wins**.
3. **docs/** — none → seed `docs/README.md` (sections from research) + copy the style pages (`wiki-style.md` + `voice.md`). Existing → don't restructure; just add `docs/wiki-style.md` + `docs/voice.md` if missing and ensure `docs/README.md` links them.
4. **Skills** — install `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `document`, `improve` (never the installer itself, and never the generated `openspec-*` skills — those come from `openspec init` in 4a). Collision with an existing skill → ask per-collision (keep theirs / replace / install under another name).
4a. **OpenSpec** — the planning layer the skills front. If `openspec` isn't installed, offer to install the CLI (`npm install -g @fission-ai/openspec@latest`; if a global install is blocked, the skills can fall back to `npx @fission-ai/openspec`). Then, unless the target already has an `openspec/` folder, run `openspec init --tools claude` there to scaffold `openspec/` and generate the `/opsx:*` commands + `openspec-*` skills. Already init'd → leave it; just confirm the CLI is present.
5. **Auto-push hook (optional, ask).** Offer the `auto-push` Stop hook: *once a branch has an open PR, it auto-commits and pushes any pending work every turn, so you stop re-running `/save`.* It's more intrusive than a skill (it acts every turn), so it's **off unless the user opts in** — default no. It never touches the default branch or a branch without an open PR.
6. **Workflow fit** — confirm the loop suits them: plan in `openspec/` (`/plan`), build (`/apply`), checkpoint (`/save`) with CI as the gate when present (else PR review), resume anywhere (`/continue`), merge + archive (`/ship`). Thin/absent CI is fine — CI is an optional accelerator, not a requirement; without it the PR review is the gate.

Then integrate (`$ROOT` = target, `$WS` = source):
```bash
mkdir -p "$ROOT/.claude/skills" "$ROOT/docs"
for s in "$WS"/.claude/skills/*/; do
  name=$(basename "$s")
  # skip the installer itself and the openspec-* skills (regenerated by openspec init, 4a)
  case "$name" in install-wong-stack|openspec-*) continue;; esac
  if [ -e "$ROOT/.claude/skills/$name" ]; then echo "COLLISION: $name — apply the agreed resolution"
  else cp -R "$s" "$ROOT/.claude/skills/$name"; fi
done
[ -f "$ROOT/docs/wiki-style.md" ] || cp "$WS/docs/wiki-style.md" "$ROOT/docs/wiki-style.md"
[ -f "$ROOT/docs/voice.md" ]      || cp "$WS/docs/voice.md"      "$ROOT/docs/voice.md"
```
- **CLAUDE.md** — Read + Edit/Write to create-or-merge (never blind overwrite). Lift the marker block (markers included) from `$WS/CLAUDE.md`; ensure a "## What this is" exists outside it (generate from the facts if absent); keep the markers.
- **docs/README.md** — from `$WS/docs/README.md` (seeded sections) only if absent; else ensure it links `wiki-style.md` + `voice.md`.
- **Auto-push hook** *(only if the user opted in at Step 3F.5)* — copy the script, then **merge** the Stop hook into `.claude/settings.json` rather than overwriting it (the repo may already have hooks):
  ```bash
  mkdir -p "$ROOT/.claude/hooks"
  cp "$WS/.claude/hooks/auto-push.sh" "$ROOT/.claude/hooks/auto-push.sh"
  chmod +x "$ROOT/.claude/hooks/auto-push.sh"
  ```
  For `settings.json`: no file → copy `$WS/.claude/settings.json` verbatim. File exists → Read it and add our Stop entry to the existing `hooks.Stop` array (create `hooks`/`Stop` if absent) with `jq`, never clobbering their other hooks; skip if an identical `auto-push.sh` entry is already there (idempotent). If the user declined the hook, install neither file.
- Then write the manifest (Step 4).

## Step 3U — update

Bring the repo to `$LATEST` **without** undoing customizations.
1. **Show what's new** — `$WS/CHANGELOG.md` entries newer than the installed `version`.
2. **Walk each change, ask:**
   - **Skills** — compare each `$WS/.claude/skills/<name>` (except the installer) to the installed copy: identical → update silently; **differs (customized)** → show the diff and ask (keep / take new / merge); new skill → offer it.
   - **CLAUDE.md** — re-merge **only between the markers**; leave everything outside (their "What this is") untouched. Markers missing → show the block, ask where to insert. Flag any new rule that conflicts with their content.
   - **Style pages** — `docs/wiki-style.md` + `docs/voice.md`: unchanged → refresh from `$WS`; edited → diff and ask; missing (`voice.md` on a pre-2.3.0 repo) → add.
   - **Auto-push hook** — if the manifest shows it installed, refresh `.claude/hooks/auto-push.sh` from `$WS` (diff + ask if they edited it). If it's not installed and `$WS` newly ships it, **offer** it (same opt-in framing as Step 3F.5); on yes, install the script and merge the Stop entry into `settings.json` as in Step 3F.
   - **OpenSpec** — manifest lacks `openspec` (a pre-3.0 install) → set it up now per Step 3F.4a (install the CLI if needed, `openspec init --tools claude`), and note the retired `preview` skill was folded into `/save`. Already present → confirm the CLI is installed; leave the target's `openspec/` untouched.
3. Apply only what's approved, then update the manifest.

## Step 4 — manifest

```bash
cat > "$ROOT/.claude/.wong-stack.json" <<EOF
{ "version": "$LATEST", "installedAt": "<existing, or today>", "updatedAt": "$(date +%F)",
  "components": { "skills": ["explore","plan","apply","save","continue","ship","document","improve"], "claudeMd": true, "docs": true, "openspec": true, "autoPushHook": false } }
EOF
```
Adjust `components` to what was actually installed — set `openspec` to `true` only if `openspec init` ran (or the target was already init'd), and `autoPushHook` to `true` only if the user opted into the Stop hook. Always write this last, reflecting reality — it's the source of truth for the next run.

## Step 5 — migrate legacy traces (ask first; never delete unprompted)

- **Pre-2.0 WongFramework names** (the project was renamed WongFramework → WongStack in 2.0.0) → migrate in place:
  - `.claude/.wong-framework.json` manifest → the new manifest is written as `.claude/.wong-stack.json` in Step 4; offer to delete the old file once written.
  - `WONG-FRAMEWORK:BEGIN/END` markers in `CLAUDE.md` → recognize them as the framework block and rename to `WONG-STACK:BEGIN/END` when you re-merge (Step 3U).
  - An installed/symlinked `install-wong-framework` skill → it's this skill's old name; offer to repoint the symlink (or remove the copy) to `install-wong-stack`.
- A `daily/` folder (old daily notes, superseded by OpenSpec changes/archive) → leave as history or remove; don't migrate content.
- A leftover `preview` skill (retired in 3.0, folded into `/save`) → offer to remove it.
- An old `claude-framework` marketplace / `framework@...` plugin in `.claude/settings.json` → offer to remove (commands are plain `/save`, `/ship`, … now).
- `${CLAUDE_PLUGIN_ROOT}` in a copied-over skill → obsolete; WongStack's skills use repo-relative paths.

## Step 6 — report

Mode (fresh / X→`$LATEST`); any GitHub setup done (init / `gh` install / auth / remote created) or still outstanding; OpenSpec (CLI installed / `openspec init` run / already present); skills installed/updated/skipped (+ collisions); the auto-push hook (enabled / declined); CLAUDE.md created-or-merged (+ conflicts reconciled); docs seeded or left intact; migrations. Then: *"Plan with `/plan`, build with `/apply`, checkpoint with `/save`, resume anywhere with `/continue`, and merge + archive with `/ship`. Re-run `/install-wong-stack` any time to update."* **Don't commit or push** — leave it for the user to review.

## Hard rules
- Research before touching anything; merge or ask, never blind-overwrite a `CLAUDE.md`, doc, or customized skill.
- **Never install the installer into a target repo.** Keep the `WONG-STACK` markers; the user's "What this is" is theirs.
- Manifest is source-of-truth; write it last. Don't commit or push.
