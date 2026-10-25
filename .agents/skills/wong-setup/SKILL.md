---
name: wong-setup
description: Evaluate or install WongStack from any folder, Cloudflare hosting included, from one token. Installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

## Pick the folder

Select before writing; preserve existing projects:

1. The open folder has `.claude/.wong-stack.json` → `/wong-sync`.
2. It is empty, or holds only a `.git` with no commits → install here.
3. Otherwise try `~/wongstack`, then numbered siblings. Use a missing/empty folder; an install record routes to sync; preserve other contents.

Name the target; use its absolute path. Create it after tools/token.

## Get the computer ready

Select the requested GitHub repo, else `https://github.com/matthewwong525/WongStack`. Normalize its HTTPS owner/repo URL. Read its default branch through GitHub's API, authenticated if needed. Use `https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/<default branch>`; never assume main.

**Route:** on Mac or Linux, unless GitHub is asked for, follow [the Artifacts route](../../../wiki/stack/artifacts-route.md#setup).

Before cloning/writing, read the selected source's setup/[tools](references/tools.md) under that raw root. Follow its links, `.nvmrc` and prerequisites. Missing source/requirements stop; never substitute another stack.

## Get the latest source

Use a separate clean [source checkout](../wong-sync/references/latest-source.md), reading that reference there. Install its version/commit into the target. When installing, start [learning from past chats](../../../wiki/stack/learning-from-chats.md) now.

## Get the Cloudflare token

Before writing, ask whether they have the Cloudflare user token, explaining its purpose and selected source's [link/fallback](../../../wiki/stack/cloudflare-credentials.md#create-the-token). Without it, wait. Request no value until Git protects its file.

## Install through the normal workflow

<a id="step-2--deep-research-the-target-repo"></a>

Work in the target using source-checkout skills/references, starting with [`explore`](../explore/SKILL.md). Setup stays source-only.

Run Step 1 of the source's [provisioning runbook](references/cloudflare.md). Commit and push only after installation.

Invoke `/explore` with this description, filled in, plus the user's intent:

> Set up WongStack in <target> from <selected repository> at <source path>, version <version>, commit <commit>. Use a reachable owner login email separately from git authorship. Private pages and previews are automatic when the account allows them; ask no enable-or-public question. An account needing a card finishes open and recommends the card as optional. Put the files in place as one task: node <source path>/.claude/skills/wong-setup/scripts/install.mjs --source <source path> --target <target> --repo <selected repository>; write no copy step of your own. If `paseo` is installed, run `node .claude/skills/schedule/scripts/presets.mjs add` in <target>; if they took the helper, `node .claude/skills/hand-over/scripts/helper.mjs install`; neither failure stops setup. Run Steps 2–5 of <source path>/.agents/skills/wong-setup/references/cloudflare.md. Continue through the requested stage.

Explore/plan/apply/save own questions/planning/installation/first deploy. Install all components without a component question; use [shared asks](../explore/references/asking-the-user.md).

<a id="step-7--bootstrap-seed-hand-off"></a>

[`install.mjs`](scripts/install.mjs) copies every [payload](../wong-sync/references/payload-manifest.md) category, makes [the agent folder](../wong-sync/references/payload-manifest.md#the-agent-folder) and its links, the wiki hubs, the ignore rules, the install record and `openspec/`, and prints one JSON report. A stop exits 1 with its `cause` and leaves the folder as it found it; fix it by [the failure map](references/failure-map.md), then run it again.

Evaluation stops in exploration. Installation continues through plan/apply/save without another interview or approval sequence. After first deploy, give [Step 5's report](references/cloudflare.md#step-5--the-closing-report), naming [preset](../schedule/scripts/presets.mjs) additions/keeps/skips or unavailable Paseo.
