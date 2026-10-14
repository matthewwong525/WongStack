# A new install's first save passes

**Status:** ready-to-ship
**Branch:** clever-fish
**Open questions:** none

## Why

A brand-new install could not save its first change. Setup stamped the new app with the day it was installed. The app's own checks run on a test engine that ships with WongStack, and that engine refuses a date more than a week newer than itself. So an install made more than a week after WongStack last updated the engine failed its first save, with an error no owner could act on. It has hit every new install since 2026-10-10, when those checks were added.

## What Changes

- **Setup gives a new app the date WongStack itself is tested with**, not the day you install. WongStack's own checks pass on that date with the engine it ships, so a new install's first save passes too, on any day. The fix is the same wherever the project is kept, GitHub or Cloudflare.
  ```text
    BEFORE                AFTER
  install day           +tested date
      │                     │
      ▼                     ▼
  newer than engine     engine knows it
      │                     │
      ▼                     ▼
  first save fails      first save passes
  ```
- **WongStack's own checks now catch this.** The check that builds a pretend install used a made-up old date, so it never saw the failure. It now uses the date setup really writes. A second check fails if that date and WongStack's own app's date ever differ.
- **Installs you already have keep their date.** An update never changed it and still doesn't. The update note says what to ask the assistant if a save fails with this date error: only an install made in the last few days can be affected.
- **A maintainer page stops promising something that isn't there.** It said a test install made from an unpublished branch keeps following that branch. Nothing records the branch, so the page now says its later updates follow the published version.

Non-goals: moving the date on installs you already have; changing how or when WongStack updates its test engine; recording the branch a test install came from.

## Decision log

- **2026-10-14** — Asked which problem to fix next after publishing save-through-the-app → chose this one, in its own workspace.
- **2026-10-14** — Assumed: it hits every new install made more than a week after the shipped engine's build, not only the one seen, because the engine shipped is dated 2026-09-26 and refused anything past 2026-10-03, exactly seven days on.
- **2026-10-14** — Assumed: GitHub installs are hit the same way, because both routes write the app's settings through the same code with the same date.
- **2026-10-14** — Assumed: an update never moves the date, because an update leaves the app's settings file alone and the file is not among the files WongStack sends.
- **2026-10-14** — Assumed: the date to write is the source app's own, because it is the one date proven to pass with the shipped engine, and every new install then runs on the same date WongStack tests.
- **2026-10-14** — Assumed: the date is written into the shipped settings template, not read from the source app's file, because that file never reaches an install; a check keeps the two equal.
- **2026-10-14** — Assumed: the checks should not instead be taught to accept a too-new date, because they would then test a different date from the one the live app runs on.
- **2026-10-14** — Assumed: existing installs get an update note, not an automatic date change, because only installs made since 2026-10-04 can be affected and the known ones were throwaway and are gone.
- **2026-10-14** — Assumed: the maintainer page is corrected, not the branch recorded, because recording it is a new feature and the note was to take the small fix only if it fits.
- **2026-10-14** — Asked what next once the plan was ready → chose build and publish.
- **2026-10-14** — Archive checkpoint: built in one pass with every task ticked and the local checks green, the pretend-install check passing on the date setup now writes; numbered 41.2.1 and saved for the check before publishing. A real fresh install was not tried.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: the requirement *A created wrangler config deploys* also promises a compatibility date the shipped local runtime accepts, equal to the source app's own.

## Impact

- `.agents/skills/wong-sync/references/stack-pack-fragments.md`: the fragment's date and its rule.
- `.agents/skills/wong-setup/scripts/provision.mjs`: `wranglerConfig` stops filling a date.
- `scripts/check-target-app.mjs`, `scripts/tests/provision.test.mjs`: use the fragment's date; one new assertion ties it to `app/wrangler.jsonc`.
- `wiki/maintaining/test-a-setup-change.md`: the branch sentence. `CHANGELOG.md` gets a `patch` entry.
- No dependency, API, or data change. The placeholder Worker setup uploads to Cloudflare keeps today's date: Cloudflare accepts it, and no local runtime ever runs it.
