# Tasks

## 1. Move the folders

- [x] 1.1 Move `.agents/skills/daily/` to `.agents/plugins/daily/daily/` and `.agents/skills/schedule/` to `.agents/plugins/daily/schedule/`; make `.agents/skills/daily` → `../plugins/daily/daily` and `.agents/skills/schedule` → `../plugins/daily/schedule` links; point every Markdown link at the real path by [repo layout](../../../wiki/maintaining/repo-layout.md#linking); list the old link targets in `scripts/retired-names.json`.
- [x] 1.2 Add `daily/module.json`, `daily/.claude-plugin/plugin.json` and `daily/.codex-plugin/plugin.json` at `1.0.0` (design §1).
- [x] 1.3 In `payload-files.json`, drop `daily` and `schedule` from `core.skillDirs` and add two `mapped` entries (design §1); keep the `daily/team.md` and `daily/people` excludes; teach `/wong-sync`'s preflight and copy and `/wong-setup`'s install to accept both mapped folders, as they do memory's.

## 2. Own helpers and slots (module)

- [x] 2.1 Add `daily/scripts/lib/` copies of `cli.mjs`, `primary-root.mjs`, `headless.mjs`, the transcript parsing `daily` uses, `.env` parsing and repo context (`env.mjs`), and `computerId`/`helperFiles` (`computer.mjs`); move `schedule/scripts/lib/paseo.mjs` to `daily/scripts/lib/paseo.mjs`; repoint every import in both folders.
- [x] 2.2 Write `daily/scripts/lib/slot.mjs` (design §2): load `.agents/daily/profile.mjs` or `WONG_DAILY_PROFILE`, a time limit per call, `undefined` for a missing part, one journal line a day for a part that throws; tests for each case.
- [x] 2.3 Route each outside reach through its slot: `D who` → `person`; `chat-list.mjs` → `chatName` (own `folderOf`); `stop-check.mjs` → `offeredChoices`; `worker.mjs` → `prepareRun`; `workspace.mjs --checkout` → `checkout` and its sign-in hint → `person().help`. Tests: each slot empty and filled.
- [x] 2.4 Put the schedule store behind `schedules` (design §2): `schedule.mjs`, `defaults.mjs`, and a new `lib/start-run.mjs` (`startRun(run)`: opens the chat or hands to the worker, reports by `schedules.report`) call only the slot. Tests with a stand-in store.
- [x] 2.5 Write `schedule/scripts/lib/paseo-store.mjs` (design §3), used when `schedules` is empty and Paseo is found; refuse background, `check`, `minutes`, `deny`, team copies and `until` with plain reasons; `{ ok: false, code: "no-store" }` with neither. Tests with a fake `paseo` on `PATH`.
- [x] 2.6 With no `schedules` slot, run the line-up from the worker pass (design §3) with `D lineup off|on`, honouring *stop check-ins*. Test: the same `line-up-check.mjs` and brief start one run in both ways.

## 3. Hooks, start-of-chat ask, and check (module)

- [x] 3.1 Write `daily/hooks/claude.json`, `daily/hooks/codex.json`, and `daily/scripts/session-start.mjs` (design §4); remove the daily entries from `.agents/settings.json` and `.agents/hooks.json` and `ensure` from `.agents/memory/session-start.mjs`; repoint its `tidy.mjs sweep`; add `daily` to `.claude-plugin/marketplace.json`.
- [x] 3.2 Add `daily.mjs check` (design §5, step 6). Tests: `ok` with no profile and no Paseo (store `off`), with a fake Paseo (`paseo`), and with a stand-in `schedules` (`app`).
- [x] 3.3 Write `daily/README.md` (install message first, then the update message, what you get, what it needs) and `daily/references/setup.md` with `## Update` (design §5), by memory's shape.

## 4. WongStack's extras

- [x] 4.1 Create `.agents/inbox/`: move `schedule/scripts/lib/app.mjs`, `approvals.mjs`, `legacy.mjs`, `move-in.mjs`, and the claim and report half of `app-runs.mjs` into `schedules.mjs`, `runs.mjs`, and `move-in.mjs` (design §2); move their tests' imports.
- [x] 4.2 Write `.agents/daily/profile.mjs` filling every slot (design §2); name it in the payload manifest as the one shipped file under the install-owned `.agents/daily/`, and add it and `.agents/inbox/` to `payload-files.json`.
- [x] 4.3 Repoint core callers: `hand-over/reply-link.mjs` (`serveInbox` → `.agents/inbox/runs.mjs`), `hand-over/lib/wake.mjs` and `explore/scripts/{step-title,other-work}.mjs` (Paseo helper path), `hand-over/lib/computer.mjs` users, `.agents/memory/tidy-pages.mjs`, `close/SKILL.md`, `plan/references/new-workspace.md`, and `wong-setup/SKILL.md`.

## 5. Removals

- [x] 5.1 Reminders ask: remove the line from `daily/SKILL.md`, the *Reminders* section from `wiki/development/daily.md`, and every link to `#reminders` (`check-payload-links.mjs` finds them).
- [x] 5.2 Tell and watch: remove `D hand`, the other-chat relay in `D answer`, `hands.json`, and `chief.md`'s *The person's answers*; keep `D reply`. Update `daily-chief` and `daily` tests.
- [x] 5.3 Chat list on the computer: remove `todos.mjs`, `chats.mjs`'s app calls and `chatClient`, `step-title.mjs`'s row put, `/close`'s row removal, the `chats` Needs-you kind, and make `sources.chats` a no-op with one journal line. Update `daily-todos`, `daily-chat-list`, `step-title`, and `daily-worker` tests.
- [x] 5.4 Chat list in the app: replace `app/src/apps/inbox/Chats.tsx` with `Waiting.tsx` by the prototype diff and design §UX (reviews' `waiting` list, `computerOnline`, the empty line, Archive below); remove `app/worker/apps/inbox/chats.ts`, add its routes to `retiredRoutes`; add `schema/migrations/20261112120000_drop_inbox_chats.sql`. Tests: `Waiting.test.tsx` (rows newest first, a tap opens the page, nothing waits, offline badge), `api.test.ts` (retired chat routes answer the retired code), a migration test.

## 6. Docs and release

- [x] 6.1 Update `wiki/development/daily.md` (the module, its two installs, slots, no-app behaviour, the dropped parts), `wiki/development/reply-links.md` (the Inbox opens on waiting pages), `wiki/stack/host-schedules.md` (where a schedule lives with no app), and `wiki/maintaining/adding-a-module.md` (a module with hooks may add sibling skill folders listed in `module.json`).
- [x] 6.2 Update the `inbox` spec's Purpose line to the waiting pages at archive; add an area for the `daily-module` spec in `.agents/memory/areas.json`.
- [x] 6.3 Add `## Next (major) — Daily becomes a module any project can add` to `CHANGELOG.md`, with an **Updating.** note in plain words: Daily moves into its own folders and keeps every schedule, OK and setting; the Inbox opens on the plans waiting for you; *remind me*, *tell* and *watch* are gone; the app's saved chat list is deleted.

## 7. Checks

- [x] 7.1 Teach `scripts/check-module-versions.mjs` to read `module.json` folders (design §7), and `scripts/tests/module-install.test.mjs` to install Daily alone (design §7); assert the plugin's Stop hook timeout is at least 300 seconds.
- [ ] 7.2 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, retired names, `measure-context.mjs --check` with offsetting cuts, script and app tests).
- [ ] 7.3 In `.scratch/`, follow `daily/references/setup.md` from its GitHub-shaped copy in a plain repo with Paseo: it copies both folders, writes the settings file, sets schedules to Paseo, and `daily.mjs check` prints `ok`; follow `## Update` with one local edit kept and one clash stopped; then in a WongStack checkout, setup stops and changes nothing.
- [ ] 7.4 Run `/save` and check the preview: the Inbox opens on *Needs you* with waiting pages and the Archive, and no chat rows.
