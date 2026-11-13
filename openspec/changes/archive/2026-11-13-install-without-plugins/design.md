# Design

## Context

Five modules live in `.agents/plugins/<name>/`: access, browser, daily, loop, memory. Each has `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`, which hold its version and, for memory, daily, and access, a `hooks` entry naming `hooks/claude.json` or `hooks/codex.json`. Those hook files use `${CLAUDE_PLUGIN_ROOT}` and `$PLUGIN_ROOT`.

- **Claude Code** loads a folder in `.claude/skills/` that holds `.claude-plugin/plugin.json` as the plugin `<name>@skills-dir`, only in a trusted folder. Its hooks and nested `skills/<command>/` load only then.
- **Codex** loads a module's hooks only after `codex-plugin.mjs` ran `codex plugin marketplace add <repo>` and `codex plugin add <name>@wongstack` from the root `.claude-plugin/marketplace.json`, once per computer. Memory's `session-start.mjs` names that command when the Codex copy is older (`pluginLines`).
- **The project's own hooks** already run from `.agents/settings.json` (Claude Code, `$CLAUDE_PROJECT_DIR/.claude/...`) and `.agents/hooks.json` (Codex, `$(git rev-parse --show-toplevel)/.claude/...`). Both files ship as is. RelayEverything shows that a hook in project settings runs where the plugin does not.
- **unpack-module-commands** ships first: in an install, each nested command's `SKILL.md` maps to `.claude/skills/<command>/SKILL.md`, and `installText` renames `/<module>:<command>` to `/<command>`. The source keeps `/daily:schedule`.
- **The version** in `plugin.json` is what `check-module-versions.mjs` checks and what each module's `## Update` reads to find its merge base.

## Goals / Non-Goals

**Goals:** no plugin manifest anywhere; every module hook runs from project settings, once, in every chat; each nested command is a plain top-level skill in the source, an install, and a module copied alone; an older install or lone copy moves off plugins by its normal update.

**Non-Goals:** changing a hook's behavior; moving a command's scripts out of its module; the host's own trust prompt for project settings (Codex asks once per project).

## Decisions

1. **Plugin files go.** Delete `.agents/plugins/*/.claude-plugin/`, `.agents/plugins/*/.codex-plugin/`, and the root `.claude-plugin/marketplace.json` (remove it from the payload inventory's `core.files`). Retire each path in `scripts/retired-names.json`, and `@skills-dir`.
   *Alternative:* keep the manifests in the source and exclude them from installs. Rejected by Matthew: the source then still loads plugins, and two load paths stay to maintain.
2. **A module's version is a `VERSION` file** in its folder, one line, like the repo's own. Every module takes a major raise, because its folder changes: memory 5.0.0, daily 4.0.0, access 2.0.0, browser 3.0.0, loop 3.0.0 (from whatever `main` holds then). `check-module-versions.mjs` reads `VERSION`, and reads the base's `.claude-plugin/plugin.json` when the base has no `VERSION`.
3. **Hook files keep the module's hook list, in project paths.** In `hooks/claude.json`, `${CLAUDE_PLUGIN_ROOT}` becomes `$CLAUDE_PROJECT_DIR/.claude/skills/<module>`; in `hooks/codex.json`, `$PLUGIN_ROOT` becomes `$(git rev-parse --show-toplevel)/.claude/skills/<module>`. Each module's folder lands at `.claude/skills/<module>/` in the source (by link), an install, and a lone copy, so one path is right everywhere. The files keep the `{ "hooks": { <event>: [groups] } }` shape of a settings file, so a merge is a plain append.
4. **WongStack's settings carry the same entries.** `.agents/settings.json` and `.agents/hooks.json` append each module's groups under the same event, after the stack's own. A new test, `scripts/tests/module-hooks.test.mjs`, fails when a module hook group is missing from the settings file, appears twice, or differs, and when a settings command runs a `.claude/skills/<module>/scripts/` file that no module lists.
   *Alternative:* build the installed settings at install time. Rejected: the source must run the same hooks, the preflight and merge check would need the generator too, and a test is less code.
5. **Commands link out in the source.** Add folder links `.agents/skills/{schedule,hand-over,shop,services}` → `../plugins/<module>/skills/<command>`, as the loop's commands already are. Installs keep unpack-module-commands' `SKILL.md` file entries. Every source text says `/schedule`; retire `/daily:schedule` (and its browser and access forms) and lift `/schedule` from the retired list. `installText` keeps its `/<module>:<command>` rename: the preflight reads an older install's base text through it.
6. **`codex-plugin.mjs` removes the old plugins.** It keeps its name, because an older install's `.codex/hooks.json` calls `codex-plugin.mjs --check` until its update lands. New job: find each `[plugins."<module>@<list>"]` in the computer's Codex config whose `<module>` is a folder in `.claude/skills/` with `hooks/codex.json` or `VERSION`; run `codex plugin remove` for each, then `codex plugin marketplace remove <list>` when the list's root is this repo. It prints one line and never fails. `--check` prints the one command when any is found, else nothing. Memory drops `pluginLines`, `versionOf`, and `codexPluginName`.
7. **Setup and sync.** `wong-setup/SKILL.md` drops its `codex-plugin.mjs` step (a new install has nothing to remove). `wong-sync/SKILL.md` keeps it as the last task, now described as removing old plugins. A new `catch-up.md` entry, `module-plugin`, for an install below this release: in `.claude/settings.json` and `.claude/settings.local.json`, delete each `enabledPlugins` key `<module>@skills-dir` for a WongStack module; delete a hook the project added that runs the same `.claude/skills/<module>/scripts/<file>` command as a shipped one, keeping every other local hook. The preflight already reports the deleted manifests as `removed`, and the merged settings bring the new hooks.
8. **A lone copy.** Each module's `references/setup.md`: after the copy, a step merges `hooks/claude.json` into `.claude/settings.json` and `hooks/codex.json` into `.codex/hooks.json`, made if missing, adding only groups not already there; a step links each `skills/<command>/` to `.claude/skills/<command>`, copying the folder where a link fails. The Codex marketplace steps go. `## Update` reads the base version from `VERSION`, else from `.claude-plugin/plugin.json`; for a base with a plugin manifest it also deletes both manifest folders, removes the module from the root `marketplace.json` (the file too once empty), runs `codex plugin remove <module>@<list>` when Codex is there, merges the hooks, links the commands, and changes `/daily:schedule` to `/schedule` in `AGENTS.md`. Daily's step 5 wording that renames the other way goes.
9. **Release level `major`.**

## Risks / Trade-offs

- **Codex may load a nested `skills/<command>/SKILL.md` it finds under `.agents/skills/<module>/`,** so in the source `/schedule` could show twice there (link and nested). Task 5.3 opens Codex in the source and in a scratch install and counts. If it doubles in the source, the fallback is to exclude the link for Codex, decided then; an install has no nested `SKILL.md`.
- **A hand-added hook that runs a module script by another path** (not `.claude/skills/<module>/scripts/…`) escapes the catch-up's match and would run twice. The catch-up names any hook that mentions a module script it did not remove, for the person to decide.
- **Codex trust.** Project hooks in `.codex/hooks.json` still need the project trusted in Codex, as the stack's own Codex hooks do today; this change adds no new prompt.
- **Ordering in settings.** Module groups run after the stack's own for the same event. No module hook reads another hook's output, so order does not matter.

## Post-deploy check

After the merge, RelayEverything's update (its own chat) syncs to this release, opens a new Paseo workspace, and confirms Daily's start check and stop check run once, `/schedule` loads, and its settings name no `@skills-dir` plugin.
