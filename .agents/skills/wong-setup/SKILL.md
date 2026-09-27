---
name: wong-setup
description: Set up WongStack in an empty folder — workflow skills, knowledge surfaces, a starter app, session memory, and Cloudflare hosting — from one Cloudflare token, through /explore and the normal workflow skills. Use to evaluate or install WongStack; installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Follow [latest source](../wong-sync/references/latest-source.md) (from a pasted URL, check out `https://github.com/matthewwong525/WongStack` first), then work down this page. Never set up the source repo itself; a target with a real install record at `.claude/.wong-stack.json` goes to `/wong-sync`.

## Start from an empty folder

Install only into an empty folder, or one holding only a `.git` with no commits — never an existing project. Otherwise stop before writing anything and offer [a choice](../explore/references/asking-the-user.md): *"WongStack setup starts from an empty folder. Make a new folder and run setup there (Recommended), or stop here."* For a person's [home](../../../wiki/development/home.md), suggest `~/home`.

## Get the token first

Before writing anything, ask whether the user has the Cloudflare user token, saying what it is for, with the route from [the credentials page](../../../wiki/stack/cloudflare-credentials.md#create-the-token). No token → stop, write nothing, and say that running setup again once it exists continues from here. Don't ask for the value yet: its file needs Git first.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Use the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md), resolving their references there while working in the target. This skill stays source-only.

Then run Step 1 of the [provisioning runbook](references/cloudflare.md); leave commit and push until the install is complete. Prepare the OpenSpec CLI and run `openspec init --tools none` at the point of need; the first plan uses the source config rules.

Invoke `/explore` with this description, filled in, plus the user's intent:

> Set up WongStack in this empty folder using <source path>, version <version>, commit <commit>. Ask how the user and their team will work, and whether this repo is their home — the repo for their own life, recorded once per machine. Install the full payload from the source inventory: the workflow skills, the knowledge surfaces, the stack pack, the app scaffold, and the UI pages, in a real `.agents/` folder with `.claude` and `.codex` links to it. Include the required wiki hubs, environment ignore rules, and the install record. If it is their home, write its absolute path to `~/.wong-stack/machine.json` as `{"home": "<path>"}`, and ask before you replace a different recorded home; the install itself stays the same, as <source path>/wiki/development/home.md says. After the payload lands, run the provisioning runbook at <source path>/.agents/skills/wong-setup/references/cloudflare.md, Steps 2–5. Carry this through the normal workflow to the stage the user requested.

`/explore` owns questions, `/plan` the plan, `/apply` the install and runbook, and `/save` Git identity, commits, and the push that starts the first deploy. Ask no component question: an empty folder takes everything. Any question this skill asks uses [the ask format](../explore/references/asking-the-user.md).

<a id="step-7--bootstrap-seed-hand-off"></a>

[The payload inventory and install record](../wong-sync/references/payload-manifest.md) own the install details. Make the [agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) a real `.agents/` with `ln -s .agents .claude` and `ln -s .agents .codex`. Include `wiki/README.md`, `wiki/development/README.md`, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions. Install no generated OpenSpec skill or visibility patch.

Evaluation stays in exploration; add no setup interview or approval sequence. Close with the runbook's [Step 5](references/cloudflare.md#step-5--the-closing-report) after `/save` reports the first deploy.
