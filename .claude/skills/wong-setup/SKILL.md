---
name: wong-setup
description: The WongStack front door — a consultative setup that researches the repo, listens for where the workflow hurts, maps those pains to the WongStack verbs, and gives an honest fit verdict (including "not a good fit") before anything installs. On a yes (or an explicit "just install it") it sets up the ground — git repo, GitHub access, OpenSpec, the authored CLAUDE.md and wiki seeds, a seed manifest — then hands the install itself to /wong-sync, whose fresh mode pulls the whole payload in one manifest-driven pass. Fresh integrations only — a repo with a real manifest skips the consultation and goes straight to /wong-sync. Use when considering, evaluating, or setting up WongStack in a new or existing repo.
user-invocable: true
---

# /wong-setup

Consultative **front door**. It works out whether WongStack actually fits — researching the repo, listening for where the workflow hurts, mapping pains to the verbs that address them — and gives an honest verdict either way. On a yes it doesn't install the payload itself: it gets the ground ready, writes a **seed manifest**, and hands the install to **`/wong-sync`**, whose fresh mode pulls every payload file in one manifest-driven pass. One copy engine for install and update alike; the only payload file this skill ever copies is the `wong-sync` skill itself.

Rules that hold throughout:
- **Consult, don't sell.** Ask, diagnose, recommend — factually. No superlatives about WongStack; the willingness to say "not a good fit" is what makes a "good fit" credible.
- **Never clobber the user's work** — existing `CLAUDE.md`, docs, and colliding skills are discussed and agreed, never silently overwritten.
- **Research, propose, ask, then change.** One thing at a time, in plain language — assume the user may never have used git, GitHub, or a terminal, and welcome that start warmly.
- **You may not be Claude.** This runbook assumes only an agent that can run shell commands, edit files, and ask the user questions. Claude affordances — `AskUserQuestion`, research subagents, the Skill tool — are conveniences: use them if you have them, otherwise ask in plain text and do the work inline. Steps state the *outcome to reach*; pick your own commands except where marked **exact**.

## Step 0 — locate (or fetch) the WongStack source

**Outcome:** a clean, current local WongStack clone, referred to as `$WS`, with its `VERSION` readable — and this skill's [`references/fit-playbook.md`](references/fit-playbook.md) read (from `$WS/.claude/skills/wong-setup/references/` when you're running from a pasted URL).

Running as an installed/symlinked skill, the source repo is the one this file lives in (three directories up, following symlinks). Otherwise clone `https://github.com/matthewwong525/WongStack` into the shared cache — **exact path**, because `/wong-sync` reuses the same clone forever after: `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`. Bring an existing clone current before using it.

If `$WS` turns out to be the repo you're setting up, **stop** — that's the source, not a target. Optional: symlink this skill into the user's personal skills (`~/.claude/skills/wong-setup`) so `/wong-setup` is a real command for future runs elsewhere. It is never *copied* into a target — source-only tooling.

## Step 1 — mode check (installed repos skip the pitch)

Read the target's `.claude/.wong-stack.json` (falling back to the pre-2.0 name `.claude/.wong-framework.json`).

