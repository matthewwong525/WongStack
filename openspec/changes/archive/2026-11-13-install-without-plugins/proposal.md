# Every chat runs WongStack's hooks, with no plugins

**Status:** ready-to-ship
**Branch:** silly-bird
**Open questions:** none

## Why

Memory, Daily, and Access each load as a plugin today, and their start-of-chat, check-in, and stop checks run only through that plugin. A plugin loads only in a folder you trusted, so in each new Paseo workspace those checks stay silent, and nothing tells you. RelayEverything works around this by hand.

## What Changes

- **Every chat runs each module's checks, trusted folder or not.** Memory's digest, Daily's check-ins and stop check, and Access's start check run from the project's own settings, the same place `/plan`'s hooks run from today. No module loads as a plugin, in your project or in WongStack's own.
  ```mermaid
  flowchart TB
    A[Before: a chat] --> B{Trusted?}
    B -- yes --> C[Plugin runs checks]
    B -- no --> D[Silent]
    E[After: a chat] --> F[Settings run checks]
  ```
- **Commands work like any other command.** `/schedule`, and the browser's private-link and shop commands, are plain commands in every chat, everywhere: in WongStack's own repo too, not only in an install.
- **One feature alone still works.** Each module stays its own folder. A project that wants only memory, or only Daily, still pastes one message; the guide copies the folder in, adds its checks to the project's settings, and links its commands.
- **Your update moves you off plugins.** `/wong-sync` removes the plugin files, adds the checks to your settings, turns off any plugin your settings still name, and removes a check you added by hand that would now run twice. On this computer it also takes WongStack's plugins out of Codex; on another computer, the next Codex chat names the one command to run.
- **BREAKING:** a project that turned a module's plugin on or off by name, such as `daily@skills-dir`, finds that name gone. `/daily:schedule` is `/schedule` everywhere.

**Non-goals:** changing what any hook does; a host's own trust prompt for project settings, such as Codex's first-run question; moving a command's scripts out of its module.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-layout`: adds that no module loads as a plugin in the source or an install: project settings run each module's hooks, and each module command is a top-level skill.
- `memory-plugin`: replaces "Memory installs as one plugin with its own hooks" with a folder whose hooks the project's settings run, and no per-computer Codex install.
- `daily-module`: replaces "Daily installs as one module with its own hooks" the same way; names the command `/schedule` alone or in WongStack.
- `access-module`: "Access installs as one module" says the project's settings run its start check.

## Impact

- Each module (`.agents/plugins/{access,browser,daily,loop,memory}/`): `.claude-plugin/` and `.codex-plugin/` go; a `VERSION` file holds the version; `hooks/claude.json` and `hooks/codex.json` name project paths, not `${CLAUDE_PLUGIN_ROOT}` or `$PLUGIN_ROOT`; `references/setup.md` merges the hooks, links each `skills/<command>/`, and its `## Update` moves an older copy off plugins.
- `.claude-plugin/marketplace.json` goes. `.agents/settings.json` and `.agents/hooks.json` run each module's hooks. Source links `.agents/skills/{schedule,hand-over,shop,services}` → their module folders.
- `.agents/skills/wong-sync/scripts/codex-plugin.mjs`: removes the old `<module>@wongstack` Codex plugins; `--check` names that command. `memory/scripts/session-start.mjs` and `lib/store.mjs` drop the Codex-copy check.
- `.agents/skills/wong-sync/references/payload-files.json`, `payload-manifest.md`, `catch-up.md`, `install-path.mjs` (keeps the `/<module>:<command>` rename for older releases' text), `wong-setup/SKILL.md`, `wong-sync/SKILL.md`.
- Checks: `scripts/check-module-versions.mjs` reads `VERSION`; a new test that settings run each module's hooks once; `module-install.test.mjs`, `codex-plugin.test.mjs`, `module-versions.test.mjs`, `scripts/retired-names.json`.
- Docs: `wiki/maintaining/adding-a-module.md`, `wiki/development/memory.md`, `wiki/development/daily.md`, `.agents/rules/payload.md`, each module's README, `CHANGELOG.md` (`## Next (major)`).

## Decision log

- **2026-11-12** — Asked (in the request, settled with Matthew) how an install loads modules → chose no plugins at all in an install, with modules kept as separate folders in the source.
- **2026-11-12** — Asked (Matthew, mid-plan) whether the source keeps plugins → chose to remove the plugin layer entirely, source included, and link each command out as a normal skill; the separate folders stay so one feature installs alone.
- **2026-11-12** — Assumed: each module keeps its hook list in `hooks/claude.json` and `hooks/codex.json`, written with project paths, and WongStack's settings files carry the same entries, checked by a test, not built by a generator, because the source settings file already ships as is and a module copied alone needs the list in its folder.
- **2026-11-12** — Assumed: a module's version moves to a `VERSION` file in its folder, because the loop has no root `SKILL.md` for a frontmatter field, and the repo already keeps its own version that way.
- **2026-11-12** — Assumed: a module copied alone links each `skills/<command>/` up to `.claude/skills/<command>`, as the source does, with a copy as the fallback where links fail, because the person asked for symlinks and one folder keeps the update a single merge.
- **2026-11-12** — Assumed: WongStack installs keep the command layout from unpack-module-commands (only `SKILL.md` moves up), because it ships first and installs make no folder links but `.claude` and `.codex`.
- **2026-11-12** — Assumed: `codex-plugin.mjs` keeps its name and turns into the remover, because an older install's Codex start hook names that path until its update lands.
- **2026-11-12** — Assumed: a `major` release, because a plugin name in a project's settings and the typed `/daily:schedule` stop working.
- **2026-11-12** — Assumed: codex-plugin.mjs removes only plugins from the `wongstack` list or a list whose source is this repo, because a removal can't be undone and another vendor may use a module's name.
- **2026-11-12** — Assumed: installText keeps the `/<module>:<command>` rename, because the preflight reads an older install's base text through it.
- **2026-11-12** — Assumed: a lone guide replaces a real command folder only when it is the module's own copy, because a project may have its own skill of that name.
- **2026-11-13** — Assumed: the lone guides' Codex link step skips a real `.agents/skills/<name>` folder, because `ln -sfn` would put a broken link inside a project's own skill.
- **2026-11-13** — Archive checkpoint: built, second look done (two rounds, every finding fixed), checks 5.2–5.5 seen passing on scratch installs; archived and numbered 61.0.0.
