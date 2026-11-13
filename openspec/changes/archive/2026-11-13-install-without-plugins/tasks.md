# Tasks

## 1. Modules

- [x] 1.1 Delete `.claude-plugin/` and `.codex-plugin/` from each of the five modules in `.agents/plugins/`; add a `VERSION` file to each with a major raise from `main` (design decisions 1, 2).
- [x] 1.2 Rewrite `hooks/claude.json` and `hooks/codex.json` in memory, daily, and access to project paths (decision 3).
- [x] 1.3 Memory: drop `pluginLines`, `versionOf`, and `codexPluginName` from `scripts/session-start.mjs` and `scripts/lib/store.mjs`, with their tests.
- [x] 1.4 Each module's `references/setup.md`: the hook-merge and command-link steps, no Codex marketplace steps, and the `## Update` move off plugins (decision 8). Each module's `README.md` and `SKILL.md`: no plugin wording, `/schedule` for `/daily:schedule`.

## 2. Source layout and settings

- [x] 2.1 Delete the root `.claude-plugin/marketplace.json`; add the folder links `.agents/skills/{schedule,hand-over,shop,services}` (decision 5).
- [x] 2.2 `.agents/settings.json` and `.agents/hooks.json`: append each module's hook groups (decision 4).
- [x] 2.3 Every live source text names `/schedule`, not `/daily:schedule`; `scripts/retired-names.json` retires the plugin paths, `@skills-dir`, and `/daily:schedule`, and lifts `/schedule`.

## 3. Setup and sync

- [x] 3.1 `.agents/skills/wong-sync/scripts/codex-plugin.mjs`: remove the old module plugins; `--check` names the command (decision 6). Rewrite `scripts/tests/codex-plugin.test.mjs` with a stand-in `codex` and config.
- [x] 3.2 `payload-files.json`: drop `.claude-plugin/marketplace.json`; update `$comment`. `install-path.mjs`: drop the `/<module>:<command>` rename and its test cases (undone by 6.3).
- [x] 3.3 `wong-setup/SKILL.md` drops the `codex-plugin.mjs` step; `wong-sync/SKILL.md` describes it as removing old plugins; `catch-up.md` gets the `module-plugin` entry (decision 7); `payload-manifest.md` says modules load as plain skills and settings run their hooks.

## 4. Checks and docs

- [x] 4.1 `scripts/check-module-versions.mjs` reads `VERSION`, with the base's `plugin.json` fallback; update `scripts/tests/module-versions.test.mjs`.
- [x] 4.2 New `scripts/tests/module-hooks.test.mjs` (decision 4). `scripts/tests/module-install.test.mjs`: a lone copy has no plugin manifest, its hooks merge into an empty project's settings, and its commands link up.
- [x] 4.3 `wiki/maintaining/adding-a-module.md`: the hooks, command, and version rules without plugins. `.agents/rules/payload.md`: drop the `${CLAUDE_PLUGIN_ROOT}` exception. `wiki/development/memory.md`, `wiki/development/daily.md`, `wiki/maintaining/adding-a-skill.md`: no plugin or Codex-install wording.
- [x] 4.4 `CHANGELOG.md`: a `## Next (major)` entry whose **Updating.** note says the update moves the checks into the project's settings, turns off old plugins, and that `/daily:schedule` is now `/schedule`.

## 5. Final checks

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, retired names, module versions, context budget, script tests) and fix each failure.
- [x] 5.2 Scratch install from this tree with `install.mjs`; open Claude Code there untrusted and trusted: the memory digest and Daily's start check run once, the stop check runs, `/schedule`, `hand-over`, `shop`, and `services` load once, and no `@skills-dir` plugin is listed.
- [x] 5.3 Open Codex in the source and in the scratch install: memory's and Daily's hooks run once, each skill appears once (design risk 1).
- [x] 5.4 Scratch install from the base release with `daily@skills-dir` off and Daily's hooks added by hand; run the preflight against this tree and follow the sync plan: plugin files removed, each hook once, local hooks kept, `codex-plugin.mjs` removes the old Codex plugins from a stand-in config.
- [x] 5.5 Follow Daily's setup guide into an empty repo from this tree: hooks merged, `/schedule` linked, Daily's check passes.

## 6. Review fixes

- [x] 6.1 `codex-plugin.mjs` removes only plugins from the `wongstack` list or a list whose source is this repo or its primary checkout; test a kept `browser@acme` and a removed `memory@<repo's own list>`.
- [x] 6.2 Memory's lone guide (`references/setup.md`, `README.md`) gets the Codex link step the other modules have.
- [x] 6.3 `install-path.mjs` keeps the `/<module>:<command>` → `/<command>` rename in `installText`, with its test; a preflight test shows a 60.0.0-style base with `/daily:schedule` reads `installed-equivalent`.
- [x] 6.4 Each lone guide's command-link step replaces a real `.claude/skills/<command>` folder only when its `SKILL.md` matches the module's; otherwise it skips the command and names the clash.
- [x] 6.5 `module-install.test.mjs` runs each guide's own hooks-merge and link-step snippets in a temp repo: each hook once after two runs, each link resolves, a project's own `schedule` skill stays.
- [x] 6.6 `.agents/memory/areas.json`: the `browser-module` and `loop-module` descriptions name no plugins.
- [x] 6.7 Rerun `node .github/scripts/checks.mjs --worktree`.
- [x] 6.8 Each lone guide's Codex link step skips a real `.agents/skills/<name>` folder and names it, as the `.claude` side does (second-look reread).