- **Manifest with a real `commit`** (or any pre-seed manifest) → **already installed; not a prospect — skip the consultation entirely.** Do exactly one thing: if the `wong-sync` skill is missing (an install that predates it), copy it from `$WS`. Then stop and hand off: *"WongStack is installed here — run `/wong-sync` to pull updates and contribute improvements back."*
- **Seed manifest** (`commit: null`) → a previous run stopped between seeding and syncing; pick up at Step 7's handoff.
- **No manifest** → continue. (No git repo at all → also continue; that's a normal starting point, handled in Step 5.)

## Step 2 — deep-research the target repo

**Outcome:** enough real knowledge of the repo to ask informed questions and propose sensible defaults. Use a read-only research subagent if you have one; otherwise survey inline. Report with file paths:

1. **What the app is** — purpose + stack, from `README*`/manifests/entry points.
2. **How it ships** — CI workflows and what they gate; any preview-deploy provider; the default branch.
3. **`CLAUDE.md`** — exists? Section headings; any `WONG-STACK:BEGIN/END` markers; a "What this is".
4. **Wiki/docs** — `docs/` or `wiki/`: structure, and whether it's already a progressive-disclosure wiki (`README.md` hub, `wiki-style.md`).
5. **Existing skills** — `.claude/skills/`: anything that collides with the payload names (`explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, `wong-sync`).
6. **OpenSpec** — `openspec` CLI installed? An `openspec/` folder or generated `.claude/commands/opsx/` already there? `node`/`npm` present?
7. **Which agent(s) drive the repo** — signs of Claude Code, Codex, Cursor, or others (`CLAUDE.md`, `AGENTS.md`, `.cursor/`, …); this feeds the `openspec init --tools` choice and the pointer question in Step 6.
8. **Legacy traces** — a `.wong-framework.json` manifest, `daily/` folder, `claude-framework` plugin, removed `preview` skill (pre-3.0), `contribute-wong-stack` (pre-5.0).
9. **GitHub readiness** — git repo? `gh` installed and authed? An `origin` remote that resolves? `jq`?

Read, don't modify — and **don't act on the GitHub gaps yet**; that work waits for Step 5, after the verdict.

## Step 3 — discover and diagnose (skippable)

**Fast path:** the user arrived already decided — they said "just install it", asked to skip the questions, or came in having read the README and named what they want. Confirm in one line and jump to Step 5. The consultation is for the undecided, never a toll gate.

Otherwise, hold a short discovery conversation using the [fit playbook](references/fit-playbook.md):
- Pick **2–4 questions** from the playbook's question bank, chosen and phrased around what Step 2 found — reference the actual repo ("I see there's no CI and `docs/` hasn't moved since March — how do you verify a change today?"), never the blank script. One question at a time; follow what they actually say.
- As pains surface, **map each to the verb that addresses it** using the playbook's pain→verb map, in plain factual language — what the verb does, not how great it is.
- If a **disqualifier** from the playbook surfaces mid-conversation, don't keep asking — go straight to Step 4 with the verdict.

## Step 4 — the fit verdict

Give an explicit verdict, honestly:

- **Not a good fit** — one or more playbook disqualifiers hold. Say so plainly: name the mismatch, suggest the playbook's alternative for it, invite them back if circumstances change, and **stop — the run ends here, zero changes to the repo.** This is a success outcome, not a failure.
- **Good fit** — summarize the diagnosis as the recommendation: each pain they named, next to the verb that addresses it, in a couple of plain sentences or a short table. Then ask whether they want it set up. Only a yes moves on.
- **Borderline** — say what's borderline and what would tip it either way; let the user decide. Their call is the verdict.

## Step 5 — make `/wong-sync` runnable (only after a yes)

**Outcomes to reach**, offered one plain-language rung at a time — explain *what each piece is and why it's needed* in a sentence, skip silently what's already satisfied, and never run an interactive or account-changing command without asking:

- **A git repo with at least one commit.** An empty folder is a first-class start: "a repo is just the folder Git tracks your project in — I'll set that up," then initialize and make the initial commit once they're ready.
- **GitHub working end to end** — the verbs push branches, open PRs, and wait on checks, so: `gh` installed (one-time machine setup — confirm first); `gh` authed (**hand the user the command** — `gh auth login --web --git-protocol https` — it's interactive, they run it and tell you when done; no GitHub account yet → <https://github.com/signup> first); an `origin` remote on GitHub that resolves (ask private vs public before creating one; an existing non-GitHub `origin` → surface it and ask, never reassign). If they'd rather finish GitHub later, don't block — proceed, noting `/save`/`/ship` won't work until auth + a remote exist.
- **OpenSpec ready** — the planning layer the skills front: the CLI available (global install, or an `npx @fission-ai/openspec` fallback where global installs are blocked), then `openspec init` run in the target with `--tools` matching the agent(s) from Step 2/Step 6 (already init'd → leave it, just confirm the CLI).
- **Preview deploys (optional)** — per-commit preview URLs from `/save` need a provider (Vercel/Netlify/…) wired to the repo; out of scope, just flag it.

## Step 6 — author what the payload can't carry

These come out of the research and the conversation, not out of the payload — settle them before the sync so the pull lands into agreed ground:

- **CLAUDE.md "What this is"** — confirm the app facts (stack, how it deploys, default branch) and write/keep an app-specific "What this is" *outside* the future `WONG-STACK:BEGIN/END` markers. The block itself arrives with the sync; if the research found house rules that will conflict with the block's conventions, **ask now which wins** and note the resolution for the post-sync review.
- **Wiki hub** — no `docs/`(or `wiki/`) hub? Seed a `README.md` for it with sections drawn from the research. An existing wiki is never restructured.
- **Collisions** — for each payload-name collision from Step 2, agree the resolution: keep theirs / take WongStack's / install under another name. Renames go into the seed manifest so the sync (and every later one) diffs them under the local name.
- **Not (only) Claude?** — the skills live in `.claude/skills/`, Claude Code's native location; for Codex or other agents, offer an `AGENTS.md` pointer to the verbs and their SKILL.md paths so those agents can discover and follow them too.
- **Secrets convention** *(offer, don't force)* — the `secrets.md` page arrives with the sync; additionally offer a `.env.example` seed and git-ignore entries for real secrets files. The target may already handle secrets its own way; confirm before touching `.gitignore`.

## Step 7 — bootstrap, seed, hand off

1. **Copy the `wong-sync` skill** from `$WS` into the target's `.claude/skills/` — the one payload file this skill copies (the sync can't run before it exists; it syncs itself from then on).
2. **Write the seed manifest** — **exact schema**, at `.claude/.wong-stack.json`:
```json
{ "version": null, "commit": null,
  "installedAt": "<today YYYY-MM-DD>", "updatedAt": "<today YYYY-MM-DD>",
  "upstream": { "repo": "https://github.com/matthewwong525/WongStack", "fork": null, "clone": "<the $WS path>" },
  "components": { "skills": ["explore","plan","apply","save","continue","ship","dream","improve","wong-sync"], "claudeMd": true, "docs": true, "openspec": <true if init ran, else false> } }
```
Adjust `components.skills` for the renames agreed in Step 6. `commit: null` is the signal: it tells `/wong-sync` this sync *is* the install (fresh mode — empty-tree base, whole payload as one batch-approvable pull, no contribute leg). The sync writes the real `version` and `commit` when it finishes.
3. **Hand off:** read and follow `.claude/skills/wong-sync/SKILL.md` — a file path on purpose, so any agent can follow it. Its fresh mode pulls the payload into the working tree; nothing is committed.

## Step 8 — migrate legacy traces (ask first; never delete unprompted)

For anything Step 2 found: pre-2.0 `WONG-FRAMEWORK` markers → rename to `WONG-STACK` when the block lands; a `.wong-framework.json` → offer to delete once the new manifest exists; an installed/symlinked `install-wong-framework` → offer to repoint to `wong-setup` or remove; `contribute-wong-stack` (pre-5.0) → offer to remove, `/wong-sync` owns contributions; a `daily/` folder → leave as history or remove, don't migrate; a leftover `preview` skill (pre-3.0) → offer to remove; a `claude-framework` plugin entry or `${CLAUDE_PLUGIN_ROOT}` paths → obsolete, offer to clean up.

## Step 9 — close (after /wong-sync reports)

Report the path taken (consultation → verdict, fast path, not-a-fit exit, or the installed-repo hand-off), what environment work happened or remains (GitHub, OpenSpec), what the sync pulled, collisions and how each resolved, migrations — and that everything sits **uncommitted in the working tree** for the user to review.

Then **hand the user a real first step**, not just a menu: one concrete, copy-pasteable command tied to something they might actually build — ideally addressing the first pain they named in Step 3 — e.g. *"Try `/plan add-a-readme` (name it after whatever you want to build). That drafts the plan; `/apply` builds it, `/save` checkpoints it to a PR, `/ship` merges it."* Follow with the loop for reference, and note `/wong-sync` keeps everything current from here. **Don't commit or push** — that's the user's first `/save`.

## Hard rules
- **A "not a good fit" verdict ends the run.** No partial setup, no repo changes, no second pitch.
- **The consultation is never a toll gate.** "Just install it" skips straight to Step 5.
- **No GitHub setup before the verdict.** Rungs run only after a yes (or the fast path).
- **This skill copies no payload file except `wong-sync`.** The install is `/wong-sync`'s fresh-mode pull, driven by its payload manifest — there is no second list to drift.
- **The seed manifest schema and the clone cache path are exact.** Everything else in this runbook is an outcome; reach it however your tooling allows.
- **Fresh integrations only.** A manifest with a real `commit` → ensure `wong-sync` is present, hand off, change nothing else.
- **Never copy this skill into a target repo** — source-only; offer the symlink instead. Don't commit or push; the user reviews everything.
