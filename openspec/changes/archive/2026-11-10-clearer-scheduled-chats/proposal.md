# A scheduled chat shows its name and starts with your instructions

**Status:** planned
**Open questions:** none

## Why

When a schedule opens a chat, two things are odd. Its workspace shows only "main": at 13:00 on 2026-11-09, 7 scheduled chats in WongOS and ClaymooApp all showed "main". And the chat's first message is not your instructions. It is a note that tells the chat to read a file, run a script, and then do what the script prints. You can not see what the chat was asked to do, and it takes extra steps before it starts.

## What Changes

- **A scheduled chat's workspace gets the schedule's name.** This part was published first, in 51.9.0, from another chat, which also gives each run its own fresh copy of the project. The workspace in your list shows the schedule's name, such as *Plan the week* or *Post the league polls*. If the name can not be set, the chat still starts, keeps "main", and the run's log says why.
  ```text
  Before                 After
  ─────────────────      ───────────────────────
  main                   Plan the week
  main                   Make a new ad
  main                   Post the league polls
  ```
- **The chat starts with your instructions, pasted in.** The first message is the text you approved, word for word, then a short footer: what it may do, when it ends, the progress so far, and one line to run when it stops. If your instructions start with a skill, such as `/news`, that skill runs. The checks stay: your computer opens the chat only when the text is the version you approved there. Background runs already work this way.
  ```text
  Before
  ────────────────────────────────────
  Scheduled work startup. Read
  .agents/skills/schedule/references/
  run.md, then run schedule.mjs start
  --key weekly-plan --run 1a2b…
  --version 9f3c…. Follow only the
  instructions it prints.

  After
  ────────────────────────────────────
  Plan the week: list this week's
  orders, flag the late ones, and
  draft a plan for Monday.
  ──
  Scheduled: Plan the week
  May do: read and draft only
  Progress: last run 2026-11-02
  When you stop: schedule.mjs finish
    --key weekly-plan --run 1a2b…
  ```
- **A schedule that is already running does not open a second chat.** Today the second chat opens and then stops. Now it does not open, and the run shows *Already running*.

## What the build needs

- **Nothing.**

Non-goals: no rename of workspaces that are already open; no change to schedules that Paseo runs by itself; no change to how you make, approve, or change a schedule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-schedules`: a chat schedule's workspace is named for the schedule; its first message is its approved instructions, checked and claimed before the chat opens.

## Impact

- `.agents/skills/schedule/scripts/lib/app-runs.mjs` (`openSession`, `startRun`, `runRound`), `.agents/skills/schedule/scripts/lib/hosts.mjs` (`startupPrompt` → `firstMessage`), `.agents/skills/schedule/scripts/workspace.mjs` (export `nameWorkspace`), `.agents/skills/schedule/scripts/schedule.mjs` (`start`, `progress`, `release` → `finish`).
- Docs: `.agents/skills/schedule/references/run.md`, `.agents/skills/schedule/SKILL.md`, `wiki/stack/host-schedules.md`.
- Tests: `scripts/tests/schedule-app.test.mjs`, the `schedule.mjs` command tests.
- `CHANGELOG.md` minor entry; `scripts/retired-names.json` for `schedule.mjs start`.

## Decision log

- **2026-11-09** — Assumed: name the workspace with the same title the chat gets (the schedule's name in plain words), because that is what the chat list already shows and the person asked for "better names".
- **2026-11-09** — Assumed: a failed rename keeps the run started and only logs a warning, because a named workspace is not worth a missed run; `workspace.mjs` does the same.
- **2026-11-09** — Assumed: the workspaces already open stay as they are, because a rename by hand fixes the one left ("Post the league polls" in WongOS) and old runs close soon.
- **2026-11-10** — Asked how a scheduled chat should get its task (a script, a skill, or a file) → chose the approved text pasted into the first message, not a pointer to a file.
- **2026-11-10** — Assumed: pasting the app's text is safe, because the computer opens the chat only after it recomputes the version from that text and matches your OK on this computer; a changed text is refused before any chat opens.
- **2026-11-10** — Assumed: the end of a run is one command, `finish`, in place of three (`progress`, `end`, `release`), because one line in the footer is easier to follow than a file of steps.
- **2026-11-10** — Assumed: the computer claims the schedule's progress before it opens the chat, so a run already in progress refuses with no chat, not a chat that stops.
- **2026-11-10** — Assumed: the footer names the run by key and run id, not by the schedule's name, because the version does not cover the name, so it is app text no OK approved; the chat's title still shows the name.
- **2026-11-10** — Assumed: a run another run holds reports `already_running`, not `busy`, because the daily worker already uses `busy` for *too many runs at once*; the Inbox shows it as *didn't start, it's already running* (one line in `app/src/apps/inbox/cadence.ts`).
- **2026-11-10** — Assumed: an app that does not answer the claim blocks the run as `no_app`, the reason `checkRun` already uses, and opens no chat.
- **2026-11-10** — Assumed: `.agents/skills/schedule/SKILL.md` stays as it is, because nothing in it names `start`, `progress` or `release`; `run.md` carries the new steps.
- **2026-11-10** — Assumed: the live check opens a real chat through `openSession` in a scratch repo, not a real schedule through the app, because a real run would touch the person's own schedules; the claim and `finish` against the app stay covered by tests until the first real run after the update.
- **2026-11-10** — Assumed: the workspace name comes from 51.9.0 (scheduled-chats-own-workspace), which shipped from another chat while this one built; at the merge this change kept that version (a fresh copy per run, named for the schedule) and dropped its own rename and its spec lines for it.
