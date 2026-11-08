# Design

## Context

`D ensure` runs at each chat start. `startDefaults` (`.agents/skills/daily/scripts/daily.mjs`) calls the shared `startSchedule`, which writes `{day, stamp}` to `defaults.json` and then starts `schedule.mjs defaults --unattended` detached with `stdio: 'ignore'`. The stamp is a hash of `.agents/skills/daily/references/schedules.json`, with `:off` added while check-ins are off. So the marker says *started today*, not *done today*.

In the child, `defaults()` (`.agents/skills/schedule/scripts/schedule.mjs`) journals only a failed `connect`/`approver`. `addDefaults` (`.agents/skills/schedule/scripts/lib/defaults.mjs`) catches each default's error into a `failed` result, which goes to the ignored stdout. A throw elsewhere, or a child that dies, leaves no trace. On one computer on 2026-11-08 the state was `day` today, the current `stamp`, `added: {}`, and no journal line, which fits either.

## Goals / Non-Goals

**Goals:** the marker means *done*; every unattended failure is journaled with its reason; a failed or silent try is tried again the same day without a child at every chat start.

**Non-Goals:** a *Needs you* chat for this kind; the worker restart logic; `startMoveIn`'s once-a-day marker, which has the same shape but is left for a later change.

## Decisions

### `defaults.json` keeps the outcome, not the start

```text
{ added, off,            // unchanged
  day, stamp,            // the last day and stamp a try set up every default
  tried: { at, stamp },  // when D ensure started the try now running, and its stamp; the child deletes it
  failed: { day, stamp, reason, at } }   // the last failure, deleted on success
```

- `day`/`stamp` keep their meaning for readers (`hasJobs` reads only `added`), so an existing file needs no migration. A file whose `day`/`stamp` were written by the old start counts as done for that day; the next day tries again.
- Alternative: a separate `defaults-try.json`. Rejected: two files for one state, and `addDefaults` already rewrites `defaults.json` with a read-merge-write.

### When `startDefaults` starts a try

In order, with `RETRY_MS = 60 * 60e3`:

1. `day` and `stamp` match today → no try.
2. `tried` is less than `RETRY_MS` old and has the current stamp → no try (one runs). A try of another stamp does not hold back a changed stamp: *stop check-ins* during a try starts a new one at once.
3. `tried` is older → the child stopped with no result: record a failure with reason *the last try stopped with no result*.
4. `failed` has today's `day`, the current `stamp`, and is less than `RETRY_MS` old → no try. A changed stamp (a new list, check-ins off or on) skips this wait.
5. Write `tried = { at: now, stamp }`, then start the child as today.

`startSchedule` loses its marker write; `startMoveIn` writes its own marker before the start, so move-in behaves as today.

### One helper records the outcome

Exported from `daily.mjs` next to `defaultsFile`, used by `startDefaults` and by the child:

- `defaultsStamp(stateDir, list, off)`: the stamp `startDefaults` computes today. The child reads it, with the off switch, before it starts, and marks that stamp: a stamp that changes during the run is not marked done, because the run did not apply it.
- `defaultsDone({ stateDir, timezone, stamp, now })`: writes `day`, `stamp`; deletes `failed`, and `tried` unless it is a newer try of another stamp.
- `defaultsFailed({ stateDir, timezone, stamp, reason, line, now })`: deletes `tried` by the same rule; writes `failed`; adds a `defaults` journal line unless `failed` already held the same `reason` for the same `day`. `line` defaults to `Default schedules not set up: <reason>. Trying again in an hour.`; `addLine` caps it at 300 characters.

Each helper reads, merges and writes `defaults.json`, as `addDefaults` does, so it keeps `added` and `off`.

### The child's outcome

In `defaults()`:

- **Dry run:** no outcome.
- **No sign-in, unattended:** `defaultsFailed` with reason `no_sign_in` and today's line (*Default schedules wait: sign in …*), then return `{ skipped: 'no_sign_in' }`. The one-line-a-day rule replaces today's once-a-day start.
- **`addDefaults` returns:** any result with `state: 'failed'` or `'refused'` → unattended, `defaultsFailed` with `"<key>: <reason>"` joined by `; `. None → `defaultsDone`, attended or not.
- **A throw, unattended:** `defaultsFailed` with `error.message`, then return `{ failed: reason }`. Attended, it still throws and changes no marker: the person sees it.

`refused` counts as a failure because the default is missing; its reason comes from `defaultDefinitions`.

### `checkins off`/`on`

Wrap the `defaults()` calls in `commands` (`daily.mjs`) in `try/catch`, as `ensure` does: the check-ins switch must not fail because the background start failed.

## Risks / Trade-offs

- **Two copies of the code.** A chat in a worktree runs its own `daily.mjs`, but starts the main checkout's `schedule.mjs`. `startDefaults` reads the stamp from that main checkout's `references/schedules.json`, so both halves mark the same stamp. Until the main checkout pulls this change, its old `schedule.mjs` never clears `tried`: a worktree chat then starts the old setup about once an hour, with one *stopped with no result* line a day. Pulling the main checkout ends it.

- **Two chat starts at once** can both pass step 2 and start two children. Today's start has the same race; `addDefaults` reads the app before it saves, so a second child finds `same`.
- **A child that runs longer than an hour** would be counted as stopped and a second started. The run is a few app calls; an hour is a wide margin.
- **A refused default keeps retrying hourly**, with one journal line a day. That is the point: a missing default is a fault to see.
