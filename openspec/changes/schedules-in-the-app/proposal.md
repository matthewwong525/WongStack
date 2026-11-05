# Keep every schedule in the app

**Status:** in-progress
**Branch:** move-schedules-to-database
**Open questions:** none

## Why

Today you have two separate ways to schedule work. Morning routines live in your daily settings file, and a computer that was off at 8:00 skips them. Other schedules live in their own files in the repo, with their progress in a hidden file on one computer. Each new or changed schedule needs a publish. The app already has a good clock, so all schedules should live there, in one place.

## What Changes

- **Every schedule lives in your app, in one list.** Morning routines, weekly and monthly jobs, timed background jobs and one-time tasks all live in the app's database. The app stores what each one does, when it runs, whether it is on, its progress and every run. You no longer keep a routines list in your daily settings file or a schedule file in the repo.
  | | Today | After |
  |---|---|---|
  | Morning routines | your daily settings file | the app |
  | Other schedules | a file in the repo, progress on one computer | the app |
  | A new or changed schedule | a publish | saved in seconds |
  | Computer off at 8:00 | the routine waits for the worker, else it is skipped | it runs once when the computer is back, if still in time |
  | Where you see them | ask a chat | the Inbox, and any chat |

- **You make or change a schedule in any chat, and your computer approves it once.** You say *check the orders every weekday at 9*. The chat shows what the schedule will do and asks for your OK. Your yes saves it in the app and marks that exact version as approved on this computer. Your computer runs only a version you approved on it. A schedule changed somewhere else, or a team schedule, waits for your OK on each computer before it runs. Someone who breaks into the app can not make your computer run new instructions.
  ```mermaid
  sequenceDiagram
    participant You
    participant Chat as Chat on your computer
    participant App
    You->>Chat: check the orders every weekday at 9
    Chat->>You: this is what it will do. OK?
    You->>Chat: OK
    Chat->>App: save the schedule
    Chat->>Chat: note this version as approved
    App-->>Chat: 9:00 Monday: look now
    Chat->>Chat: same version as approved? start it
  ```

- **Each person has their own schedules.** Each schedule belongs to the person who made it. You see, change and run only yours, under your own sign-in, on your own computer. A teammate gets their own schedules and the Schedules view too, even with no week board. The owner can make one schedule for everyone: each person then gets their own copy, which they approve on their own computer and can pause for themselves. On a computer two people share, each person's OKs are kept apart, so one person's OK never runs the other's schedule.
  | | Owner | Teammate |
  |---|---|---|
  | Sees | own schedules | own schedules |
  | Makes for self | yes | yes |
  | Makes for everyone | yes, one copy each | no |
  | Approves | on own computer | on own computer |

- **A late run still starts once, and you see each run.** A run due while your computer is off starts once when it comes back, if it is still in time. A morning routine stays in time until the end of its day. A weekly or monthly routine that you set to catch up stays in time until its next run. A run that is too late shows as *Missed*. A schedule never runs twice for one due time.

