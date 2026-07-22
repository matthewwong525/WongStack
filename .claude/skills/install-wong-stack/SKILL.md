---
name: install-wong-stack
description: Install the WongStack in the current repo — a guided, question-driven first-time integration that deep-researches what's already there, merges your existing CLAUDE.md with WongStack's conventions, sets up the OpenSpec planning layer (openspec init), installs the workflow skills (/explore, /plan, /apply, /save, /continue, /ship, /dream, /improve, /wong-sync), and seeds the docs/ progressive-disclosure wiki. Fresh installs only — once installed, /wong-sync owns updates (and contributions back upstream); re-running this on an installed repo just bootstraps /wong-sync and hands off to it. Use when setting up a new or existing repo to use the WongStack.
user-invocable: true
---

# /install-wong-stack

Guided **fresh installer**. It installs once; from then on **`/wong-sync`** owns the round trip — pulling updates down and contributing improvements back up. Re-run on an already-installed repo, this skill only makes sure `/wong-sync` is present, then hands off to it. Two rules hold throughout:
- **Never clobber the user's work** — existing `CLAUDE.md`, docs, and colliding skills are merged or confirmed, never silently overwritten.
- **Research, propose, ask, then change.** Use `AskUserQuestion` if available, else ask in plain text and wait.

## Step 0 — locate (or fetch) the WongStack source

The payload is **the WongStack repo itself** (root holds `.claude/skills/`, `docs/`, `CLAUDE.md`, `VERSION`, `CHANGELOG.md`, and the OpenSpec planning layer — `openspec/` plus the generated `.claude/commands/opsx/` and `openspec-*` skills); this skill is one skill inside it. What installs is exactly the set in the payload manifest — [`wong-sync/references/payload-manifest.md`](../wong-sync/references/payload-manifest.md) — the same list `/wong-sync` diffs on every later sync. The `openspec/` scaffold and its generated commands/skills are (re)generated in the target by `openspec init` (Step 3.4a), not copied, so they always match the installed CLI. You may be running these instructions two ways — as the installed `/install-wong-stack` skill, or read fresh from the public repo (e.g. someone pasted the SKILL.md URL into Claude). Either way you need a local clone of WongStack as `$WS`. Resolve it, cloning into the cache `/wong-sync` will keep using:
```bash
# (a) running as an installed skill — source is 3 dirs up from this SKILL.md (follow symlinks)
WS=$(cd "$(dirname "$(readlink -f "<this SKILL.md path>")")/../../.." 2>/dev/null && pwd)
# (b) no usable source? clone the public repo into the shared cache and use that
if ! ls "$WS/VERSION" >/dev/null 2>&1; then
  WS="${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack"
  [ -d "$WS/.git" ] || git clone https://github.com/matthewwong525/WongStack "$WS"
  git -C "$WS" pull --ff-only
fi
ls "$WS/VERSION" "$WS/.claude/skills/ship/SKILL.md" && LATEST=$(cat "$WS/VERSION") && WS_HEAD=$(git -C "$WS" rev-parse HEAD)
```
If `$WS` resolves to the current repo, **stop** — that's the source, not a target. Optional: symlink this skill so `/install-wong-stack` is available as a real command for future fresh installs elsewhere — `ln -sf "$WS/.claude/skills/install-wong-stack" ~/.claude/skills/install-wong-stack`. It is never *copied* into a target (source-only tooling); `/wong-sync`, by contrast, is part of the payload and installs like any other skill.

## Step 1 — deep-research the target repo

