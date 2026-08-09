---
name: wong-setup
description: The WongStack front door — guided setup for turning a repo into an AI knowledge center. It researches the repo, listens for how the team works, maps process needs to WongStack's verbs and knowledge surfaces, then sets up the ground — git repo, GitHub access, OpenSpec, the authored CLAUDE.md and wiki seeds, a seed manifest — before handing the install itself to /wong-sync, which copies in every payload file the repo doesn't have yet — which, on a fresh repo, is all of them. Hard mismatches still stop safely before changes. Fresh integrations only — a repo with a real manifest skips onboarding and goes straight to /wong-sync. Use when considering, evaluating, or setting up WongStack in a new or existing repo.
user-invocable: true
---

# /wong-setup

Guided **front door**. It helps turn a repo into an AI knowledge center: researching how work happens here, listening for where process knowledge is scattered, and mapping those needs to WongStack's verbs and knowledge surfaces. It still stops before changing anything when a hard mismatch would make the workflow fight the repo. When setup proceeds, it doesn't install the payload itself: it gets the ground ready, writes a **seed manifest**, and hands the install to **`/wong-sync`**, which copies in every payload file the repo doesn't already have — on a fresh repo, the whole payload. Install isn't a special mode there; it's the ordinary rule applied to a repo that has nothing yet. One copy engine for install and update alike; the only payload file this skill ever copies is the `wong-sync` skill itself.

Rules that hold throughout:
- **Guide, don't sell.** Ask, diagnose, recommend — factually. No superlatives about WongStack; name hard mismatches plainly, but do not make denial the center of the experience.
- **Never clobber the user's work** — existing `CLAUDE.md`, docs, and colliding skills are discussed and agreed, never silently overwritten.
- **Research, propose, ask, then change.** One thing at a time, in plain language — assume the user may never have used git, GitHub, or a terminal, and welcome that start warmly.
- **You may not be Claude.** This runbook assumes only an agent that can run shell commands, edit files, and ask the user questions. Claude affordances — `AskUserQuestion`, research subagents, the Skill tool — are conveniences: use them if you have them, otherwise ask in plain text and do the work inline. Steps state the *outcome to reach*; pick your own commands except where marked **exact**.

## Step 0 — locate (or fetch) the WongStack source

**Outcome:** a clean, current local WongStack clone, referred to as `$WS`, with its `VERSION` readable — and this skill's [`references/fit-playbook.md`](references/fit-playbook.md) read (from `$WS/.claude/skills/wong-setup/references/` when you're running from a pasted URL).

