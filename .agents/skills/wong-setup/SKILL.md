---
name: wong-setup
description: Evaluate or install WongStack in an empty folder, Cloudflare hosting included, from one token. Installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Check the target is an empty folder, get the computer ready, get the latest WongStack source and the Cloudflare token, then invoke `/explore` with the setup intent. A target with a real install record at `.claude/.wong-stack.json` goes straight to `/wong-sync`.

## Start from an empty folder

Install only into an empty folder, or one holding only a `.git` with no commits, never an existing project. Otherwise stop before writing anything and offer [a choice](../explore/references/asking-the-user.md): *"WongStack setup starts from an empty folder. Make a new folder and run setup there (Recommended), or stop here."*

## Get the computer ready

Before anything is cloned or written, follow [get the computer ready](references/tools.md). With no clone yet, read it and the pages it links from this file's web address, such as `https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/references/tools.md`. A declined or failed step stops setup with nothing written.

## Get the latest source

Follow [latest source](../wong-sync/references/latest-source.md). From a pasted URL, first get `https://github.com/matthewwong525/WongStack` into a separate local checkout, then read that reference there. Never set up the source repo itself.

## Get the Cloudflare token

Before writing anything, ask whether the user has the Cloudflare user token, saying what it is for, with the filled-in token link from [the credentials page](../../../wiki/stack/cloudflare-credentials.md#create-the-token) first and its click path as the fallback. Take the link from that page; never copy it here. No token → stop, write nothing, and say that running setup again once it exists continues from here. Don't ask for the value yet: its file needs Git first.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Use the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md), and resolve their references there while you work in the target. This skill stays source-only.

Then run Step 1 of the [provisioning runbook](references/cloudflare.md); it confirms the GitHub sign-in before any Cloudflare call. Commit and push only once the install is complete. Run `openspec init --tools none` at the point of need; the first plan uses the source config rules.

Invoke `/explore` with this description, filled in, plus the user's intent:

> Set up WongStack in this empty folder from <source path>, version <version>, commit <commit>. Use a reachable owner login email separately from the git author email. Private pages and previews are automatic; ask no enable-or-public question. Install the full payload from the source inventory — the workflow skills, knowledge surfaces, stack pack, app scaffold, and UI pages — in a real `.agents/` folder linked from `.claude` and `.codex`, with the rules in a real `AGENTS.md` linked from `CLAUDE.md`, plus the required wiki hubs, environment ignore rules, and the install record. After the payload lands, if the `paseo` command is installed, run `node .claude/skills/routine/scripts/presets.mjs add` in this folder to add WongStack's agent presets to this computer's Paseo; a failure there never stops setup. Then run Steps 2–5 of the provisioning runbook at <source path>/.agents/skills/wong-setup/references/cloudflare.md. Carry this through the normal workflow to the stage the user requested.

`/explore` owns questions, `/plan` the plan, `/apply` the install and runbook, and `/save` the commits and the push that starts the first deploy. Ask no component question: an empty folder takes everything. Ask in [the ask format](../explore/references/asking-the-user.md).

<a id="step-7--bootstrap-seed-hand-off"></a>

[The payload inventory and install record](../wong-sync/references/payload-manifest.md) own the install details. Make [the agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) with `ln -s .agents .claude`, `ln -s .agents .codex`, and, after writing the rules to a real `AGENTS.md`, `ln -s AGENTS.md CLAUDE.md`. On Windows, prefix each with `MSYS=winsymlinks:nativestrict`, so a refused link fails instead of becoming a copy. Include `wiki/README.md`, `wiki/development/README.md`, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions, plus `.scratch/`.

Evaluation stays in exploration. A request to install continues through `/plan`, `/apply`, and `/save`, with no setup interview or approval sequence. After `/save` reports the first deploy, close with the runbook's [Step 5](references/cloudflare.md#step-5--the-closing-report), and say which Paseo presets [`presets.mjs`](../routine/scripts/presets.mjs) added, kept, or skipped, or that Paseo is not set up.
