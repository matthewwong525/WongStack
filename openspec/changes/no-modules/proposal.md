# WongStack is one stack, with no add-alone parts

**Status:** ready-to-ship
**Branch:** remove-plugins-from-wongstack
**Open questions:** none

## Why

WongStack is split into five parts that another project can add one at a time: the build loop, memory, Daily, the browser, and Access. Each part has its own version, its own setup guide, its own copy of its hooks, and a go-between file that joins it to the rest. Nobody adds one part alone. The split only adds files to keep in step and rules to follow, and every change pays for it.

## What Changes

- **Every command is a normal folder.** `/plan`, `/memory`, `/daily`, `/schedule`, `/services`, the browser, and the others each sit in one folder in the skills folder, like `/ui` or `/page` do today. The `plugins` folder goes.
  ```text
  Before
  .agents/
  ├── plugins/      each: version, guide,
  │   ├── loop/           hooks, README
  │   ├── memory/  daily/
  │   └── browser/  access/
  ├── skills/       mostly links into plugins/
  └── loop/ memory/ daily/ browser/
      └── profile.mjs   go-between

  After
  .agents/
  ├── skills/
  │   ├── plan/ apply/ save/ ship/ …
  │   ├── memory/  daily/  schedule/
  │   ├── browser/  shop/  hand-over/
  │   └── access/  services/
  ├── loop/         the loop's shared code
  └── settings.json + hooks.json
  ```
- **The code calls the code it needs, with no go-between.** A step that needs the chat's title, a preview, or the memory store calls that code straight. The five go-between files and the code that reads them go.
- **One version.** WongStack's version number is the only one. The five part versions go.
- **No "add one part to your project".** The five paste-in setup guides, the five part READMEs, and the rule page for making a part go. What they said that WongStack itself still needs moves to the wiki page that owns it.
- **One list of hooks.** The settings files already run every hook. The second copy in each part goes, and with it the test that kept the two copies the same.
- **Your update moves you over.** `/wong-sync` moves an install to the new folders and keeps your own files, such as Daily's team page and people pages. Nothing you set up, saved, or scheduled changes.
- **BREAKING:** a project that added one part alone by its paste-in guide can no longer update that part by itself. Links to the old setup guides on GitHub stop working.

**Non-goals:** changing what any command does; renaming any command; changing the memory store, schedules, or the app.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-layout`: replaces the three module rules (a module's links stay inside it, each module command loads by its bare name, no module loads as a plugin) with one rule: WongStack ships as one stack, each command one skill folder, one hook list, one version.
- `loop-module`: removes adding the loop alone, updating it alone, and running it with empty slots.
- `memory-plugin`: removes the profile, adding memory alone, updating per module, and memory's own hook copy.
- `daily-module`: removes the profile, adding Daily alone, the setup question at chat start, updating alone, and Daily's own hook copy; Daily with no company app now keys off the app, not a profile.
- `browser-module`: removes adding the browser alone, running with no other part, and updating alone.
- `access-module`: removes the one-module install, the slots, adding Access alone, the setup question, other modules' slots, and updating alone.

## Impact

- Moves: `.agents/plugins/<module>/` → `.agents/skills/<module>/` for memory, daily, browser, access; each nested `skills/<command>/` → `.agents/skills/<command>/`; the loop's seven commands → `.agents/skills/<command>/`; the loop's `scripts/`, `references/` → `.agents/loop/`. Source skill links replaced by real folders.
- Removes: `.agents/plugins/`; `.agents/{loop,memory,daily,browser}/profile.mjs`; `slot.mjs` and its callers' `slot.mjs <part>` lines; each module's `VERSION`, `README.md`, `references/setup.md`, `hooks/`; `scripts/check-module-versions.mjs`; `scripts/tests/{module-install,module-hooks,module-versions,slot,loop-profile}.test.mjs`; the `codex-plugin.mjs --check` start hook; `wiki/maintaining/adding-a-module.md`.
- Edits: every link and command line into `.agents/plugins/` (about 170 files: skills, wiki, tests, verification journeys, workflows); `payload-files.json` `mapped` entries become `skillDirs` and `dirs`; `payload-manifest.md`, `catch-up.md` (a new `module-folders` step), `install-path.mjs`, `preflight.mjs`; `.agents/rules/payload.md`; `scripts/retired-names.json` (`.agents/plugins/`, `slot.mjs`, `profile.mjs`); `AGENTS.md`, `README.md`; `CHANGELOG.md` `## Next (major)`.
- Open work on branches that edit `.agents/plugins/` moves its edits to the new paths on its next save.

## Decision log

