---
name: wong-setup
description: Set up WongStack in a new or existing repo through /explore and the normal workflow skills. Use to evaluate or install WongStack; installed repos use /wong-sync.
user-invocable: true
---

# /wong-setup

Get the latest WongStack source, then invoke `/explore` with the setup intent.

Follow [latest source](../wong-sync/references/latest-source.md). From a pasted URL, first obtain `https://github.com/matthewwong525/WongStack` in a separate local checkout, then read that reference there. Do not set up the source repo itself. A target with a real install record at `.claude/.wong-stack.json` (or legacy `.claude/.wong-framework.json`) goes straight to `/wong-sync`.

<a id="step-2--deep-research-the-target-repo"></a>

Use the target's workflow skills where present. Otherwise read and follow the source checkout's `.claude/skills/<verb>/SKILL.md`, starting with [`explore`](../explore/SKILL.md). Resolve their references in the source checkout, while keeping the target as the working directory for investigation, planning, and edits. This skill stays source-only.

Invoke `/explore` with this description, filled with the target, source version, path, commit, and the user's intent:

> Set up WongStack in this repo using <source path>, version <version>, commit <commit>. Understand the project and how its team works. Use WongStack's workflow skills and knowledge surfaces where they fit, preserving existing instructions, docs, skills, and application code. Use the source payload inventory for the install. Include the repo context, required wiki hubs, environment ignore rules, and completed install record. Carry this through the normal workflow to the stage the user requested.

Let `/explore` own questions and `/plan` own the plan; any question this skill asks itself uses [the shared ask format](../explore/references/asking-the-user.md). Before planning in a fresh target, prepare the OpenSpec CLI and run `openspec init --tools none` at the point of need. It creates the planning home without a generated agent layer. Use the source config rules for that first plan. Keep `/apply` responsible for installation and `/save` for Git setup, identity, commits, remote setup, and the checkpoint. For an empty folder, delegate Git initialization to `/save` before planning, then return here; leave its commit and push until the install is complete. Pass missing prerequisites before its preflight.

<a id="step-7--bootstrap-seed-hand-off"></a>

The [payload inventory and install record](../wong-sync/references/payload-manifest.md) supply the install details. Include `wiki/README.md` and `wiki/development/README.md` when absent, and `.gitignore` rules for `.env*` and `.dev.vars*` with their `.example` exceptions. Preserve existing content. No generated OpenSpec skill or visibility patch is installed.

Evaluation stays in exploration. A request to install continues through `/plan`, `/apply`, and `/save`; do not add another setup interview or approval sequence. Plan the [memory store](../wong-cloudflare/SKILL.md#the-memory-store-every-repo) through `wong-cloudflare`, which is core. Without a Cloudflare token, the install still completes, and the report says that session memory is off and that `/wong-cloudflare` turns it on. Cloudflare hosting and other optional components stay opt-in.
