---
name: wong-setup
description: Evaluate or install WongStack from any folder, Cloudflare hosting included, from one token. Installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Pick the target, source, tools, and token, then invoke `/explore`. An installed target uses `/wong-sync` and its recorded source; an install request never switches it.

## Pick the folder

Pick the target before anything else, never writing into an existing project:

1. The open folder has `.claude/.wong-stack.json` → `/wong-sync`.
2. It is empty, or holds only a `.git` with no commits → install here.
3. Otherwise the target is `~/wongstack`: missing or empty → use it; holding an install record → `/wong-sync` there; holding anything else → try `~/wongstack-2`, `~/wongstack-3`, and so on.

Name the target plainly. Create it only after tools and token; use its absolute path throughout.

## Get the computer ready

For a fresh target, select the GitHub repository requested by the person, else `https://github.com/matthewwong525/WongStack`. Normalize it to `https://github.com/<owner>/<repo>`. Resolve its default branch through GitHub's repository API (authenticated when needed); never assume `main`. Its raw root is `https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/<default branch>`.

**Route:** on Mac or Linux, unless GitHub is asked for, follow [the Artifacts route](../../../wiki/stack/artifacts-route.md#setup).

Before cloning or writing, read that source's `/wong-setup` and [tools reference](references/tools.md) and follow their links under the same raw root. Use its `.nvmrc` and setup prerequisites. An unavailable source or missing requirement stops setup; never substitute the original stack.

## Get the latest source

Retrieve the selected repository into a separate clean checkout per [latest source](../wong-sync/references/latest-source.md), read that reference there, and use its version and commit. Never install into the source checkout.

## Get the Cloudflare token

Before writing, ask whether the user has the Cloudflare user token, saying what it is for, with the selected source's [token link and fallback](../../../wiki/stack/cloudflare-credentials.md#create-the-token). No token → stop and say setup continues once it exists. Don't ask for its value yet: its file needs Git first.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Use the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md), and resolve their references there while you work in the target. This skill stays source-only.

Run Step 1 of the source's [provisioning runbook](references/cloudflare.md). Run `openspec init --tools none` when needed, using the source config rules. Commit and push only after installation.

Invoke `/explore` with this description, filled in, plus the user's intent:

> Set up WongStack in <target> from <selected repository> at <source path>, version <version>, commit <commit>. Use a reachable owner login email separately from git authorship. Private pages and previews are automatic when the account allows them; ask no enable-or-public question. An account needing a card finishes open and recommends the card as optional. Install every category from the source inventory, following its folder, rules, hub, ignore, and fresh install-record guidance. If `paseo` is installed, run `node .claude/skills/routine/scripts/presets.mjs add` in <target>; failure never stops setup. Run Steps 2–5 of <source path>/.agents/skills/wong-setup/references/cloudflare.md. Continue through the requested stage.

`/explore` owns questions, `/plan` the plan, `/apply` installation, and `/save` the first deploy. Ask no component question: the target takes everything. Use [the ask format](../explore/references/asking-the-user.md).

<a id="step-7--bootstrap-seed-hand-off"></a>

[The payload inventory and install record](../wong-sync/references/payload-manifest.md) own the install details. Make [the agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) with `ln -s .agents .claude`, `ln -s .agents .codex`, and, after writing the rules to a real `AGENTS.md`, `ln -s AGENTS.md CLAUDE.md`. On Windows, prefix each with `MSYS=winsymlinks:nativestrict`, so a refused link fails instead of becoming a copy. Before continuing, check all three with `test -L` and verify the skills and rules are readable through them; any failure stops setup. Include `wiki/README.md`, `wiki/development/README.md`, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions, plus `.scratch/`.

Evaluation stays in exploration. A request to install continues through `/plan`, `/apply`, and `/save`, with no setup interview or approval sequence. After `/save` reports the first deploy, close with the runbook's [Step 5](references/cloudflare.md#step-5--the-closing-report), and say which Paseo presets [`presets.mjs`](../routine/scripts/presets.mjs) added, kept, or skipped, or that Paseo is not set up.