- **The Inbox gets a Schedules list again, next to Reviews.** Each schedule shows what it does, when it runs next, and how its last run went. You can pause it, resume it, run it now, or cancel a run that waits. A tap opens its last ten runs and its instructions. A schedule that waits for your OK says so, with the computer's name. You make or change a schedule in a chat, not on this screen.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><span class="tag-outline">Day</span><span class="tag-outline">Week</span><span class="tag-outline">Reviews</span><span class="tag">Schedules</span></div>
    <div class="card col gap">
      <div class="row gap"><h3 class="grow">Find the news</h3><span class="tag">On</span></div>
      <div class="muted">Research my topics and email at most three checked items</div>
      <div class="muted">Every day at 8:00 · next run tomorrow 8:00</div>
      <div class="muted">Last run today 8:00 · started</div>
      <div class="row gap"><span class="grow"></span><button class="btn-ghost">Pause</button><button class="btn-primary">Run now</button></div>
    </div>
    <div class="card col gap">
      <div class="row gap"><h3 class="grow">Plan the week</h3><span class="tag-outline">Needs your OK</span></div>
      <div class="muted">Every Monday at 8:00 · changed in a chat on another computer</div>
      <div class="muted">Say OK in a chat on wongos-16gb before it runs there.</div>
    </div>
    <div class="card col gap">
      <div class="row gap"><h3 class="grow">Monthly books close</h3><span class="tag-outline">Paused</span></div>
      <div class="muted">The 1st of each month at 8:00</div>
      <div class="row gap"><span class="grow"></span><button class="btn-primary">Resume</button></div>
    </div>
  </div>
  ```
  A sketch, not a picture: this step changes no code. The screen comes back from before the week board, with the *Needs your OK* tag added.

- **Your schedules move to the app by themselves at the next update.** Right after the update goes live, the assistant copies each routine and schedule to the app. It approves them on your computer, because you already approved them when you saved them in the repo. Then it removes the old lists in a small save. Nothing runs twice. *Reconcile the books* and *Monthly books close* look like the same job, so the move shows both and asks which to keep. In your repos today, these move:
  ```text
  WongOS      Find the news, Frisbee payments,
              Carol planning, Frisbee league
  ClaymooApp  Standup, Review ads, Reconcile
              the books, Make a new ad, Review
              production, Plan the week, Recap
              the week, Monthly books close
  ```

- **Some things stay as they are:** morning add-ons, check-ins and the small wiki tidy. They are not schedules that you make. Schedules that already run in Paseo stay there until you ask to move them, as today.

**Non-goals:** nothing runs while every computer is off; no cloud runner returns. You can not write or change a schedule's instructions on the Inbox screen. Teammates still see only their own schedules.

## What the build needs

- **Nothing.** The first real test of the app's clock is ClaymooApp's *Monthly books close*, due on Nov 9; the build checks one run on the preview and one after the update goes live.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-schedules`: a routine's definition, instructions, progress and runs live in the company app, not in a repo file; a computer runs only a version approved on it; a finite goal is a schedule with an end, not an OpenSpec change; existing repo routines and daily routines move at the update.
- `live-line`: the computer reads a schedule's instructions from the app and runs them only when that exact version was approved on that computer.
- `daily-routine`: the settings file no longer holds routines or timed jobs; the morning start runs add-ons only; changing a routine goes through the schedule flow; the install's own job list keeps event jobs only.
- `inbox`: a Schedules view lists the person's own schedules, for teammates too, with pause, resume, run now and their history.
- `openspec-workflow`: the scheduled-work goal record and its lifecycle rules retire.
- `change-loop`: plan may save a schedule to the app after an OK instead of writing `schedules/`; the record-only schedule publish retires.

## Impact

