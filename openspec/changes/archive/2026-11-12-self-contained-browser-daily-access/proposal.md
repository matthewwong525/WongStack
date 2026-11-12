# The browser, Daily and Access each stand alone in one folder

**Status:** ready-to-ship
**Branch:** shallow-armadillo
**Open questions:** none

## Why

Memory and the build loop each live in one folder, with their commands inside it. The browser and Daily are still split into several folders side by side, so the four look different and are harder to follow. Some of their guides also point into another module's files: the browser and Daily point at the build loop's guide on how to ask, and Access's setup changes memory. A module copied alone then has links that go nowhere, or a step that edits a module it does not own.

## What Changes

- **The browser and Daily each become one folder, like memory.** Each folder has its README, its main skill, and its other commands inside a `skills` folder.
  ```text
  before                    after
  browser/                  browser/
    browser/                  README, SKILL
    hand-over/                skills/
    shop/                       hand-over/
                                shop/
  daily/                    daily/
    daily/                    README, SKILL
    schedule/                 skills/
                                schedule/
  ```

- **BREAKING: `/schedule` becomes `/daily:schedule`.** It works the same. It gets Daily's name in front, as memory's full tidy is `/memory:dream-memory`. When you just ask for a schedule in a chat, you see no difference. Your saved schedules, OKs and settings stay as they are.

- **The browser's commands keep working the same.** The live view, key links, saved details and Shop do the same jobs. They now come inside the browser's folder, and they were already hidden from the command list.

- **No module points into another module's files.** The browser and Daily say in their own words how to ask you a question, with no link to the build loop's guide. Access's setup no longer offers to change memory. A project that has both can still connect them from its own files.

- **Updates move each project with nothing to do by hand.** A full WongStack project gets the new folders with its next update. A project with only the browser, or only Daily, pastes its update message as today. Its own edits stay.

## What the build needs

- **Nothing.**

Non-goals: no change to what the browser, a private link, Shop, Daily or Access does; the build loop's and memory's own shapes and links (other parts of this request); links from a module's guides to WongStack's wiki (workspace "Plugin docs stand alone"); no new shared code between modules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-module`: one folder with the browser skill at its root and `hand-over` and `shop` under `skills/`, one version in both `plugin.json` files; its guides link no file of another module.
- `daily-module`: one folder with the daily skill at its root and the schedule command under `skills/`, named `/daily:schedule`; its guides link no file of another module.
- `access-module`: setup no longer offers to change memory; Access fills or changes no other module.

## Impact

- **Browser (source):** `.agents/plugins/browser/browser/*` moves up to `.agents/plugins/browser/`; `hand-over/` and `shop/` move to `.agents/plugins/browser/skills/`; `module.json` becomes `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` at 2.0.0. The `.agents/skills/hand-over` and `.agents/skills/shop` links and their `mapped` entries go; `.agents/skills/browser` links to the folder.
- **Daily (source):** `.agents/plugins/daily/daily/*` moves up to `.agents/plugins/daily/`; `schedule/` moves to `.agents/plugins/daily/skills/schedule/`; `module.json` goes; both `plugin.json` files go to 2.0.0. The `.agents/skills/schedule` link and its `mapped` entry go; `.agents/skills/daily` links to the folder.
- **Access:** `references/setup.md` loses step 9 and renumbers; both `plugin.json` files go to 1.0.1.
- **Callers repointed:** `.agents/browser/profile.mjs`, `.agents/daily/profile.mjs`, `.agents/skills/reply-link/`, `.agents/inbox/`, `.agents/loop/step-title.mjs`, `.agents/memory/session-start.mjs`, `.agents/plugins/loop/skills/plan/SKILL.md` (path only), `.agents/skills/wong-sync/`, `.agents/skills/wong-setup/SKILL.md`, `.agents/skills/connect/`, AGENTS.md, and every wiki page and script test that names an old path or `/schedule`.
- **Payload:** `payload-files.json` (`mapped`, `exclude`), the payload manifest, `scripts/retired-names.json`, `.agents/memory/areas.json`, `.agents/rules/payload.md` (the ask rule), `CHANGELOG.md` (major).
- **Checks:** `scripts/check-module-versions.mjs` loses `module.json` reading; `module-install.test.mjs`, `cli-conventions.test.mjs`, and the moved script tests follow the new paths; a new check fails when a module's file links or imports another module's folder.
- **Docs:** `wiki/maintaining/adding-a-module.md` keeps one shape, `wiki/development/daily.md`, `wiki/stack/host-schedules.md`, each module's README and setup guide (with a one-time move from the old layout in `## Update`).

## Decision log

- **2026-11-12** — Asked (settled before planning) how the browser and Daily are shaped → chose one folder each with a README, a `SKILL.md` and a `skills/` folder, like memory and the loop, because Matthew wants the modules consistent (memory thread #2751).
- **2026-11-12** — Asked (settled before planning) which cross-module links go → chose the browser's and Daily's links to the loop's ask guide, and Access's setup step that changes memory.
- **2026-11-12** — Asked (settled before planning) how modules share helpers → chose kept-equal copies, as `env.mjs`, `cli.mjs` and `primary-root.mjs` are today; no module imports or links another's files.
- **2026-11-12** — Asked what happens to `/schedule` when it moves into Daily's `skills/` folder → chose it becomes `/daily:schedule`, like `/memory:dream-memory`, so it loads once and needs no extra link.
- **2026-11-12** — Assumed: `hand-over` and `shop` also lose their own links and take the `/browser:` prefix, because both are hidden and read only by path, so nobody types their names.
- **2026-11-12** — Assumed: the browser gets the two `plugin.json` files with no hooks in place of `module.json`, because the loop and memory carry their version there, and one version file shape lets the version check drop `module.json`.
- **2026-11-12** — Assumed: each ask in the browser and Daily is stated in one sentence in place (a multiple choice in the chat, through the assistant's question tool when it has one), not a copied guide, because a sentence is all each place needs and a copy goes stale.
- **2026-11-12** — Assumed: Access's README keeps one general line that a project's own files may use its computer sign-in, naming no module, so a memory-and-Access project still knows how to connect them.
- **2026-11-12** — Assumed: the release is major, because a command name and the installed folder paths change.
- **2026-11-12** — Assumed: the build starts before `fill-logins-from-1password` ships and brings `main` in before the save, because that change was still in its checks at `/ship` and every move is a `git mv`, so its edits follow the files.
- **2026-11-12** — Assumed: a typed `/<module>:<command>` names the chat by its command for every module (`/memory:dream-memory` gives DREAM-MEMORY), not only `/daily:schedule`, because the same rule for every module is simpler and names no chat wrongly.
- **2026-11-12** — Assumed: the helper test keeps the real old path `.agents/skills/hand-over/scripts/reply-link.mjs`, allowed in `retired-names.json`, because the test proves that an old launcher on a real computer moves, and a made-up path proves less.
- **2026-11-12** — Assumed: archive checkpoint for release 56.0.0; the local pre-check did not run because another chat held the check slot, so CI is the only check before merge.
- **2026-11-12** — Assumed: `self-contained-loop` took 56.0.0 first, so this release comes after it: `main` comes in, the loop's `plugin.json` goes to 2.0.1 on its 2.0.0, and `/schedule` lines from it change to `/daily:schedule`. One line of `the-change-loop.md` says the same in fewer words, because the two changes together passed the save route's size limit by 2 bytes.
- **2026-11-12** — Assumed: archive checkpoint for release 57.0.0, after the local pre-check passed.
