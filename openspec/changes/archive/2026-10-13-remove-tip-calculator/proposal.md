# Remove the tip calculator

**Status:** ready-to-ship
**Branch:** remove-tip-calculator
**Open questions:** none

## Why

WongStack's own site carries two sample apps, Hello and a tip calculator. Hello is the example every install gets, so the tip calculator shows nothing Hello does not, and it is one more screen to keep matching each new look.

## What Changes

- **The tip calculator is gone from WongStack's own site.** Its card leaves the home page and its address stops opening. Hello stays as the example.
  ```text
    BEFORE                AFTER
  ┌─────────────────┐   ┌─────────────────┐
  │ Hello   Example │   │ Hello   Example │
  ├─────────────────┤   ├─────────────────┤
  │ Tip calculator  │   │ Connect your    │
  ├─────────────────┤   │ assistant       │
  │ Connect your    │   └─────────────────┘
  │ assistant       │
  └─────────────────┘
  ```
- **The practice list in Access shows one app to give.** A preview's practice people held Hello and the tip calculator. They now hold Hello alone, so a person's page offers one app tick.
- **Five saved checks of Access use Hello.** They ticked the tip calculator to prove giving an app, leaving without saving, and the look-only notice. They now tick Hello and prove the same promises.
- **Installs see no change.** The tip calculator never shipped to them. Their practice data loses three rows that named it and did nothing.
- **"Make me a tip calculator" stays as the example request** on the empty home page and in the guide: it is still a good first thing to ask for.

**Non-goals:** changing Hello, adding a second sample app in its place, removing the rule that an app built in WongStack's own repo never ships to installs, or renaming the made-up shop apps inside Access's own tests.

## Decision log

- **2026-10-13** — Asked remove the tip calculator as we already have the hello app → chose remove it and publish.
- **2026-10-13** — Assumed: the practice data drops its tip calculator rows, because no repo builds that app now and the rows would name nothing.
- **2026-10-13** — Assumed: the five saved Access checks are rewritten to tick Hello, not deleted, because the promises they prove still stand and the check before publishing replays them.
- **2026-10-13** — Assumed: the example request "Make me a tip calculator" stays, because it is a request to copy, not the app.
- **2026-10-13** — Assumed: the list that keeps a source-only app out of installs still names the tip calculator's folders, because the promise it guards stays and its test uses that name as the example.
- **2026-10-13** — Assumed: no retired name is recorded, because `tips` stays in use as a made-up app name in tests and written examples.
- **2026-10-13** — Check: `app/src/apps/tips/App.test.tsx` and `app/src/apps/tips/tip.test.ts` are deleted with the app, because each tests only the tip calculator's page and its sum and guards no file that stays.
- **2026-10-13** — Archive checkpoint: built in one pass with every task ticked and the local checks green; numbered 40.7.1 and saved for the check before publishing.
- **2026-10-13** — Archive checkpoint: the check before publishing passed; it kept one new check, the home page's app list, and the five rewritten Access checks replayed unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: the requirement that the existing tip calculator match the starter's look is removed with the app.

## Impact

`app/src/apps/tips/` is deleted. `schema/seed.sql` and `app/worker/employee-access/seed.test.ts` drop the `tips` rows. Five kept checks under `.agents/verification/journeys/employee-onboarding/` move to Hello. `wiki/stack/mini-apps.md` loses its mention, and `CHANGELOG.md` gains a patch entry because the seed and the wiki page ship. No production data, migration, dependency, or skill changes; rows in a live Access list that name `tips` already count for nothing once the folder is gone.
