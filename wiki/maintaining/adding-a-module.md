# Adding a module

A module is a part of WongStack that any repo can add alone, with one pasted message, such as [memory](../../.agents/plugins/memory/README.md). This page owns the rules a module follows; memory is the example for each. A module is still a payload part, so a change to it is [a release](../../.agents/rules/payload.md), and a skill inside it follows [adding a skill](adding-a-skill.md).

## Where it lives

- **One folder per module, in the source:** `.agents/plugins/<name>/`, beside the others. Nothing else goes in `.agents/plugins/`.
- **In the source, the skill folder is a link to it:** `.agents/skills/<name> → ../plugins/<name>`, so Claude Code loads it from the checkout and a branch runs its own code. A Markdown link names the real `.agents/plugins/<name>/…` path, by [repo layout](repo-layout.md#linking).
- **In every install, it is a real folder** at `.agents/skills/<name>/`. The [payload inventory](../../.agents/skills/wong-sync/references/payload-files.json)'s `mapped` entry sends the source folder there, and the sync writes each shipped link into the folder at that path. The installed modules are the module folders in the skills folder: keep no list of them, and no list of what each needs.
- **The repo's own parts stay outside the folder:** its profile, its server part, and its settings. Memory's are in [`.agents/memory/`](../../.agents/memory/profile.mjs). An update can then replace the folder and lose nothing.

## What the folder holds

- **Its hooks**, in `hooks/`, named by its `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`; never in the repo's shared settings files, so a copy of the folder brings them. Codex reads the module from the root `.claude-plugin/marketplace.json`, one entry per module at `./.agents/skills/<name>`.
- **A README that leads with the paste-in install message**, then the update message: one line a person pastes into any AI tool, naming the module's setup guide by its GitHub address. See [memory's README](../../.agents/plugins/memory/README.md).
- **A setup guide that works from GitHub** in a repo with nothing installed. It stops in a full WongStack install, copies the folder in, looks at the repo and fills each gap, asks before each step that costs money or makes something public, ends with the module's check, commits, and asks before any push. Its `## Update` section three-way merges the folder from its recorded version. See [memory's setup guide](../../.agents/plugins/memory/references/setup.md).
- **A start-of-chat check that asks first, once per chat.** When the repo lacks a part, the module's start hook has the AI ask whether to set it up, and never starts setup on its own. A resumed chat stays quiet.

## What it may reach

- **Only its own folder.** A module imports no file outside it, so it runs in a repo that has nothing else. It reaches the repo only through a named slot that the repo fills, such as memory's [profile](../development/memory.md#the-profile), and works when an optional slot is empty.
- **No other module.** A module works without the others; one that adds to another does so through that one's slot.

## Versions and checks

- **Each change to the folder raises the version** in both `plugin.json` files, and the two stay equal. The update finds its merge base by that version, so one version must mean one exact folder. [`check-module-versions.mjs`](../../scripts/check-module-versions.mjs), one of [the payload checks](../../scripts/payload-checks.mjs), fails when a folder differs from `main` and its version did not rise.
- **One test installs each module alone.** [`module-install.test.mjs`](../../scripts/tests/module-install.test.mjs) copies each folder into an empty repo, writes a minimal profile, runs a chat start and the module's check, and fails on an import from outside the folder.

Part of [maintaining WongStack](README.md).
