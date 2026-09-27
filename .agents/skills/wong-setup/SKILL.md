---
name: wong-setup
description: Set up WongStack in an empty folder — workflow skills, knowledge surfaces, a starter app, session memory, and Cloudflare hosting — from one Cloudflare token, through /explore and the normal workflow skills. Use to evaluate or install WongStack; installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Check that the target is an empty folder, get the computer ready, get the latest WongStack source, get the Cloudflare token, then invoke `/explore` with the setup intent. A target with a real install record at `.claude/.wong-stack.json` goes straight to `/wong-sync`.

## Start from an empty folder

Install only into an empty folder, or one holding only a `.git` with no commits — never an existing project. Otherwise stop before writing anything and offer [a choice](../explore/references/asking-the-user.md): *"WongStack setup starts from an empty folder. Make a new folder and run setup there (Recommended), or stop here."* For a person's [home](../../../wiki/development/home.md), suggest `~/home`.

## Get the computer ready

Before anything is cloned or written, follow [get the computer ready](references/tools.md). Before the clone, read it and the pages it links from the same web address as this file, such as `https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/references/tools.md`. It readies the four tools, one GitHub sign-in with every scope setup needs, the git name and email, and on Windows, folder links. It asks before each install, and the person types no command. A declined or failed step stops setup with nothing written.

## Get the latest source

Follow [latest source](../wong-sync/references/latest-source.md). From a pasted URL, first obtain `https://github.com/matthewwong525/WongStack` in a separate local checkout, then read that reference there. Do not set up the source repo itself.

## Get the Cloudflare token

Before writing anything, ask whether the user has the Cloudflare user token, saying what it is for, with the route from [the credentials page](../../../wiki/stack/cloudflare-credentials.md#create-the-token). No token → stop, write nothing, and say that running setup again once it exists continues from here. Don't ask for the value yet: its file needs Git first.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Use the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md), resolving their references there while working in the target. This skill stays source-only.

Then run Step 1 of the [provisioning runbook](references/cloudflare.md): it confirms the GitHub sign-in from the step above before any Cloudflare call. Leave commit and push until the install is complete. Run `openspec init --tools none` at the point of need; the first plan uses the source config rules.

Invoke `/explore` with this description, filled in, plus the user's intent:

> Set up WongStack in this empty folder using <source path>, version <version>, commit <commit>. Ask how the user and their team will work, and whether this repo is their home — the repo for their own life, recorded once per machine. Install the full payload from the source inventory: the workflow skills, the knowledge surfaces, the stack pack, the app scaffold, and the UI pages, in a real `.agents/` folder with `.claude` and `.codex` links to it, and the rules in a real `AGENTS.md` with a `CLAUDE.md` link to it. Include the required wiki hubs, environment ignore rules, and the install record. If it is their home, write its absolute path to `~/.wong-stack/machine.json` as `{"home": "<path>"}`, and ask before you replace a different recorded home; the install itself stays the same, as <source path>/wiki/development/home.md says. After the payload lands, if the `paseo` command is installed, run `node .claude/skills/routine/scripts/presets.mjs add` in this folder to add WongStack's agent presets to this computer's Paseo; a failure there never stops setup. Then run the provisioning runbook at <source path>/.agents/skills/wong-setup/references/cloudflare.md, Steps 2–5. Carry this through the normal workflow to the stage the user requested.

`/explore` owns questions, `/plan` the plan, `/apply` the install and runbook, and `/save` commits and the push that starts the first deploy. Ask no component question: an empty folder takes everything. Any question this skill asks uses [the ask format](../explore/references/asking-the-user.md).

<a id="step-7--bootstrap-seed-hand-off"></a>

[The payload inventory and install record](../wong-sync/references/payload-manifest.md) own the install details. Make the [agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) a real `.agents/` with `ln -s .agents .claude` and `ln -s .agents .codex`. Write the rules to a real `AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`, so Codex and Claude read one file. On Windows, prefix each link with `MSYS=winsymlinks:nativestrict`, so a refused link fails instead of becoming a copy. Include `wiki/README.md`, `wiki/development/README.md`, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions, plus `.scratch/`. Install no generated OpenSpec skill or visibility patch.

Evaluation stays in exploration. A request to install continues through `/plan`, `/apply`, and `/save`; add no setup interview or approval sequence. Close with the runbook's [Step 5](references/cloudflare.md#step-5--the-closing-report) after `/save` reports the first deploy, and say which Paseo presets [`presets.mjs`](../routine/scripts/presets.mjs) added, kept, or skipped, or that Paseo is not set up.