- D1: a new migration adds to `schedules` (instructions, kind, place, run settings, progress, approval state per computer) — additive only.
- Worker: `app/worker/apps/inbox/schedule-put.ts`, `schedules.ts`, `schedule-control.ts`, `claim.ts`, `run-result.ts`, `schedule-store.ts`; a new progress route.
- Inbox UI: a restored `app/src/apps/inbox/Schedules.tsx` (from before 45.0.0), `App.tsx`, `week/Parts.tsx` (`ViewToggle`), `api.ts`.
- Helper: `.agents/skills/schedule/scripts/lib/app-runs.mjs` (read the schedule from the app, check the local approval list), `.agents/skills/hand-over/scripts/reply-link.mjs` (the helper's rounds).
- Schedule skill: `schedule.mjs`, `lib/records.mjs`, `lib/progress.mjs`, `lib/hosts.mjs`, `lib/move.mjs`, the references; retires `schedules/` and the `scheduled-work` OpenSpec schema.
- Daily skill: `daily.mjs` (no `checks`), `worker.mjs` (no timed `sweeps` from installs; background runs handed over by the helper), `config.mjs`, `references/example.json`, `wiki/development/daily.md`.
- Save and plan: `.agents/skills/save/references/schedule-records.md` and `scripts/schedule-record.mjs` retire; `wiki/development/the-change-loop.md` step limits drop `schedules/`.
- Wiki: `wiki/stack/host-schedules.md`, `wiki/stack/live-line.md`, the payload manifest, `scripts/retired-names.json`.

## Decision log

- **2026-11-05** — Asked whether daily routines and timed jobs move onto the app's clock → chose one way: all of them move to the app.
- **2026-11-05** — Asked where each schedule's instructions live → chose the app's database, with each computer approving a new or changed version once.
- **2026-11-05** — Asked where the person sees their schedules → chose a Schedules list in the Inbox, next to Reviews; making and changing stays in a chat.
- **2026-11-05** — Asked, after the plan, whether schedules are per person → chose yes, for everyone: each person owns, sees and approves only their own, teammates included, with OKs kept apart on a shared computer.
- **2026-11-05** — Assumed: the owner can make a copy for each teammate but can not see or change a teammate's copy after it is made, because each person sees only their own schedules.
- **2026-11-05** — Assumed: approval happens only in a chat on that computer, never by a tap in the app, because a tap is something a break-in could also send.
- **2026-11-05** — Assumed: each computer keeps its own list of approved versions, and a new computer asks again, because the app must not be the one that says what is approved.
- **2026-11-05** — Assumed: the move approves each existing routine on the computer that runs it, because the person already approved it by saving it in the repo.
- **2026-11-05** — Assumed: a team routine becomes one schedule per person, which the owner makes and each person approves on their own computer, because each person's computer runs its own copy.
- **2026-11-05** — Assumed: a finite goal becomes a schedule with an end, and the `scheduled-work` OpenSpec schema retires, because no install uses it and one way to schedule was chosen.
- **2026-11-05** — Assumed: the app's clock comes first, as today, and Paseo stays the fallback where the helper can not run; Paseo and old cloud schedules stay until moved, because moving them is already a separate, safe step.
- **2026-11-05** — Assumed: morning add-ons, check-ins and the small wiki tidy stay on the daily worker, because they are part of the product, not schedules a person makes.
- **2026-11-05** — Assumed: a morning routine set to skip stays in time until the end of its day, and one set to catch up stays in time until its next run, because that is how the daily treats them today.
- **2026-11-05** — Assumed: no cloud runner, so nothing runs while every computer is off, because WongStack removed its cloud runner earlier and the computer does the work.
- **2026-11-05** — Check: `scripts/tests/schedule-delivery.test.mjs` deleted, because the record-only publish it tested (`save/scripts/schedule-record.mjs` and `ship.mjs --schedule-record`) retires; `schedule-retirement.test.mjs` checks the route is gone and `schedule-cli.test.mjs` covers saving a schedule in the app.
- **2026-11-05** — Check: `scripts/tests/schedule-lifecycle.test.mjs` deleted, because `lib/lifecycle.mjs`, the local goal runner it tested, retires with goal records; the app's routes and their Worker tests now hold at-most-once runs, the end of a goal and the progress claim.
- **2026-11-05** — Check: `scripts/tests/schedule-schema.test.mjs` deleted, because the `scheduled-work` OpenSpec schema it tested retires; `schedule-retirement.test.mjs` checks it is gone.
- **2026-11-05** — Assumed: the progress route takes one first copy with no run, while no run holds the progress and none was written, so the move can carry an old record's progress; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: a routine's kept `thinking` setting moves with it, because ClaymooApp's settings file holds one and the move must not drop it; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: a repo schedule moves when any email in the person's settings file owns it, because ClaymooApp's *Monthly books close* is owned by an email that the sign-in does not use; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: two jobs are a likely pair only when they share a weekday, and an nth-weekday cron such as `0 9 * * 1#2` counts as monthly, because the dry run paired a Monday job with a Friday job and called *Monthly books close* weekly; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: a saved schedule may use an nth-weekday cron (`1#2`, the second Monday) with the day of month `*`, as ClaymooApp's copy already allows, and the move reports a record it can not read, because *Monthly books close* uses one and was otherwise left out without a word; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: the move removes a team file's moved routines when the owner runs it, and the update note tells the owner so, because a team file left in place makes every teammate's computer try the move each day; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: a routine whose `activeFrom` date is still ahead moves paused, and the move says to resume it on that date, because the app's clock has no start date and the routine must not start early; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: with check-ins off, a background schedule's run shows as not started with the reason *check-ins are off*, because stopping check-ins should stop background work and the person must see why; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: the preview checker sees Day and Week like the owner, because the board route already lets the checker in and `/verify` checks the board; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: a one-time task with no goal ends when its run starts, because the app gets no later success signal from a chat run; a goal still ends only when its run verifies it; inside `/ship`, a safe pick.
- **2026-11-05** — Assumed: the check that ClaymooApp's *Monthly books close* runs on 2026-11-09 leaves the task list and becomes a follow-up after ClaymooApp's update, because it can only happen after this change is live in another repo; inside `/ship`, a safe pick.
- **2026-11-05** — Built and reviewed: a second look found six bugs (the `until` text outside the version, a team copy's folder, a paused routine coming back on, worktree folders in the move, one-time tasks never ending, *Needs your OK* staying after an OK), all fixed with tests; the preview check (7.2) is next.
