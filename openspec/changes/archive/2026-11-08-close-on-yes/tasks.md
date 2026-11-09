# Tasks

## 1. The close rule

- [x] 1.1 `wiki/development/the-change-loop.md#one-task-one-workspace`: done, the agent asks *Close this chat?* (any [offer](#offer-a-routine-or-an-app) as one more answer in the same card) and runs `/close` only on a yes; never asks at a plan's review, mid-build, or on a blocker, failed check, declined publish or open question. Keep the heading's exact text
- [x] 1.2 `AGENTS.md` WONG-STACK block, *One task, one workspace*: a finished task asks *Close this chat?*, with any routine or app offer in the same card, and closes through `/close` only on a yes
- [x] 1.3 `.agents/skills/explore/references/asking-the-user.md` *End every reply with the next step*: drop *finished work that closes* from the replies with no question; the Paseo bullet becomes *Close this chat?*: *Close it (Recommended)*, any offer, *Keep it open*; run `/close` only on *Close it*
- [x] 1.4 `.agents/skills/plan/references/new-workspace.md#next-work`: in a Paseo worktree, open and report each part, then ask *Close this chat?*
- [x] 1.5 `.agents/skills/ship/SKILL.md` step 6: a failed live look, or a `/ship` that `/close` invoked, does not ask to close
- [x] 1.6 `.agents/skills/lesson/SKILL.md` and `wiki/development/first-day/make-a-change.md`: Lesson 2 ends at the save with *Close this chat?*, not *publish it?*
- [x] 1.7 `wiki/development/the-change-loop.md` *The steps*, `/close` bullet: it runs on the person's yes, a pick, or a routine's own close; then no question

## 2. The tidy-up

- [x] 2.1 `.agents/skills/schedule/scripts/tidy.mjs`: delete `sweepWorkspaces`, `isIdle`, `IDLE_MS`, `ownWorkspace`, `listAgents`; `sweep` stops orphans from `trees.parents` against `trees.live`; drop now-unused imports
- [x] 2.2 `scripts/tests/tidy.test.mjs`: drop the `isIdle` and `ownWorkspace` tests and the sweep-archive test and its Paseo-output-changed note test; add: a sweep with an idle, saved worktree archives nothing and calls no `paseo workspace archive`, yet deletes old `wong-*` temp and old primary scratch and stops an orphan under a deleted worktree
- [x] 2.3 `wiki/development/daily.md#close-finished-chats`: drop *the tidy-up still closes a saved chat idle for 3 days*; `wiki/development/required-tools.md`: drop the idle tidy-up from what you lose without Paseo, and from *workspaces stay open after a merge*
- [x] 2.4 `scripts/retired-names.json`: `sweepWorkspaces` → nothing closes an idle chat; the tidy-up only cleans leftovers

## 3. A schedule's chat in the Inbox

- [x] 3.1 `.agents/skills/schedule/scripts/lib/app-runs.mjs` `openSession`: add `--label wong-schedule=<key>` from `SCHEDULE_LABEL`
- [x] 3.2 `.agents/skills/daily/scripts/todos.mjs` `openChats`: take `record` and `now`; labels from `agent.labels ?? record(id).labels`; leave out a schedule chat while working or until `SETTLE_MS` (2 min) after its record's `lastActivityAt ?? updatedAt`; an unreadable time is settled
- [x] 3.3 `.agents/skills/daily/scripts/chief.mjs`: pass `record: paseoRecord` and the pass's `now` to `openChats`
- [x] 3.4 `.agents/skills/explore/scripts/step-title.mjs`: `hookTurn` and `setStep` put no row for a chat whose record carries the schedule label
- [x] 3.5 Tests: `scripts/tests/daily-todos.test.mjs`: a running schedule chat is left out; one stopped 1 minute ago is left out; one stopped 3 minutes ago is in with `source: 'schedule:<key>'`, its label read from the record; an archived one is out; a schedule chat with no readable time is in; `scripts/tests/step-title.test.mjs`: a schedule chat's session start and `set` put nothing, and a plain chat still puts; `scripts/tests/schedule-app.test.mjs`: `openSession`'s Paseo args carry `--label wong-schedule=weekly-plan`
- [x] 3.6 `wiki/development/daily.md` *Your chat list* and *A background run's handoff*, and `wiki/stack/host-schedules.md#where-it-runs`: a schedule's chat shows only once it stops and stays open; one that closes itself never shows
- [x] 3.7 `.agents/skills/daily/scripts/chats.mjs`: a shared `scheduleRun` helper: a schedule-labelled chat is its run until the person writes in it (`lastUserMessageAt` more than 60 s after `createdAt`); `todos.mjs` `openChats` and `step-title.mjs` `hookTurn` and `setStep` use it, so a taken-over chat shows while it works and puts its row, keeping its `schedule:<key>` source
- [x] 3.8 Tests: `scripts/tests/daily-todos.test.mjs`: a running schedule chat whose record shows a later message from the person is in the list, one with only its run's own message is not; `scripts/tests/step-title.test.mjs`: such a chat's `set` puts its row with its schedule source; `scripts/tests/daily-chief.test.mjs`: a pass with chats on leaves out a running chat whose agent record carries the schedule label
- [x] 3.9 Inbox spec delta: once the person writes in a schedule's chat, it shows like any chat, with a scenario; `wiki/development/daily.md` *Your chat list* says the same

## 4. Release

- [x] 4.1 `CHANGELOG.md`: a `## Next (minor)` entry, with an **Updating.** note that nothing needs doing by hand

## 5. Checks

- [x] 5.1 Run `node --test scripts/tests/tidy.test.mjs scripts/tests/daily-todos.test.mjs scripts/tests/step-title.test.mjs scripts/tests/schedule-app.test.mjs scripts/tests/daily-chief.test.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/measure-context.mjs --check` (cut offsetting words if it fails), and `node .github/scripts/checks.mjs --worktree`
