---
name: wong-setup
description: Set up WongStack in an empty folder — the workflow skills, the knowledge surfaces, a starter app, session memory, and Cloudflare hosting — from one Cloudflare token, through /explore and the normal workflow skills. Use to evaluate or install WongStack; installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Get the latest WongStack source, check that the target is an empty folder, get the Cloudflare token, then invoke `/explore` with the setup intent.

Follow [latest source](../wong-sync/references/latest-source.md). From a pasted URL, first obtain `https://github.com/matthewwong525/WongStack` in a separate local checkout, then read that reference there. Do not set up the source repo itself. A target with a real install record at `.claude/.wong-stack.json` goes straight to `/wong-sync`.

## Start from an empty folder

Setup installs only into an empty folder, or one whose only entry is a `.git` with no commits. For any other folder, stop before you write anything and say it plainly, as [a choice](../explore/references/asking-the-user.md): *"WongStack setup starts from an empty folder. Make a new folder and run setup there (Recommended), or stop here."* Do not install into an existing project. For a person's [home](../../../wiki/development/home.md), suggest `~/home`.

## Get the token first

Every later step needs a Cloudflare account and one user token. Before anything is written, ask whether the user has the token, and give the route from [the credentials page](../../../wiki/stack/cloudflare-credentials.md#create-the-token). No token yet → stop, write nothing, and say that running setup again once the token exists continues from here. Do not ask for the value yet: it goes into a file that needs Git first.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Use the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md). Resolve their references in the source checkout, while keeping the target as the working directory for investigation, planning, and edits. This skill stays source-only.

Then run Step 1 of the [provisioning runbook](references/cloudflare.md). It checks `gh auth status` and stops before any Cloudflare call when `gh` is signed out. It initializes Git, creates the private GitHub repository and `origin`, and writes the token value only to the ignored `.env`. Leave the commit and push until the install is complete. Prepare the OpenSpec CLI and run `openspec init --tools none` at the point of need; use the source config rules for the first plan.

Invoke `/explore` with this description, filled with the target, source version, path, commit, and the user's intent:

> Set up WongStack in this empty folder using <source path>, version <version>, commit <commit>. Ask how the user and their team will work, and whether this repo is their home — the repo for their own life, recorded once per machine. Install the full payload from the source inventory: the workflow skills, the knowledge surfaces, the stack pack, the app scaffold, and the UI pages, in a real `.agents/` folder with `.claude` and `.codex` links to it. Include the required wiki hubs, environment ignore rules, and the install record. If it is their home, write its absolute path to `~/.wong-stack/machine.json` as `{"home": "<path>"}`, and ask before you replace a different recorded home; the install itself stays the same, as <source path>/wiki/development/home.md says. After the payload lands, run the provisioning runbook at <source path>/.agents/skills/wong-setup/references/cloudflare.md, Steps 2–5. Carry this through the normal workflow to the stage the user requested.

Let `/explore` own questions and `/plan` own the plan; any question this skill asks itself uses [the shared ask format](../explore/references/asking-the-user.md). Ask no component question: an empty folder takes everything. Keep `/apply` responsible for the install and the provisioning runbook, and `/save` for Git identity, commits, and the checkpoint whose push starts the first deploy.

<a id="step-7--bootstrap-seed-hand-off"></a>

The [payload inventory and install record](../wong-sync/references/payload-manifest.md) supply the install details. Create the [agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) as a real `.agents/` with `ln -s .agents .claude` and `ln -s .agents .codex`. Include `wiki/README.md` and `wiki/development/README.md`, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions. No generated OpenSpec skill or visibility patch is installed.

Evaluation stays in exploration. A request to install continues through `/plan`, `/apply`, and `/save`; do not add another setup interview or approval sequence. The closing report is the runbook's [Step 5](references/cloudflare.md#step-5--the-closing-report), after `/save` reports the first deploy.
