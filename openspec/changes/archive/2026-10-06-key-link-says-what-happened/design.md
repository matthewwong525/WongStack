# Design

## Context

See proposal.md for why. In `.agents/skills/hand-over/scripts/hand-over.mjs`:

- The first keyed `GET /keys` writes an `opened` marker file. `open` reads it to decide whether a live key link gives way. `clearLink()` deletes it when the link ends, and `result.json` never carries it.
- `givesWay(pid)` signals the old watcher, which ends as `closed`. The new `open` then deletes `result.json` and, seconds later, writes its own `state.json`.
- `wait` reports the old link two ways: from `result.json` when it polls before the new `open` deletes it, or from `gaveWay()`'s fixed `closed` report after. Neither path knows who signalled.

## Goals / Non-Goals

**Goals:**

- `wait` prints whether a key link was opened, for every result its watcher records.
- `wait` prints which workspace's `open` took an unopened key link's place, on both report paths.

**Non-Goals:**

- Any change to when a link gives way, to the page, or to the workspace notification's message.

## Decisions

1. **`opened` rides in the key link's result.** `watch()`'s `finish` adds `opened: existsSync(FILES.opened)` to the outcome when the link is a key link, before `clearLink()` runs. `gaveWay`'s fixed report passes `opened: false`: only an unopened link gives way. `report()` prints `HANDOVER_OPENED=yes|no` when `opened` is a boolean, after `HANDOVER_APP_KEYS`. A form or password result has no `opened`, so no line. *Alternative:* mark every link opened on its first keyed request. Rejected: the password page sends its key only on a save, so its answer would be wrong.
2. **The newer `open` leaves a record before it signals.** `givesWay` writes `replaced.json`, `{ completionId: <the old link's>, by: <basename of the new opener's cwd> }`, then signals. The record is keyed by the old link's completion identity, so a later link never reads it as its own. `clearLink()` does not delete it, since the old watcher clears its files before `wait` may read; the next give-way overwrites it. *Alternative:* have `wait` read the new link's `state.json`. Rejected: that file is written only after the new tunnel registers, seconds after the old `wait` has returned.
3. **`report()` reads the record.** It prints `HANDOVER_REPLACED_BY=<name>` when the record's `completionId` equals the result's, so both `wait` paths get it with one lookup. Line breaks in a folder name become spaces: the output is one fact per line.
4. **The folder name is the workspace name.** A Paseo workspace's folder is the name its chat list shows (`prolific-bumblebee`). In a single checkout it is the project's folder, which still says *another chat*.
5. **The wiki tells the agent what to say.** `wiki/development/secrets.md` step 4 owns the three replies: never opened, opened and left, another chat's link. `wiki/stack/api-keys.md` gains one plain sentence. `browsing.md` and `passwords.md` stay as they are: what they say about giving way is still true.

## Risks / Trade-offs

- [A reader parsing `wait` by line position breaks] → every reader in the repo matches by name; the test for the give-way lines pins the order.
- [`replaced.json` outlives its link] → it holds a random id and a folder name, no secret, and only a matching id reads it.
- [`secrets.md` is on a measured save route] → `node scripts/measure-context.mjs --check` showed 431 words of room on `named-secret-save` before the edit; keep the added text under 60 words.
