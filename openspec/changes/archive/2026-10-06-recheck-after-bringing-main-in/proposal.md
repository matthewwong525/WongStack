# Check again after publishing brings in the latest work

**Status:** in-progress

**Branch:** hellish-shark

**Open questions:** none

## Why

A finished change is checked on this computer before it is first saved. Publishing then brings in whatever other changes went live meanwhile, and nothing checks the result here again. On 2026-10-06 that cost two failed saves, about 20 minutes: both failures came from what the other changes brought, and a check on this computer would have caught both before the wait.

## What Changes

- **Publishing checks your change again after it brings in the latest live work.** The same checks that ran after the build run once more on this computer, before the save. A problem is repaired here, in seconds, not found by the slower online checks.
  ```text
          BEFORE                    AFTER
  build ─▶ check here       build ─▶ check here
             │                         │
             ▼                         ▼
     bring in live work        bring in live work
             │                         │
             │                         ▼
             │                  +check here again
             ▼                         │
     save ─▶ online checks             ▼
             │                 save ─▶ online checks
             ▼
     fails on what came in
  ```
- **A publish that brings nothing in takes no longer.** The extra check runs only when other work was brought in.
- **The online checks still decide.** The check on this computer never blocks a save or a publish. A computer without the tools says so in one line and goes on, as today.

**Non-goals:** stopping two changes from taking the same release number; a second check for a plain save; changing what the checks test.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: the local pre-check also runs when `/ship`'s preparation merges the default branch in, before the checkpoint.

## Impact

- `.agents/skills/ship/scripts/ship.mjs`: `prepare` runs `.github/scripts/checks.mjs --worktree` after it merged the default branch in, prints `LOCAL_CHECKS=`, and its `NEXT:` names a repair when they fail. Exit codes unchanged.
- `scripts/tests/ship-commands.test.mjs`: a pin for the no-merge path, and cases for pass, fail, not run, and no script.
- `.agents/skills/ship/SKILL.md` Step 3 and `wiki/development/the-change-loop.md`'s gate section: one sentence each.
- `CHANGELOG.md`: a `minor` entry; nothing to do by hand.
- No app, database, or page change. `checks.mjs`, `checkpoint.mjs`, and `merge.sh` are untouched.

## Decision log

- **2026-10-06** — Assumed: this is the one improvement to make, because struggle note #1236 records two failed saves from an unchecked merge of the default branch, note #1198 records the same merge made twice more by the renumber recovery, and the script that merges already has the check one call away.
- **2026-10-06** — Assumed: the fix is a check the script runs, not one more instruction to rerun checks, because whether a merge happened is a fact the script holds and an instruction can be skipped.
- **2026-10-06** — Assumed: a failed local check does not stop the command; it changes the next-step line to a repair, because the delivery gate says a local run decides no save and no publish, and a stop would also need a way to rerun a check after the merge is already made.
- **2026-10-06** — Assumed: the check runs only when the command merged, because an ordinary publish was checked by its build and should pay no added time.
- **2026-10-06** — Assumed: the renumber race itself (note #1198) is left alone, because fixing it means changing how releases are numbered, a larger change with its own trade-offs.
- **2026-10-06** — Assumed: this is a minor release, because the command gains one output line and nothing an install relies on changes or goes away.
- **2026-10-06** — Timing: task 1.1's run of the pin against the unchanged `ship.mjs` moved to the final verification (4.1), because the build writes all source and tests before it runs any; the pin's expected lines were copied from the existing clean-prepare test.
