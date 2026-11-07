# Your chats hear each other's news

**Status:** planned
**Open questions:** none

## Why

You often work in several chats at once. A choice you make in one chat does not reach the others, so a chat can go on with an old plan, build what another chat already builds, or wait for an answer you already gave. Today the daily keeps each chat moving alone; it does not keep your chats in line with each other.

## What Changes

- **The daily gets one goal for your chats: keep them pointed the same way.** No two chats do the same work or work against each other, each chat gets as far as the context in all your chats allows, and your recent choices weigh most. The daily decides how to reach that goal. It is not held to fixed rules about which choice wins, which news is urgent, or which chat carries what.
  ```mermaid
  sequenceDiagram
    participant A as Chat A
    participant D as Daily
    participant B as Chat B
    A->>D: you: "Use Stripe"
    D-->>B: note: switch to Stripe
    B->>B: changes course
  ```
- **It keeps a short map of your chats.** For each open chat in this project it notes what the chat works on, how far it is, what you decided there and when, what it waits for, and what it already told each chat. A chat that closes stays on the map for 7 days, so a choice you made there still counts. The map lives on this computer, outside the project.
- **It sends notes, and picks when.** A few minutes after a chat has something new, the daily reads it and tells the chats it affects what changed, in which chat, and when. It chooses the moment: straight into a working chat's running step when waiting would waste work, so the chat changes course and keeps what it did, or at the chat's next stop. Nothing stops a step in the middle.
- **A chat waiting on another chat goes on when the blocker is gone.** The map notes what each chat waits for, such as another chat's change going live, a piece of work another chat builds, or your answer in another chat. When that wait ends, the daily tells the waiting chat what landed and where, so it picks up without you. It may also tell the chat being waited on that others wait for it.
- **What it may do, as it judges best.** These are examples, not limits:
  - Tell a chat that a newer choice in another chat changes its plan.
  - Give one chat the work two chats share, and tell the other what to drop.
  - Tell a chat with nothing left to do which chat covers it. That chat passes on what only it has, then waits as covered, so *what's going on?* offers to close it.
  - Answer a chat's question with what you already said in another chat, and name the chat.
  - When it can not tell what you meant, put the question to you in the chat it affects.
- **Some lines it never crosses**, the same as today's check-ins. Risky steps, such as publish, pay, send or delete, wait for you. Nothing closes a chat without your pick. An agent's words never count as your yes. After 5 notes and check-ins in a row with no word from you, a chat waits for you.
- **It is a schedule you can change, with good defaults.** *Keep my chats in line, every 5 minutes* shows in the Inbox's *Schedules* list with your other schedules. There you can pause it or run it now; in any chat you can change how often it runs or its goal text. Each note writes one line to the journal, so *what's going on?* shows it, and *stop check-ins* stops it too.
- **The daily's built-in jobs become default schedules.** WongStack ships a short list of default schedules: the chat line-up and the small wiki tidy after memory saves. The first chat you open adds each one you lack to your schedules, approved on this computer because it comes with WongStack. A default you never changed follows WongStack's updates; one you changed stays yours and waits for your OK, like any schedule. A default you end is never added back.
  ```mermaid
  flowchart TD
    w[WongStack defaults] --> a[your schedules]
    a --> u{you changed it?}
    u -->|no| f[follows updates]
    u -->|yes| y[stays yours]
  ```
- **Quiet runs stay out of the list.** A run that finds nothing to do no longer fills a schedule's run list; the list shows one line with how many quiet runs there were.

Non-goals: no chats in other projects; no change to how you approve a schedule you made; no news from the memory store or the board; no step stopped in the middle; no new service to install.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: a new requirement that gives the daily the goal of keeping watched chats in line, with notes it times by judgment, waiting chats told when their blocker is gone, and the existing safety limits; the check-in requirement takes the person's answer in another chat as settled, recent ones weighing most; the finished-chats requirement also marks covered chats; the journal requirement allows the line-up notes as the one message the daily sends to other chats.