Launch a subagent (`Explore` if available) to report, with file paths:
> 1. **What the app is** — purpose + stack, from `README*`/manifests/entry points.
> 2. **How it ships** — CI workflows (`.github/workflows/*`) and what they gate; any preview-deploy provider; the default branch (`git symbolic-ref refs/remotes/origin/HEAD`).
> 3. **`CLAUDE.md`** — exists? Its section headings; any `WONG-STACK:BEGIN/END` markers (already integrated) and a "What this is".
> 4. **`docs/`** — exists? Structure, and whether it's already a progressive-disclosure wiki (`README.md` hub, `wiki-style.md`).
> 5. **`.claude/skills/`** — existing skills, especially collisions: `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, `wong-sync`.
> 6. **OpenSpec** — is the `openspec` CLI installed (`command -v openspec`)? Is there already an `openspec/` folder (init'd already) or generated `.claude/commands/opsx/` commands? Is `node`/`npm` present (needed to install the CLI)?
> 7. **Legacy traces** — `.claude/.wong-stack.json` manifest? a `daily/` folder? an old `claude-framework` plugin in `.claude/settings.json`? A removed `preview` skill (pre-3.0, folded into `/save`)? An installed or symlinked `contribute-wong-stack` (pre-5.0, superseded by `/wong-sync`)?
> 8. **GitHub readiness** (WongStack runs on GitHub — every skill needs this): is this a git repo (`git rev-parse --is-inside-work-tree`)? Is `gh` installed (`command -v gh`) and authed (`gh auth status`)? Is there an `origin` remote pointing at GitHub (`git remote -v`), and does it resolve (`gh repo view`)? `jq` present?
> Read, don't modify.

This drives every question and default below.

## Step 1.5 — get GitHub working (start from anywhere; ask before each action)

WongStack's whole workflow lives on GitHub — `/save`, `/continue`, and `/ship` push branches, open PRs, and wait on Actions (planning lives in `openspec/`, not issues). So before installing, close any gap the research found. **Assume the user may have never done any of this** — even opened a terminal. This is a first-class starting point, not an error path: welcome someone starting from an empty folder just as warmly as someone with a repo already. For each gap, say in one plain sentence *what the piece is and why it's needed*, offer to handle it, and wait — **one thing at a time**, never a wall of tool output. Never run an interactive or account-changing command without asking. Work top to bottom; silently skip any rung already satisfied (don't narrate what already works).

0. **A repo at all?** Not inside a git repo (an empty or brand-new folder) → this is fine, and a normal place to begin. In plain language: "A repo is just the folder Git tracks your project in — I'll set that up." Offer `git init`, then `git add -A && git commit -m "initial commit"` once they're ready. Only after they confirm, continue down the rungs. (Already in a repo → skip straight to rung 2.)
1. **First commit?** Repo exists but has no commits yet → offer the initial `git add -A && git commit -m "initial commit"` so later branches/PRs have a base.
2. **`gh` installed?** `command -v gh` fails → "`gh` is GitHub's official command-line tool; the save/ship steps use it to open pull requests." Offer the right install for the platform (macOS `brew install gh`; otherwise point to <https://cli.github.com>). It's a one-time machine setup, so confirm before installing.
3. **`gh` authed?** `gh auth status` fails → "This links `gh` to your GitHub account so it can push on your behalf." `gh auth login` is **interactive** (browser/device-code) — don't try to drive it headless; ask them to run it in their terminal (recommend `gh auth login --web --git-protocol https`) and tell you when it's done, then re-check. If they don't have a GitHub account yet, point them to <https://github.com/signup> first.
4. **GitHub remote?** No `origin` (or it doesn't resolve) → "A remote is the copy of your repo on GitHub that everything syncs to." Offer to create one and push: `gh repo create <name> --source=. --remote=origin --push` (ask **private vs public** first; default the name to the directory name). If `origin` exists but isn't GitHub, surface that and ask rather than reassigning it.
5. **Preview deploys (optional).** If they want per-commit preview URLs from `/save`, mention that needs a provider (e.g. Vercel/Netlify) wired to the repo — out of scope for this installer, just flag it.

If GitHub still isn't fully working after this (e.g. they want to set up the account later), say so plainly: install can still proceed, but `/save` and `/ship` won't work until auth + a remote exist. Don't block — let them choose.

## Step 2 — mode

```bash
ROOT="$(git rev-parse --show-toplevel)"          # the TARGET repo, not $WS
# current manifest, falling back to the pre-2.0 WongFramework name
cat "$ROOT/.claude/.wong-stack.json" 2>/dev/null || cat "$ROOT/.claude/.wong-framework.json" 2>/dev/null
```
- **No manifest** (neither name) → **fresh install** (Step 3). (Legacy traces but no manifest → fresh install that also migrates, Step 5.)
- **Manifest** → **already installed; updates are `/wong-sync`'s job.** Do exactly one thing: if `.claude/skills/wong-sync/` is missing (an install that predates it), copy it from `$WS` — that single bootstrap is the only change this path makes. Then stop and hand off: *"WongStack is installed here — run `/wong-sync` to pull updates and contribute improvements back."* (A `.wong-framework.json` manifest is a pre-2.0 install: bootstrap `wong-sync` the same way and let its first sync migrate the rest per Step 5's naming notes.)

## Step 3 — fresh install

**Preamble first (before changing anything).** In a few plain sentences, tell the user what WongStack is and what you're about to set up — roughly: *"WongStack gives Claude a repeatable way to work in this repo: plan a change, build it, checkpoint it to a pull request, and ship it. I'm going to add a set of `/` commands, a planning folder, and merge a short section into your project notes — asking before each real change. Ready?"* Wait for a go-ahead. Keep it welcoming, skip jargon, and don't list the tool checks — this is the "here's the plan" moment, not a checklist.

Then summarize the research and propose the plan (batch these questions — this is the moment to get the merge right). Frame each in plain language; ask, don't assume:
1. **App facts** — confirm stack / how it deploys / preview deploys / default branch (these fill `CLAUDE.md`'s "What this is").
2. **CLAUDE.md merge** — WongStack owns one block: the generic conventions between `WONG-STACK:BEGIN/END` in `$WS/CLAUDE.md`. "What this is" is always app-specific and lives *outside* the markers. No existing file → create one (generated "What this is" + the block). Existing → insert the block, preserving their content (including their own "What this is"); where their rules conflict with WongStack's, **ask which wins**.
3. **docs/** — none → seed `docs/README.md` (sections from research) + copy the style pages (`wiki-style.md` + `voice.md`). Existing → don't restructure; just add `docs/wiki-style.md` + `docs/voice.md` if missing and ensure `docs/README.md` links them.
4. **Skills** — install the payload skills per the [payload manifest](../wong-sync/references/payload-manifest.md): `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, `wong-sync` (never this installer itself, and never the generated `openspec-*` skills — those come from `openspec init` in 4a). Collision with an existing skill → ask per-collision (keep theirs / replace / install under another name; record renames in the manifest's `skills` array so `/wong-sync` diffs them under the local name).
4a. **OpenSpec** — the planning layer the skills front. If `openspec` isn't installed, offer to install the CLI (`npm install -g @fission-ai/openspec@latest`; if a global install is blocked, the skills can fall back to `npx @fission-ai/openspec`). Then, unless the target already has an `openspec/` folder, run `openspec init --tools claude` there to scaffold `openspec/` and generate the `/opsx:*` commands + `openspec-*` skills. Already init'd → leave it; just confirm the CLI is present.
5. **Workflow fit** — confirm the loop suits them: plan in `openspec/` (`/plan`), build (`/apply`), checkpoint (`/save`) with CI as the gate when present (else PR review), resume anywhere (`/continue`), merge + archive (`/ship`), stay current (`/wong-sync`). Thin/absent CI is fine — CI is an optional accelerator, not a requirement; without it the PR review is the gate.

Then integrate (`$ROOT` = target, `$WS` = source):
```bash
mkdir -p "$ROOT/.claude/skills" "$ROOT/docs"
for s in "$WS"/.claude/skills/*/; do
  name=$(basename "$s")
  # skip the source-only installer and the openspec-* skills (regenerated by openspec init, 4a)
  case "$name" in install-wong-stack|openspec-*) continue;; esac
  if [ -e "$ROOT/.claude/skills/$name" ]; then echo "COLLISION: $name — apply the agreed resolution"
  else cp -R "$s" "$ROOT/.claude/skills/$name"; fi
done
[ -f "$ROOT/docs/wiki-style.md" ] || cp "$WS/docs/wiki-style.md" "$ROOT/docs/wiki-style.md"
[ -f "$ROOT/docs/voice.md" ]      || cp "$WS/docs/voice.md"      "$ROOT/docs/voice.md"
[ -f "$ROOT/docs/development/secrets.md" ] || { mkdir -p "$ROOT/docs/development"; cp "$WS/docs/development/secrets.md" "$ROOT/docs/development/secrets.md"; }
```
- **CLAUDE.md** — Read + Edit/Write to create-or-merge (never blind overwrite). Lift the marker block (markers included) from `$WS/CLAUDE.md`; ensure a "## What this is" exists outside it (generate from the facts if absent); keep the markers.
- **Secrets convention** *(offer, don't force)* — the [secrets](../../../docs/development/secrets.md) doc rides along with `docs/`. Additionally offer to seed a `.env.example` (copy `$WS/.env.example` if the repo has none, or point at their existing dotenv file) and to git-ignore the real secrets files — Read `.gitignore` and add `.env` / `.env.local` (and any stack-specific file like `.dev.vars`) if missing. The target may already handle secrets its own way; confirm before touching `.gitignore` or adding the example.
- **docs/README.md** — from `$WS/docs/README.md` (seeded sections) only if absent; else ensure it links `wiki-style.md` + `voice.md`.
- Then write the manifest (Step 4).

## Step 4 — manifest

```bash
cat > "$ROOT/.claude/.wong-stack.json" <<EOF
{ "version": "$LATEST", "commit": "$WS_HEAD",
  "installedAt": "$(date +%F)", "updatedAt": "$(date +%F)",
  "upstream": { "repo": "https://github.com/matthewwong525/WongStack", "fork": null, "clone": "$WS" },
  "components": { "skills": ["explore","plan","apply","save","continue","ship","dream","improve","wong-sync"], "claudeMd": true, "docs": true, "openspec": true } }
EOF
```
Adjust `components` to what was actually installed (renamed skills under their local names) — set `openspec` to `true` only if `openspec init` ran (or the target was already init'd). `commit` is the `$WS` HEAD this install copied from: it's the three-way base `/wong-sync` diffs against, and `upstream` tells it where the source, clone, and (eventually) fork live. Always write this last, reflecting reality — it's the source of truth for every later sync.

## Step 5 — migrate legacy traces (ask first; never delete unprompted)

- **Pre-2.0 WongFramework names** (the project was renamed WongFramework → WongStack in 2.0.0) → migrate in place:
  - `.claude/.wong-framework.json` manifest → the new manifest is written as `.claude/.wong-stack.json` in Step 4; offer to delete the old file once written.
  - `WONG-FRAMEWORK:BEGIN/END` markers in `CLAUDE.md` → recognize them as the framework block and rename to `WONG-STACK:BEGIN/END` when you merge.
  - An installed/symlinked `install-wong-framework` skill → it's this skill's old name; offer to repoint the symlink (or remove the copy) to `install-wong-stack`.
- An installed or symlinked **`contribute-wong-stack`** (retired in 5.0, absorbed into `/wong-sync`) → offer to remove it and note `/wong-sync` now owns contributions.
- A `daily/` folder (old daily notes, superseded by OpenSpec changes/archive) → leave as history or remove; don't migrate content.
- A leftover `preview` skill (retired in 3.0, folded into `/save`) → offer to remove it.
- An old `claude-framework` marketplace / `framework@...` plugin in `.claude/settings.json` → offer to remove (commands are plain `/save`, `/ship`, … now).
- `${CLAUDE_PLUGIN_ROOT}` in a copied-over skill → obsolete; WongStack's skills use repo-relative paths.

## Step 6 — report

Mode (fresh install, or the already-installed hand-off to `/wong-sync`); any GitHub setup done (init / `gh` install / auth / remote created) or still outstanding; OpenSpec (CLI installed / `openspec init` run / already present); skills installed/skipped (+ collisions); CLAUDE.md created-or-merged (+ conflicts reconciled); docs seeded or left intact; migrations.

Then **hand the user a real first step**, not just a menu. Lead with one concrete, copy-pasteable command tied to something they might actually build — e.g. *"Try this to start your first change: `/plan add-a-readme` (name it after whatever you want to build). That drafts the plan; then `/apply` builds it, `/save` checkpoints it to a PR, and `/ship` merges it."* Follow with the full loop for reference: *"Plan with `/plan`, build with `/apply`, checkpoint with `/save`, resume anywhere with `/continue`, merge + archive with `/ship` — and run `/wong-sync` any time to pull WongStack updates or contribute your improvements back."* **Don't commit or push** — leave it for the user to review.

## Hard rules
- Research before touching anything; merge or ask, never blind-overwrite a `CLAUDE.md`, doc, or customized skill.
- **Fresh installs only.** A manifest present → bootstrap `wong-sync` if missing, then hand off to `/wong-sync`; make no other change.
- **Never copy this installer into a target repo.** It's source-only tooling — offer it as a symlink (Step 0). `/wong-sync` is payload and always installs. Keep the `WONG-STACK` markers; the user's "What this is" is theirs.
- Manifest is source-of-truth; write it last. Don't commit or push.
