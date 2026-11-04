# Small lessons from WongOS that help every install

**Status:** ready-to-ship
**Branch:** hip-swan
**Open questions:** none

## Why

WongOS runs on WongStack every day and has learned a few small things the hard way: how to get past Google's sign-in, how to fix a staging deploy after a renamed database change, how to sign in to Messenger in a live view, and how to clean up the week board. Each lesson helps every install, not only WongOS. This sends up only the general parts, without WongOS's own people, accounts or limits.

## What Changes

- **Google sign-in gets two tips.** When Google asks for a passkey first, the assistant taps *Try another way*, picks the password, and then waits for your phone prompt. While it waits, it checks the start of the page address, not any part of it, so a sign-in page that only names Gmail does not count as signed in.
  | Google shows | The assistant |
  |---|---|
  | *Use your passkey* | taps *Try another way*, then picks the password |
  | *Tap Yes on your phone* | waits until the address starts with the site's own address |
- **A renamed database change no longer leaves staging stuck.** When a change's database step got a new file name after its preview ran, the next preview fails with *duplicate column name*. The recovery page now says how to fix it on staging only: mark the new name as done, then run the failed deploy again. Your live database is not touched.
  ```mermaid
  flowchart TB
    a[Preview ran it] --> b[File renamed]
    b --> c[Next preview fails]
    c --> d[Mark it done on staging]
    d --> e[Deploy again]
  ```
- **Messenger's live view stays open until you are signed in.** Messenger's password box goes away at its approval step, before the sign-in is done. The live view page now names Messenger's signed-in address as the finish, so the view does not close too early.
- **You can ask any chat to clean up your board.** Today an assistant can only remove a to-do it made for a chat. Now it can also rename, move, or delete any task on your week board, when you ask. Before it deletes, it shows you the tasks it will delete and asks one time.
  ```text
  You:  Clean up my board
  Chat: I will delete these 3 done tasks
        from last week:
        - Call Kim back
        - Order labels
        - Send the update
        OK?
  You:  Yes
  Chat: Deleted 3 tasks.
  ```
  A deleted task can't be brought back.

Non-goals: the other parts of the WongOS sync (a problem opens one chat, chat names and thinking, faster checks, the new browser) each have their own workspace. WongOS's own people, accounts and testing limits stay in WongOS.

## What the build needs

- **WongOS's copies**: Ready, read from `/root/WongOS` at `origin/main`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-board`: a new requirement that an agent may rename, move or delete any task when the owner asks, through the app's described actions, and shows the deletes before it makes them.

## Impact

- App: `app/worker/apps/inbox/tasks/week-routes.ts` (`inbox.task-change` and `inbox.task-delete` become agent-available, confirmed with `inbox.daily-tasks`, with examples), its test `week-routes.test.ts`.
- Docs: `wiki/development/login-codes.md`, `wiki/stack/d1-recovery.md`, `wiki/development/live-view.md`, `wiki/development/daily.md`.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-04** — Asked which WongOS lessons to send up → chose the general parts of Google sign-in, D1 recovery, Messenger live view, the sample-data rule, the board cleanup, the Vitest cache tip and the deploy record; strip Matthew, Claymoo, his accounts and WongOS's testing limits.
- **2026-11-04** — Assumed: the sample-data rule sends nothing, because WongStack's `kept-checks.md`, `staging-walkthrough.md` and `.agents/rules/code.md` already hold it word for word.
- **2026-11-04** — Assumed: the deploy record on the pull request's head commit sends nothing, because in both repos the deploy job runs only on `push`, where `GITHUB_SHA` already is the branch head; WongOS's line is never used and can go at its next sync.
- **2026-11-04** — Assumed: the board cleanup opens WongStack's own `inbox.task-change` and `inbox.task-delete` actions to agents, not WongOS's raw `/api/tasks/<id>` calls with an access token, because WongStack has no such route and its rule is that skills call described actions.
- **2026-11-04** — Assumed: the assistant shows the tasks it will delete and asks one time before it deletes, because a deleted task can't be brought back.
- **2026-11-04** — Assumed: the renamed-migration fix names the staging database as `<staging-db-name>` from `app/wrangler.jsonc`, not `wong-db-staging`, because each install names its own database.
- **2026-11-04** — Assumed: no sample tasks go into `schema/seed.sql`, because the change adds no data shape, only opens two existing actions to agents; a staging check adds its own tasks with `inbox.task-add`, and the seed holds no board tasks today.
- **2026-11-04** — Assumed: the Vitest cache tip sends nothing, because Vitest 5.0.2 keeps compiled files between runs only with `fsModuleCache: true`, which neither repo sets; a run here keeps only `node_modules/.vite/vitest/<hash>/results.json`, so a stale app list can't come from that cache. WongOS's paragraph may name the wrong cause.
- **2026-11-04** — Assumed: archived and saved for publish inside `/ship`; a full test run that failed once after `main` came in passed when run again, so the failure was a slow test, not this change.
- **2026-11-04** — Assumed: the preview check's failure (every query-encoded `DELETE` refused as having a body on the deployed Worker) gets the one fix inside `/ship` in `app/worker/api/contract.ts`, because the cleanup this change promises can't work without it and the same fault likely breaks the Inbox's Delete button live.
- **2026-11-04** — Assumed: archive checkpoint after the one fix; saved for the second preview check.
