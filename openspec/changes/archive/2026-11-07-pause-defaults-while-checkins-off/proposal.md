# Default schedules wait paused while check-ins are off

**Status:** ready-to-ship
**Branch:** sordid-buffalo
**Open questions:** none

## Why

When you turn check-ins off, *Keep my chats in line* still comes due every 5 minutes, and *Wiki tidy* every 30. Neither can start, so each fills its run list with *didn't start, check-ins are off*. On one computer with check-ins off since 2026-11-04, the line-up added a line like that every 5 minutes.

## What Changes

- **Turn check-ins off, and WongStack's two default schedules pause on this computer.** *Keep my chats in line* and *Wiki tidy* show *Paused* in the Inbox's *Schedules* list, and no new *didn't start* lines come in. Turn check-ins on, and the two go on again. A computer where check-ins are already off pauses them at its first chat after the update.
  ```mermaid
  stateDiagram-v2
    direction LR
    On: Runs on time
    Paused: Paused
    On --> Paused: stop check-ins
    Paused --> On: start check-ins
  ```
- **A default schedule you set yourself stays as you set it.** If you paused, changed or ended one, check-ins never pause or resume it. If you resume one while check-ins are off, it stays on until you pause it again.
  ```mermaid
  flowchart LR
    s[stop check-ins] --> q{default untouched<br/>and running?}
    q -->|yes| p[pause it]
    q -->|no| l[leave it]
  ```

Non-goals: no change to schedules you made yourself, which still show *didn't start, check-ins are off* while check-ins are off; no new screen; no change on your other computers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: the default-schedules requirement adds that an untouched default waits paused on that computer while check-ins are off, and goes on when they go on.

## Impact

- `.agents/skills/schedule/scripts/lib/defaults.mjs` `addDefaults`: reads the off file; pauses an untouched, running default when check-ins go off, resumes one it paused when they go on, and keeps the mark in `<state>/defaults.json`.
- `.agents/skills/daily/scripts/daily.mjs`: `startDefaults` stamps the off state with the list, so `D ensure` reruns the defaults when it flips; `D checkins off|on` starts it at once.
- Tests: `scripts/tests/schedule-defaults.test.mjs`, `scripts/tests/daily.test.mjs`.
- Docs: `wiki/stack/host-schedules.md`, `wiki/development/daily.md`; `CHANGELOG.md` (`minor`).

## What the build needs

Nothing from you: no key, no account. Pausing uses your company app sign-in, as every schedule does.

## Decision log

- **2026-11-07** — Asked whether the wiki tidy also waits paused while check-ins are off → chose pause both default schedules.
- **2026-11-07** — Assumed: pause the defaults rather than hide *didn't start* runs as quiet, because the request asks for the line-up to wait paused, and a paused schedule makes no runs at all.
- **2026-11-07** — Assumed: check-ins pause or resume a default only when they flip, not at each daily pass, because a default the person resumes while check-ins are off is their choice and must stay on.
- **2026-11-07** — Assumed: schedules the person made stay as they are, because check-ins off already reports their runs, and pausing them would touch the person's own schedules.
- **2026-11-07** — Assumed: a flip where any default fails keeps the old off state, so the next daily run tries the flip again, because otherwise a default that failed to pause stays running until the next flip.
- **2026-11-07** — Assumed: a new or updated default is approved and recorded before its check-ins pause, marked `owed` until the pause lands, because a failed pause otherwise left it running and read as the person's; a plain mark held on while off means the person resumed it, so it can not carry the retry.
- **2026-11-07** — Assumed: `D checkins on` starts the defaults run itself, though the worker start after it would too, because that start does nothing in a background run, and the same stamp skips a second start.
- **2026-11-07** — Assumed: the live check ran the pause on wongos-16gb from this branch and left check-ins off, because turning them on would change the person's own setting; the resume is checked by tests only.
- **2026-11-07** — Assumed: archived for /ship as 50.10.0, because the build, review and live pause check were done.