## Impact

- New `.agents/skills/daily/references/schedules.json`: the default schedules (`line-up` every 5 minutes, `wiki-tidy` every 30), each with its brief, check, `minutes` and `place`; `references/sweeps.json` keeps no default timed job.
- New `.agents/skills/schedule/scripts/lib/defaults.mjs` and `schedule.mjs defaults [--unattended]`: adds each default the person lacks, approves that exact version here, updates an untouched one, and skips an edited or ended one; `D ensure` starts it in the background once a day or when the shipped list changes.
- `.agents/skills/daily/scripts/worker.mjs`, `daily.mjs`: the timed-job loop goes; the worker starts when a default schedule hands it a run.
- New `.agents/skills/daily/scripts/line-up.mjs` and `line-up-check.mjs`, brief `references/briefs/line-up.md`: the map, the notes and their delivery.
- `.agents/skills/daily/scripts/daily.mjs`: `line-up`, `map` and `tell` commands.
- `.agents/skills/daily/scripts/stop-check.mjs`, `references/briefs/stop-judge.md`: the judge gets the map's newest choices.
- `.agents/skills/daily/scripts/chief.mjs` `status`: `covered` beside `finished`.
- `app/worker/apps/inbox/schedules.ts` and `app/src/apps/inbox/Schedules.tsx`: a schedule's run list leaves out `no_work` runs and gives their count.
- `.agents/skills/daily/SKILL.md`, `references/chief.md`, `.agents/skills/schedule/SKILL.md`: the note, covered and default-schedule rules, offset by cuts.
- Tests: `scripts/tests/daily-line-up.test.mjs`, `schedule-defaults.test.mjs`, `daily-worker.test.mjs`, `daily-stop-check.test.mjs`, `daily-chief.test.mjs`, `daily.test.mjs`, `app/worker/apps/inbox/schedules.test.ts`, `app/src/apps/inbox/Schedules.test.tsx`.
- Docs: `wiki/development/daily.md`, `wiki/stack/host-schedules.md`; `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account. It needs your company app sign-in, as every schedule does, and sends notes through Paseo. The app's sample data gets one quiet run beside a real one, so the run list's count shows on a preview.

## Decision log

- **2026-11-07** — Asked when a decision in one chat should reach another chat → chose at its next stop, even if the person is in that chat.
- **2026-11-07** — Asked what to do when another chat covers a chat's work → chose: tell it; it does not always wait, it changes its work so nothing overlaps, and the daily decides which chat is best placed to carry each piece; a chat with nothing left hands over and waits.
- **2026-11-07** — Asked whether the daily answers a question already answered in another chat → chose yes, newest answer wins, never a risky step.
- **2026-11-07** — Asked which chats to keep in line → chose this project only.
- **2026-11-07** — Asked, on the plan: should the newest choice always win, and should some notes interrupt → chose: newest wins only between choices on the same thing, a narrower one holds in its own place; an urgent note steers a working chat at once, others wait for its next stop, and no note stops a step in the middle.
- **2026-11-07** — Assumed: the map keeps a closed chat's choices for 7 days, like the run logs, because a decision made in a chat that is now closed still matters to the open ones.
- **2026-11-07** — Assumed: the line-up reads the chats directly, not the memory store, because the store's capture runs later and the line-up needs the last few minutes.
- **2026-11-07** — Asked, on the plan, whether *newest wins only on the same question* is too narrow → chose: make it the daily's judgment; give it the end goal and let it do what it thinks is right, with no fixed rule on which choice wins, which note is urgent, or who carries what. This replaces the two rules above on newest-wins scope and urgency.
- **2026-11-07** — Asked, on the plan, that chats waiting on other chats hear when the blocker is gone → made it its own part of the goal: the map records each chat's wait, and the daily tells the waiting chat when it ends.
- **2026-11-07** — Assumed: the fixed limits stay the check-ins' own: risky steps wait for the person, no close without a pick, an agent's words are never the person's yes, the 5-in-a-row streak, and a journal line per note, because these are the safety rules the person kept every time and they stop a loop while away.
- **2026-11-07** — Assumed: the one-time-news and one-pending-note rules leave the code; the map records what each chat was told and the daily judges repeats, because they were judgment calls, and the streak still stops runaway notes.
- **2026-11-07** — Assumed: every note is sent with Paseo's `steer`, an idle chat's too, because a sender that is not an agent gets `interrupt` by default, and no note may stop a step in the middle.
- **2026-11-07** — Assumed: a note starts `From the daily:`, and the stop check does not count it as the person's message, so a note does not pause check-ins.
- **2026-11-07** — Assumed: the turns `D line-up` showed a run count as read for 15 minutes, so the 5-minute check does not start a second run while the first still reads.
- **2026-11-07** — Assumed: the unused *Brief before you start an agent* section of `chief.md` was cut, to offset the added skill words.
- **2026-11-07** — Asked, during the build, that checking the chats be a schedule in the app's database, adjustable, with this as the default, and elegant → chose: WongStack ships default schedules; the line-up is one, every 5 minutes, running only when a chat changed.
- **2026-11-07** — Asked whether the wiki tidy also becomes a default schedule → chose yes, so both built-in jobs work one way and the timed-job list goes away.
- **2026-11-07** — Asked whether a run that finds nothing to do shows in a schedule's run list → chose hide them, with a count.
- **2026-11-07** — Assumed: a shipped default is approved on this computer when added, because it comes with WongStack's code, as the move-in approves routines the person saved in the repo; any edit makes a new version that waits for the person's OK.
- **2026-11-07** — Assumed: a default the person never changed takes WongStack's new version at an update, and one they changed or ended is left alone, because an update should not undo the person's own setting.
- **2026-11-07** — Assumed: an install's `{"id": "wiki-tidy", "off": true}` adds that default paused, because the person turned it off on purpose.
- **2026-11-07** — Assumed: a default counts as untouched only when it is on and its version and time both match what this computer added, because the version leaves out the time, and an update must not undo a time the person set.
- **2026-11-07** — Assumed: the line-up's `minIntervalMs` is 150000 (half the 5-minute gap), not 4 minutes, because the defaults reuse the move-in's conversion unchanged.
- **2026-11-07** — Assumed: when a schedule shows fewer than ten runs, `quiet` counts all its quiet runs, because the short list already holds every run that did work.
- **2026-11-07** — Assumed: `schema/seed.sql` needs no new row, because its sales digest already has a `no_work` run beside a started one.
- **2026-11-07** — Assumed: the wiki tidy, now a schedule run, counts in the 3-run limit, as every schedule run does.
- **2026-11-07** — Assumed: a timed job's *Needs you* chat goes with the loop; a failed schedule run shows in the app's run list.
- **2026-11-07** — Assumed: `hasJobs` counts the defaults this computer added (`defaults.json`), not every approved schedule, because the helper's hand-over already starts the worker for any other.
- **2026-11-07** — Assumed: an install's own sweeps entry with a default's id replaces that default's definition, as it replaced the built-in job.
- **2026-11-07** — Assumed: a chat stops being covered when the person writes in it after the note, or when the line-up run clears it, because new work from the person means it is no longer covered.
- **2026-11-07** — Assumed: the once-a-day *timed jobs wait* journal marker moved to `<state>/waiting.json`, with the `done` file gone.
- **2026-11-07** — Check: the worker tests for the timed-job loop (due times, the loop's dry run, a timed job's check failing two times, an install's timed job replacing a default) are removed with the loop; the copy tests moved to `daily-schedule-runs.test.mjs` as `place: copy` schedule runs, and the add, update and keep rules are in `schedule-defaults.test.mjs`.
- **2026-11-07** — Asked whether to publish before the live try in Paseo, which needs the new code on the main copy → chose publish, then try it live and fix what fails.
