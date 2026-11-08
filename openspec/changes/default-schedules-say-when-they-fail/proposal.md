# Default schedules setup says when it fails and tries again

**Status:** ready-to-ship
**Branch:** default-schedules-say-when-they-fail
**Open questions:** none

## Why

At a chat start, the daily sets up your [default schedules](../../../wiki/stack/host-schedules.md#default-schedules) (*Keep my chats in line* and *Wiki tidy*) in the background. Today it marks the day as done before it tries. When the try fails, nothing tells you and nothing tries again until the next day. On 2026-11-08 this left one person with no default schedules and no journal line; a setup run by hand then worked at once.

## What Changes

1. The daily counts the default schedules as set up only after a try works. A try that fails, or stops with no result, is tried again at a chat start about an hour later. A new list of defaults, or check-ins going off or on, starts a try at once, as today.
   ```mermaid
   flowchart TD
     A[Chat start] --> B{Done today?}
     B -- no --> C{Tried within an hour?}
     C -- no --> D[Try in the background]
     D -- works --> E[Mark today done]
     D -- fails --> F[Journal the reason]
   ```
2. Each failure writes one line in your [journal](../../../wiki/development/daily.md#the-journal), with its reason, so *what's going on?* tells you. The same reason gets one line a day, not one line for each try.
   ```text
   Default schedules not set up:
     wiki-tidy: invalid.
     Trying again in an hour.
   Default schedules not set up:
     the last try stopped with no result.
     Trying again in an hour.
   ```
3. *Stop check-ins* and *start check-ins* still work when the background setup can not start.

**Non-goals:** the move of old routines to the app keeps its once-a-day start; a failure opens no *Needs you* chat; the worker's restart after a code change stays as it is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: *The daily's own jobs are default schedules* adds that a day counts as done only after a try works, and that a failed or silent try is journaled with its reason and tried again later the same day.

## Impact

- `.agents/skills/daily/scripts/daily.mjs`: `startDefaults` no longer writes the day and stamp before the child runs; it records a `tried` time, waits an hour after a failed or silent try, and journals a try that stopped with no result. New exported helpers `defaultsStamp`, `defaultsDone`, `defaultsFailed`. `startMoveIn` writes its own marker, as before. `checkins off`/`on` catch a failed start.
- `.agents/skills/schedule/scripts/schedule.mjs` (`defaults`): writes the day and stamp only after every default worked; an unattended run journals a throw or a failed default with its reason.
- Tests: `scripts/tests/daily.test.mjs`, `scripts/tests/schedule-defaults.test.mjs`.
- Docs: `wiki/stack/host-schedules.md#default-schedules`; `CHANGELOG.md` (`patch`).
- Local state only (`defaults.json` in the person's private state folder); no app or database change.

## What the build needs

Nothing.

## Decision log

- **2026-11-08** — Ported from an install that shipped this fix and sent it upstream by [contributing upstream](../../../wiki/contributing.md), because the daily and schedule skills are WongStack's and every install has the same silent failure.
- **2026-11-08** — Assumed: a failed or silent try is tried again after one hour, at the next chat start, because chat starts are frequent and an hour keeps a broken setup from starting a child at every chat.
- **2026-11-08** — Assumed: the same failure reason writes one journal line a day, because the no-sign-in case would otherwise write a line every hour.
- **2026-11-08** — Assumed: a child that dies with no word is journaled at the next try as *stopped with no result*, because a dead child can not journal itself.
- **2026-11-08** — Assumed: a run by hand (attended) that works also marks the day done, and one that fails only shows its error, because the person already sees it.
- **2026-11-08** — Assumed: the move-in start keeps its current marker, because only the defaults were seen to fail; it has the same shape and can take the same fix later.
- **2026-11-08** — Assumed: a running try records its stamp, a changed stamp starts a new try at once, and a run marks done only the stamp it started with, because check-ins off or on must start a try at once.
- **2026-11-08** — Assumed: `startDefaults` stamps a try from the list of the copy whose `schedule.mjs` it starts, because a worktree chat's own list can differ from the main checkout's and the try would then never count as done.
- **2026-11-08** — Assumed: a `patch` release, because it fixes a fault and adds no feature.