- **2026-11-24** — Asked how much of the split goes → chose all of it: no plugin folders, no go-between files, one version, one hook list; one part can no longer be added alone.
- **2026-11-24** — Asked when to move, with about eight open branches editing the plugin folders → chose now; each open branch moves its edits on its next save.
- **2026-11-24** — Assumed: the loop's shared code and rules join WongStack's existing `.agents/loop/` folder, not a skill folder, because seven commands share it and `.agents/loop/` already holds the loop's WongStack code.
- **2026-11-24** — Assumed: files other tools read by path, such as memory's D1 migrations, `areas.json`, and Access's `slots.json`, stay where they are; only code moves, because a moved migrations folder changes the deploy settings for every install.
- **2026-11-24** — Assumed: `codex-plugin.mjs` stays only as an update step for older installs, not a check in every chat, because v61 installs may still have the old Codex plugins.
- **2026-11-24** — Assumed: capability names such as `memory-plugin` stay, because renaming a capability moves its history and changes no behavior.
- **2026-11-24** — Assumed: the save route reads `github` only for a GitHub origin with a working `gh`, else `local`, in `delivery-route.mjs`'s `ownRoute`, the test the loop's profile part ran.
- **2026-11-24** — Assumed: the save step's pre-check note says "not run (the project has no pre-check)" when no check script exists, the words the loop's profile gave.
- **2026-11-24** — Assumed: memory's parts are WongStack code at `.agents/skills/memory/scripts/lib/parts.mjs`; a test names a stand-in file by `WONG_MEMORY_PARTS`, and a missing stand-in reads as no store, so tests keep their no-store case.
- **2026-11-24** — Assumed: `install-path.mjs` and the preflight's mapping code stay, because an update from an older release rebuilds that release's text through its `mapped` list; the current list maps nothing.
- **2026-11-24** — Assumed: `module-link` and `module-plugin` read a fixed list of the old module and command folders, since the current list no longer names them.
- **2026-11-24** — Assumed: Access's start hook and its setup check go with the setup guide, because an install always has the app's keys and the hook only pointed to that guide.
- **2026-11-24** — Assumed: `wong-sync/SKILL.md` keeps its `codex-plugin.mjs` step for every update, because it does nothing on an install with no old Codex plugin.
- **2026-11-24** — Assumed: `D who` reports its source as "app", `D check` names a failing store as `storeError`, `/schedule` uses the app store when `.agents/inbox/` exists and Paseo otherwise, and a failed part writes one journal line.
- **2026-11-24** — Assumed: a key link reads `.env` and `app/.dev.vars`, take-key uses `.env` only when there is no `scripts/company-api.mjs`, and a private page always gets the app's look.
- **2026-11-24** — Assumed: the retired names list the profile files by folder (`loop/profile.mjs`, `memory/profile.mjs`), because a bare `profile.mjs` matches other files.
- **2026-11-24** — Assumed: the context baseline stays as recorded; the instruction words fall below it, and recording a new one makes the next check compare equal totals.
- **2026-11-24** — Check: `scripts/tests/slot.test.mjs` is deleted, with `slot.mjs`, the file it tested.
- **2026-11-24** — Check: `scripts/tests/module-hooks.test.mjs`, `scripts/tests/module-install.test.mjs`, and `scripts/tests/module-versions.test.mjs` are deleted, because the module hook copies, setup guides, and versions they checked are gone.
- **2026-11-24** — Check: `scripts/tests/access-session-start.test.mjs` is deleted, with Access's start hook.
- **2026-11-24** — Check: `.github/workflows/payload.yml` no longer runs `check-module-versions.mjs` and lints `.agents/loop` once, because the script and the plugins folder are gone; `scripts/tests/.c8rc.json` drops the plugins paths, and `.agents/loop` and `.agents/skills` still cover the moved code.
- **2026-11-24** — Check: `.github/workflows/document-search.yml` now watches `.agents/skills/memory/**`, where the memory code moved; `.github/scripts/loosened-checks.mjs` imports `archive.mjs` from its new folder. Neither is loosened.
- **2026-11-24** — Check: the review test for a missing `reviewLink` part, the loop-isolation test in `cli-conventions.test.mjs`, memory's ask-once-with-no-profile test, the daily profile and slot tests, and the hand-over and keys profile tests are removed, because each tested a profile part or slot that no longer exists.
- **2026-11-24** — Assumed: the 61.x install part of task 5.2 is shown by the preflight test that reports `module-folders` for the old layout, not by a full sync of a real install, because a full sync opens its own plan and change in the target.
- **2026-11-24** — Assumed: the second look's two fixes (the workspace pick-up line names `workspace.mjs`; `/apply` names `other-work.mjs`) were made inline, and `close-workspace.test.mjs` now fails on a bare `node "$W"` line.
- **2026-11-24** — Saved for the CI gate as task 5.3, inside `/ship`.
