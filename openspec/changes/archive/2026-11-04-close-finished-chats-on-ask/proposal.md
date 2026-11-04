# Close finished chats only when you pick them

**Status:** ready-to-ship
**Branch:** daily-chat-auto-close
**Open questions:** none

## Why

The daily's helper closes a chat by itself 15 minutes after its work goes live. A finished chat already closes itself, so a live chat that is still open is usually one you kept open: for a follow-up, to check the result, or after a break. Closing is your decision. What a chat learned already reaches memory and the wiki without a close, through the background capture and the small wiki tidy.

## What Changes

- **The helper stops closing chats by itself.** A chat whose work is live stays open until you close it, mark it Done on the board, or it sits idle for 3 days (the tidy-up, as today). The small wiki tidy after each memory consolidation stays.
- **The Daily chat shows finished chats when you ask.** Ask *what's going on?* and it marks each chat whose work is live and that has nothing new. It asks which ones to close. Each chat you pick gets `/close`: it saves what it learned, adds what lasts to the wiki, and closes. A chat you do not pick stays open.
  ```text
  You: what's going on?

  Daily:
  - Fix the invoice total: finished, live
  - Add the Notes page: finished, live
  - Move old installs' knowledge: waits for you

  Close the finished ones?
  [ Both ]  [ Fix the invoice total ]
  [ Add the Notes page ]  [ Keep them open ]
  ```

Non-goals: no change to `/close`, to a chat closing itself when its work is done, to the board's Done, to the 3-day tidy-up, or to the small wiki tidy. The morning reply does not list finished chats.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the helper's default job list has only the wiki tidy; the automatic wrap-up goes; the Daily chat's *what's going on?* marks finished chats and sends `/close` only to the ones the person picks.

## Impact

- `.agents/skills/daily/scripts/wrap-up.mjs`: removed; its folder and merge check moves to a small read-only helper that `status` uses.
- `.agents/skills/daily/references/sweeps.json`: the `wrap-up` entry goes.
- `.agents/skills/daily/scripts/worker.mjs`: the built-in job path (`do`, `BUILTINS`, `builtins`) goes, as wrap-up was its only user.
- `.agents/skills/daily/scripts/todos.mjs`: the board's Done no longer reads the wrap-up record.
- `.agents/skills/daily/scripts/chief.mjs`: `status` rows gain `finished`.
- `.agents/skills/daily/SKILL.md`: the *What's going on?* line offers to close finished chats.
- Docs: `wiki/development/daily.md`, `wiki/development/the-change-loop.md`.
- Tests: `scripts/tests/daily-wrap-up.test.mjs` removed; `daily-worker`, `daily`, `daily-todos` and the status test updated.
- `CHANGELOG.md` (`minor`).

## Decision log

- **2026-11-04** — Asked what should happen to the daily's automatic close of finished chats → chose remove it, and list finished chats when the person asks *what's going on?*, closing only the ones they pick; the board's Done still closes.
- **2026-11-04** — Assumed: the 3-day tidy-up and the small wiki tidy stay, because the person asked only to stop the 15-minute close.
- **2026-11-04** — Assumed: a chat counts as finished when its work is live at its last commit, its folder has nothing new, it is stopped, and it has no open question; the 15-minute quiet rule goes, because the person picks from the list, so a chat they are still in costs nothing.
- **2026-11-04** — Assumed: a picked chat gets `/close`, not a hard archive, so it still saves what it learned; the Daily chat sends it as the person's own answer, through the command that already relays one.
- **2026-11-04** — Assumed: the list shows only on *what's going on?*, not in the morning reply, because the person named that request.
- **2026-11-04** — Assumed: the built-in job path in the worker goes with wrap-up, because wrap-up was its only user, and code with no user is code to keep up.
- **2026-11-04** — Assumed: an install whose own job list turns `wrap-up` off keeps working with no hand step, because an `off` entry that names no default job is ignored.
- **2026-11-04** — Asked how to pass the attachments check, which wanted two attachments already checked today to set `checked:` to today → chose to fix the check. The second look found that a rule on today's date fails a re-run the next day, and a rule on the base commit's date passed edits made days later, so the rule compares `checked:` with the day of the source's own edit on the branch.
- **2026-11-04** — Check: `scripts/check-attachments.mjs` no longer fails a changed source when its attachment's `checked:` is the day the branch last edited that source, because a second change that day can not set a newer date; a change made the same day as an earlier check is no longer flagged.
- **2026-11-04** — Check: `scripts/tests/daily-wrap-up.test.mjs` is deleted with the wrap-up job it tested, because that job is gone; its finished-chat cases move to `scripts/tests/daily-finished.test.mjs`.
- **2026-11-04** — Assumed: the live check moves out of the tasks to after publish, because the Daily chat and the helper run the published code, and `D status` from this branch showed no watched chats to mark.
- **2026-11-04** — Archived for publish as 45.9.0; review found two problems in the attachments check fix, both fixed.
