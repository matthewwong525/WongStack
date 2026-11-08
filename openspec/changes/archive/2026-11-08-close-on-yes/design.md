# Design

## Context

Three places close or show chats without the person:

- **The close rule.** `AGENTS.md`, `the-change-loop.md#one-task-one-workspace`, `asking-the-user.md` (*End every reply with the next step*), `new-workspace.md#next-work` and `ship/SKILL.md` step 6 tell a finished chat in a Paseo worktree to run `/close` with no question. `lesson/SKILL.md` and `first-day/make-a-change.md` end Lesson 2 with `/close`.
- **The tidy-up.** `tidy.mjs sweep` runs from the session-start hook at most every 6 hours. `sweepWorkspaces` archives this repo's worktrees idle `IDLE_MS` (3 days) with saved work. The same sweep stops orphan processes, deletes old `wong-*` temp entries and day-old primary-checkout scratch files.
- **The Inbox chat list.** Two paths write a chat's row: `step-title.mjs` puts it at session start and at each step (`hookTurn`, `setStep`), and the daily worker's pass sends every open chat through `openChats` → `keepChats` → `inbox.chats-sync`, which adds missing rows and drops gone ones. A row's `source` is `schedule:<key>` when Paseo's agent carries the `wong-schedule` label (`sourceOf`).

Two facts found while reading:

- `paseo ls --global --json` lists `id, shortId, name, provider, thinking, status, cwd, created`: **no labels**. So `openChats`'s `sourceOf(agent.labels)` is always null today; only `step-title.mjs`, which reads Paseo's agent record file (`paseoRecord`), sees a label.
- Only a background run's handoff chat gets the label (`daily.mjs launcherArgs`). A schedule that runs as a chat starts through `app-runs.mjs openSession` (`paseo run -d …`) with no label, so the Inbox can not tell it from the person's own chat.

## Goals / Non-Goals

**Goals:** a finished chat closes only on the person's yes; the tidy-up closes no chat; a schedule's chat is off the Inbox while it runs and shows once it stops and stays open.

**Non-Goals:** no change to `/close` itself, to the Inbox's *Close chat*, to *what's going on?*'s close pick, or to the app's Inbox code (a stopped schedule chat with no review page already lands under *Working*). Routines that close themselves on success keep `tidy.mjs close`.

## Decisions

### The close question

In a Paseo worktree, finished work ends on one question-tool card, *Close this chat?*, with the options *Close it (Recommended)*, the routine or app offer when [one applies](../../../wiki/development/the-change-loop.md#offer-a-routine-or-an-app), and *Keep it open*. *Close it* runs `/close`; *Keep it open* ends the turn; the offer starts its own route, and the chat asks again once that route is done. This keeps the change loop's rule that an offer is one option in the next-step question, never its own question. `/close` keeps asking nothing once invoked. Outside a Paseo worktree nothing changes: there is no workspace to close.

Each rule surface gets the same sentence in its own words, owned by `the-change-loop.md#one-task-one-workspace`; the others link it. `asking-the-user.md` drops *finished work that closes* from the replies that end with no question, and its Paseo bullet becomes the close card. `new-workspace.md#next-work` opens and reports the parts, then asks the close card. Lesson 2 ends at the save with the close card, not *publish it?*.

### The tidy-up

Delete `sweepWorkspaces`, `isIdle`, `IDLE_MS`, `ownWorkspace` and `listAgents` (each used only by the sweep's archive; `listWorkspaces`, `savedState`, `mergedAtTip`, `pullRequest` and `BUSY` stay for `close`). `sweep` calls `stopOrphans({ roots: trees.parents, live: trees.live })`. The report keeps its shape: `/close`'s background half still writes *closed* and *left* lines into it. `sweepWorkspaces` goes into `scripts/retired-names.json`, so no live file names it.

Alternative weighed: keep the sweep but only report idle chats. Rejected: the Inbox and *what's going on?* already show open chats, and a second nag repeats them.

### A schedule's chat in the Inbox

- **Label every schedule chat.** `openSession` adds `--label wong-schedule=<key>` (`SCHEDULE_LABEL` from `daily/scripts/chats.mjs`), as `launcherArgs` does for a handoff.
- **Read labels where they live.** `openChats` takes `record = () => ({})`; `chief.mjs` passes `id => paseoRecord(id)`. A chat's labels are `agent.labels ?? record(id).labels`.
- **Hide while it runs, and just after.** A chat whose source is a schedule is left out while `working(agent)`, and until `SETTLE_MS` (2 minutes) after its record's `lastActivityAt` (else `updatedAt`). `tidy.mjs close` archives a self-closing run seconds after it stops, and the worker's pass wakes when a chat stops, so without the wait a self-closing run could show for one pass. An unreadable time counts as settled: a chat that may need the person is shown, not hidden.
- **No put while running.** `step-title.mjs` runs only inside a running chat, so `hookTurn` and `setStep` skip the put when `sourceOf(record?.labels)` is set. The worker's sync then both adds the row once the chat has settled and drops a row an older version put.

The app needs no change: a stopped schedule chat has no review page, so it sits under *Working* with *From a schedule* (`Chats.tsx`). A handoff chat that publishes its review page shows that page as its own *Needs you* row until the chat stops; then the page joins the chat's row by agent id.

## Risks / Trade-offs

- **Chats pile up.** With no idle close, chats stay open until the person closes them. The Inbox's *Close chat* and *what's going on?* cover this; the request chose it.
- **A 2-minute delay** before a stopped schedule chat shows. Small next to a run's length.
- **Paseo's record format.** Labels and `lastActivityAt` come from Paseo's own agent file, as `userAt` and `step-title.mjs` already read it. If Paseo moves it, labels read as none and schedule chats show like any chat, which fails toward showing.