Running as an installed/symlinked skill, the source repo is the one this file lives in (three directories up, following symlinks). Otherwise clone `https://github.com/matthewwong525/WongStack` into the shared cache — **exact path**, a copy of the value [`wong-sync` Step 1](../wong-sync/SKILL.md#step-1--refresh-the-clone-a-disposable-read-only-cache) owns, because `/wong-sync` reuses the same clone forever after: `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`. Bring an existing clone current before using it.

If `$WS` turns out to be the repo you're setting up, **stop** — that's the source, not a target. Optional: symlink this skill into the user's personal skills (`~/.claude/skills/wong-setup`) so `/wong-setup` is a real command for future runs elsewhere. It is never *copied* into a target — source-only tooling.

## Step 1 — mode check (installed repos skip the pitch)

Read the target's `.claude/.wong-stack.json` (falling back to the pre-2.0 name `.claude/.wong-framework.json`).

- **Manifest with a real `commit`** (or any pre-seed manifest) → **already installed; not a prospect — skip the consultation entirely.** Do exactly one thing: if the `wong-sync` skill is missing (an install that predates it), copy it from `$WS`. Then stop and hand off: *"WongStack is installed here — run `/wong-sync` to pull the latest updates."*
- **Seed manifest** (`commit: null`) → a previous run stopped between seeding and syncing; pick up at Step 7's handoff.
- **No manifest** → continue. (No git repo at all → also continue; that's a normal starting point, handled in Step 5.)

## Step 2 — deep-research the target repo

**Outcome:** enough real knowledge of the repo to ask informed questions and propose sensible defaults. Use a read-only research subagent if you have one; otherwise survey inline. Report with file paths:

1. **What the app is** — purpose + stack, from `README*`/manifests/entry points.
   **Also decide, and record for Step 6: does this repo have an app of its own?** It counts as having one if **any** of three signals is present — a `package.json` with a build script, an application entry point of any kind (not just a Node one: a `main.go`, a `manage.py`, an `index.php`), or a wrangler config. Only the absence of all three makes it an appless repo. Lean toward "has one" when uncertain: a false negative offers a starter site into an unusual repo, which is visible and deletable, while a false positive silently leaves the user with a pipeline and nothing to deploy.
2. **How it ships** — CI workflows and what they gate; any preview-deploy provider; the default branch.
3. **`CLAUDE.md`** — exists? Section headings; any `WONG-STACK:BEGIN/END` markers; a "What this is".
4. **Wiki/docs** — `wiki/` or `docs/`: structure, and whether it's already a progressive-disclosure wiki (`README.md` hub, `wiki-style.md`).
5. **Existing skills** — `.claude/skills/`: anything that collides with the payload names (`explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, `wong-sync`).
6. **OpenSpec** — `openspec` CLI installed? An `openspec/` folder or generated `openspec-*` skills already there? `node`/`npm` present?
7. **Which agent(s) drive the repo** — signs of Claude Code, Codex, Cursor, or others (`CLAUDE.md`, `AGENTS.md`, `.cursor/`, …); this feeds the `openspec init --tools` choice and the pointer question in Step 6.
8. **Legacy traces** — a `.wong-framework.json` manifest, `daily/` folder, `claude-framework` plugin, removed `preview` skill (pre-3.0), `contribute-wong-stack` (pre-5.0).
9. **GitHub readiness** — git repo? `gh` installed and authed? An `origin` remote that resolves? `openspec` on PATH? (Those four are the whole required toolchain — nothing else, no `jq`.)

Read, don't modify — and **don't act on the GitHub gaps yet**; that work waits for Step 5, after the verdict.

## Step 3 — discover the process (skippable)

**Default is guided discovery** — run it unless the user gives an **explicit skip signal**: "just install it", "skip the questions", or the like. A bare "set up WongStack in this repo" (the README paste included) is a *request to be walked through it*, **not** a skip signal — run the discovery below. On a real skip signal, confirm in one line and jump to Step 5. Discovery is for aligning the knowledge workflow to the repo, never a toll gate.

Otherwise, hold a short discovery conversation using the [process playbook](references/fit-playbook.md):
- Pick **2–4 questions** from the playbook's question bank, chosen and phrased around what Step 2 found — reference the actual repo ("I see there's no CI and the wiki hasn't moved since March — how do you verify a change today?"), never the blank script. One question at a time; follow what they actually say.
- As pains surface, **map each to the verb that addresses it** using the playbook's pain→verb map, in plain factual language — what the verb does, not how great it is.
- If a **hard mismatch** from the playbook surfaces mid-conversation, don't keep asking — go straight to Step 4 with the mismatch.

## Step 4 — recommend the path

Recommend the path plainly:

- **Hard mismatch** — one or more playbook disqualifiers hold. Say so plainly: name the mismatch, suggest the playbook's alternative for it, and **stop — the run ends here, zero changes to the repo.** This is a safety exit, not a failure.
- **Proceed** — summarize the diagnosis as the recommendation: each process need they named, next to the verb or knowledge surface that addresses it, in a couple of plain sentences or a short table. Then ask whether they want it set up. Only a yes moves on.
- **Borderline** — say what's borderline and what would tip it either way; let the user decide. Their call sets the path.

## Step 5 — make `/wong-sync` runnable (only after a yes)

**Outcomes to reach**, offered one plain-language rung at a time — explain *what each piece is and why it's needed* in a sentence, skip silently what's already satisfied, and never run an interactive or account-changing command without asking:

- **A git repo, on `main`.** An empty folder is a first-class start: "a repo is just the folder Git tracks your project in — I'll set that up," then `git init -b main`. **The initial commit is not this rung** — an empty folder has nothing to commit, and `git commit` fails on an empty index. It waits for Step 7, once the seeding has written files. Never invent a placeholder file to commit against, and never leave the repo commit-less.
  - **`main` is the default branch, everywhere.** Because this rung creates it and `gh repo create` adopts the local branch name, every repo setup produces is on `main` — which is why the verbs assume it rather than detecting it. Nothing here needs `git remote set-head`.
- **GitHub working end to end** — the verbs push branches, open PRs, and wait on checks, so: `gh` installed (one-time machine setup — confirm first); `gh` authed (**hand the user the command** — `gh auth login --web --git-protocol https --scopes workflow` — it's interactive, they run it and tell you when done; no GitHub account yet → <https://github.com/signup> first); an `origin` remote on GitHub that resolves (ask private vs public before creating one; an existing non-GitHub `origin` → surface it and ask, never reassign). If they'd rather finish GitHub later, don't block — proceed, noting `/save`/`/ship` won't work until auth + a remote exist.
  - **`--scopes workflow` is not optional padding** — without it, pushing any workflow file fails at push time with an error a newcomer can't act on; [why, and the plain-language framing](../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope).
  - **Already authenticated?** `gh auth status` must show `workflow` in the token scopes; missing, in a repo taking (or already on) the stack pack → offer `gh auth refresh --scopes workflow`. Catch it here, not at the first push.
- **A name on each change — read from GitHub, never asked for.** Git stamps every change with a name and email, and refuses to record one without them (*"Author identity unknown — Please tell me who you are"*). `gh auth login` does **not** set them, so a machine that just authenticated still fails at the first commit. Check `git config user.name` and `user.email` (any scope); where either is missing, take both from the account that is already signed in and set them repo-locally:

  ```bash
  gh api user --jq '{name, login, id}'      # name may be a real name or null; login and id always resolve
  ```

  Use `name` (falling back to `login`) and — because **`email` comes back `null` whenever the user keeps their address private, which is GitHub's default** — the account's noreply address, `<id>+<login>@users.noreply.github.com`. That address is what GitHub itself stamps on commits made in the browser: it always pushes, and it discloses nothing. Say what you set in one line ("I've set your commits to show as *Ada Lovelace* — that's the name on your GitHub account"), and move on.
  - **Only ask as a fallback.** `gh` unauthenticated or the call fails → ask for a name and email in plain language, then set them. What you must not do is commit without an identity: it doesn't fail politely, it stops the run.
  - Already set at any scope → leave it alone and say nothing.
- **OpenSpec ready** — the planning layer the skills front: the CLI available (global install, or an `npx @fission-ai/openspec` fallback where global installs are blocked), then `openspec init` run in the target with `--tools` matching the agent(s) from Step 2/Step 6 (already init'd → leave it, just confirm the CLI).
  - **Node arrives at the point of need, never pre-emptively.** The CLI is npm-only, so it needs [Node.js](https://nodejs.org/) — but don't install a runtime as part of a readiness sweep. Reach this outcome, find Node missing, *then* explain what needs installing and why, and ask. Installing a runtime is the only step in setup that changes the user's machine rather than their repo; it's the one that should ask.
  - Prefer a **user-local** install (the official installer, or `nvm` into `$HOME`) over a `sudo` package manager, which simply fails on a managed laptop.
  - **A no is not a dead end, but be exact about the cost.** Everything that needs no runtime still installs: `CLAUDE.md`, the wiki, `notes/`, and every skill file. What stops working is the **planning layer** — `/plan`, `/apply`, `/ship`, *and `/save`'s change-authoring*, which all ask the CLI for artifact templates at runtime. Leaves working: `/continue`, `/dream`, and `/save`'s git side (commit, push, PR, CI) for a change that already exists.
    **`/save` is not a no-runtime verb**, though this page long said it was. It shells out to `openspec new change`, `openspec status --json`, and `openspec instructions` whenever it authors the change for a session that skipped `/plan` — which is most sessions. Promising otherwise is wrong at the one moment the user is deciding whether to install anything.
    Say which verbs are unavailable and how to enable them later, then carry on. Don't leave the repo half-written or re-ask each step. See [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need).
  - **Correct the CLI's parting advice.** `openspec init` finishes by printing *"Getting started: Start your first change: `/opsx:propose`"*. That command is not installed — the CLI generates the five `openspec-*` skills and no `/opsx:*` commands — and it's the last thing on the user's screen. Immediately say the true version: *"One correction to what OpenSpec just printed: here you start a change with `/plan`, not `/opsx:propose` — that command isn't installed."*
- **Preview deploys (optional)** — per-commit preview URLs from `/save` need a provider (Vercel/Netlify/…) wired to the repo; out of scope, just flag it.

## Step 6 — author what the payload can't carry

These come out of the research and the conversation, not out of the payload — settle them before the sync so the pull lands into agreed ground:

- **CLAUDE.md "What this is"** — confirm the app facts (stack, how it deploys, default branch) and write/keep an app-specific "What this is" *outside* the future `WONG-STACK:BEGIN/END` markers. The block itself arrives with the sync; if the research found house rules that will conflict with the block's conventions, **ask now which wins** and note the resolution for the post-sync review.
- **Secrets can't be committed — write this before anything can act on it.** Add the four ignore lines to `.gitignore` (creating the file where the repo has none, appending where it has one, adding nothing where both families are already covered):

  ```gitignore
  .env*
  !.env.example
  .dev.vars*
  !.dev.vars.example
  ```

  **This is not part of the offer below, and it is not conditional on anything** — not the stack pack, not the secrets convention, not a yes. `secrets.md` arrives in this same run stating that the primary worktree's `.env` is git-ignored and telling the reader to initialize it from the active branch's `.env.example`. Until these lines exist that statement is false, and the file it tells them to create holds a token the credentials page calls *"effectively account-root."* Declining a documentation convention is a real choice; leaving a credential committable is not one, so it isn't offered.
  - The wildcard catches `.env.staging` and friends; the negation keeps the committed `.example` twin. Each pair needs both lines — getting either half wrong is silent.
  - `git check-ignore -q .env` before moving on. Already tracked in git (`git ls-files .env`)? Widening `.gitignore` does **not** untrack it: say so plainly, and give both steps — `git rm --cached .env`, and rotate the credential, because it's in every clone's history.
- **Wiki hubs** — no `wiki/` (or `docs/`) hub? Seed `wiki/README.md` with sections drawn from the research. An existing wiki is never restructured.
  - **Seed `wiki/development/README.md` too.** Payload pages link to it — `secrets.md` closes with *"Other development processes live in [Development](README.md)"*, and `required-tools.md` carries the same pointer — so without it the install ships a dead link on arrival. Real sections, short: what belongs in `development/`, and pointers to the pages the sync is about to land there. An empty stub is the stale-wiki failure this toolkit exists to prevent.
  - The rule generalizes: **a hub a payload page links to is a hub setup seeds.** Add a payload page that points at a new section, and that section's hub joins this list — `scripts/check-payload-links.mjs` fails the release until it does.
- **Collisions** — for each payload-name collision from Step 2, agree the resolution: keep theirs / take WongStack's / install under another name. Renames go into the seed manifest so the sync (and every later one) diffs them under the local name.
- **Not (only) Claude?** — the skills live in `.claude/skills/`, Claude Code's native location; for Codex or other agents, offer an `AGENTS.md` pointer to the verbs and their SKILL.md paths so those agents can discover and follow them too.
- **Secrets convention** *(offer, don't force)* — the `secrets.md` page arrives with the sync; additionally offer a `.env.example` seed. The target may already handle secrets its own way, so confirm before adding it. **The ignore lines are not in this offer** — they went in above, unconditionally, and a no here doesn't take them back out.
- **Cloudflare stack pack** *(one plain offer; decline is the default)* — ask once whether they want this to be **a real website people can visit**.

  **Ask in outcomes, not components.** The person answering may not know what a Worker or a D1 database is, and decline is the documented safe default — so an inventory-shaped offer converts exactly the audience this is for into a no-by-confusion. Lead with the result and the cost:

  > *"Do you want this to be a real website people can open at an address? I can set up the hosting, the data storage, and automatic publishing — so every change you make gets its own link to look at before it goes live. It needs a free Cloudflare account and a few minutes. Totally optional; everything else works either way."*

  **Where Step 2 found no app of its own, the same one question also covers the starter site.** A repo with nothing to deploy cannot honour "a real website people can open at an address" — the pack would land a complete pipeline with nothing to run through it. So the app is part of what this yes delivers, not a second decision. Add one clause, still in outcomes:

  > *"…automatic publishing. There's nothing to publish yet, so I'll also set up a starter site you can change — that way there's something real at the address from day one."*

  **Still exactly one question.** Don't ask whether they want an app, don't name React, Vite, a Worker, or a framework, and don't offer a choice of stack — a user who can't evaluate the question gets nothing from being asked it, and a no leaves them precisely where the bug already leaves them. **A repo that already has an app never sees any of this**: the offer covers the pack alone and the scaffold is not mentioned.

  Keep product names, file lists, and tool requirements **out of the prompt**. Have them ready for a user who asks: it's the opt-in D1 + Workers pack — the zero-config pipeline scripts, a GitHub Actions workflow, a seed template, the provisioning skill, and the [`wiki/stack/`](../../../wiki/stack/README.md) docs; it fits a React-on-Workers-with-D1 app, adds `node`/`npm`/`wrangler` to *that repo's* build/CI ([required tools](../../../wiki/development/required-tools.md#the-opt-in-cloudflare-stack-pack)), and is worth nothing to a repo on another stack.

  **On a yes:** set `components.stackPack: true` in the seed manifest (Step 7) — plus `components.appScaffold: true` when the offer included the starter site — so the sync copies in the pack's drop-in files and, where flagged, the [app scaffold](../wong-sync/references/payload-manifest.md#the-opt-in-app-scaffold). Apply **no config fragment**: `/wong-cloudflare` owns those, including the `wrangler.jsonc` block whose real ids only it can know. Tell them the follow-on step and that it waits for them: *"When you've got a Cloudflare account, run `/wong-cloudflare` — it configures everything and puts this online. No rush; it works whenever."* The token usually arrives well after onboarding does, so configuration and provisioning are deliberately one separate, re-runnable step.

  **On a no (or no answer):** leave `stackPack` false and touch none of it. Declining never gates the rest of setup, and the door stays open: taking the pack later is setting `components.stackPack: true` in `.claude/.wong-stack.json`, running `/wong-sync` to land the files, then `/wong-cloudflare` to configure and provision.

  **Don't offer the [staging walkthrough](../../../wiki/development/staging-walkthrough.md) here.** It only means anything once the repo has an app with screens and preview URLs, which on a fresh setup it doesn't — offering it now buys a yes to something they can't use, or a no to something they'd have wanted later. Name it once, as a thing that exists, and move on: *"Later on, once there's something to look at, `/walk` can drive the app in a browser and show you screenshots of it working. Worth knowing about; nothing to do now."* There is nothing to adopt and nothing to record: `/walk` installs its own browser on the machine when they first use it.

## Step 7 — bootstrap, seed, hand off

1. **Copy the `wong-sync` skill** from `$WS` into the target's `.claude/skills/` — the one payload file this skill copies (the sync can't run before it exists; it syncs itself from then on).
2. **Write the seed manifest** at `.claude/.wong-stack.json`. The **schema has one owner** — [`wong-sync` Step 4](../wong-sync/SKILL.md#step-4--rewrite-the-manifest-always-last), in the skill you just copied — so write that same shape with: `version: null` and `commit: null` (they mark the repo as not-yet-installed), `installedAt`/`updatedAt` today (`YYYY-MM-DD`), the `upstream` block with `fork: null` and the `$WS` clone path, `components.skills` adjusted for the renames agreed in Step 6, `openspec` per whether init ran, and `stackPack` per the Step 6 answer — it is what puts the pack's drop-in files in scope for the sync. Where Step 6's offer included the starter site, write `components.appScaffold: true` **alongside** `stackPack`: the two are set together and only together, since the scaffold's build, deploy, and migration path *is* the pack, and `appScaffold` without `stackPack` is not a valid manifest state. A repo that already had an app gets `stackPack` alone and no `appScaffold` key at all. `/wong-sync` needs no special mode for a seed: every payload file is simply absent, so its ordinary copy-if-absent step installs all of them, and it writes the real `version` and `commit` when it finishes.
3. **Hand off:** read and follow `.claude/skills/wong-sync/SKILL.md` — a file path on purpose, so any agent can follow it. It copies the payload into the working tree; nothing is committed.
4. **Make the initial commit** — for a repo that had none, this is the moment: Step 5 deferred it because an empty folder has nothing to commit, and now there are files. Everything after this belongs to the user's first `/save`, which is what pushes. Setup itself commits once and pushes nothing.

## Step 8 — migrate legacy traces (ask first; never delete unprompted)

Pre-v5 traces Step 2 found (`WONG-FRAMEWORK` markers, a `.wong-framework.json`, retired skills such as `install-wong-framework`, `contribute-wong-stack`, or `preview`, a `daily/` folder, `claude-framework` plugin paths): offer to migrate or remove each — ask first, never delete unprompted.

## Step 9 — close (after /wong-sync reports)

Report the path taken (guided discovery, fast path, hard-mismatch exit, or the installed-repo hand-off), what environment work happened or remains (GitHub, OpenSpec), what the sync pulled, collisions and how each resolved, migrations — and that everything sits **uncommitted in the working tree** for the user to review.

Then **hand the user a real first step**, not just a menu: one concrete, copy-pasteable command tied to something they might actually build — ideally addressing the first pain they named in Step 3 — e.g. *"Try `/apply add-a-readme` (name it after whatever you want to build). It drafts the plan first when needed, builds it, and automatically hands completed work to `/save` for the PR; `/ship` merges it. Use `/plan add-a-readme` instead when you want to review the plan before anything is built, and run `/save` directly whenever you want a partial checkpoint."* Follow with the loop for reference, and note `/wong-sync` keeps everything current from here. **Setup itself does not commit or push** — the user's first completed `/apply` (or explicit `/save`) does that.

## Hard rules
- **A hard-mismatch exit ends the run.** No partial setup, no repo changes, no second pitch.
- **The consultation is never a toll gate.** "Just install it" skips straight to Step 5.
- **No GitHub setup before the verdict.** Rungs run only after a yes (or the fast path).
- **This skill copies no payload file except `wong-sync`.** The install is `/wong-sync`'s copy-if-absent step, driven by its payload manifest — there is no second list to drift.
- **The seed manifest follows `wong-sync`'s schema and the clone cache path is exact** — both values are owned by `wong-sync`; this runbook references them. Everything else is an outcome; reach it however your tooling allows.
- **Fresh integrations only.** A manifest with a real `commit` → ensure `wong-sync` is present, hand off, change nothing else.
- **Never copy this skill into a target repo** — source-only; offer the symlink instead. Don't commit or push; the user reviews everything.
