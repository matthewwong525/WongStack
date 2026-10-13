# Design

## Context

See proposal.md for why. The tip calculator is `app/src/apps/tips/` only: a page, a helper, and their tests, with no worker folder, no table, and no key. Three other surfaces lean on it as "the second built app":

- `schema/seed.sql` lists `tips` in `wong_access_apps` and gives it to Dana (`write`) and Eli (`read`).
- `app/worker/employee-access/seed.test.ts` filters the seed's apps to those this build has, because installs never had `tips`.
- Five kept checks in `.agents/verification/journeys/employee-onboarding/` click the *Tip calculator* tick or expect its title.

## Goals / Non-Goals

**Goals:**

- No live file builds, seeds, or replays against an app that no longer exists.
- Every kept promise stays proven, against Hello.

**Non-Goals:**

- Removing `app/src/apps/tips` and `app/worker/apps/tips` from the scaffold `exclude` list in `payload-files.json`, or changing `scripts/tests/wong-sync-preflight.test.mjs` and the `stack-pack` scenario that use `tips` as the source-only example. The list already tolerates a folder that is absent.
- Renaming `tips` in the Access unit-test fixtures (`levels`, `subjects`, `Roles`, `PersonPage`, `Leaving`, `AppList`): each builds its own made-up shop.
- Touching `scripts/tests/` fixtures that write a throwaway `app/src/apps/tips/` path.

## Decisions

- **Drop the seed rows over leaving them inert.** A row for an unbuilt app counts for nothing, so leaving them would pass. But the seed's comments would describe two apps where one exists, and the test's "apps only WongStack's own repository builds" branch would be dead. After the cut Dana holds Hello, Eli's one look-only row is Hello, and the test names `['hello']` outright.
- **Rewrite the kept checks by hand, and let the check before publishing prove them.** Each change is a one-word swap of the tick or the expected text. A replay that still differs gets one fresh look, by the kept-check rules, so a wrong hand edit can not pass silently. Deleting them would leave the promises unproven until some later change happened to walk them.
- **The verification-machine check unticks Hello for Dana, saves, then opens `/apps/hello/`.** The promise is that the machine saves a change to the practice list and opens an app whatever the list says; Hello serves both halves as the tip calculator did.
- **A patch release.** `schema/seed.sql` and `wiki/stack/mini-apps.md` ship. Installs see nothing change, so the Updating note says nothing needs doing.

## Risks / Trade-offs

- [A preview's Access shows one app tick, so a screen with several apps is seen only in unit tests] → the unit tests already cover several apps with made-up shops; a real second app returns the moment one is built.
- [A hand-edited kept check differs on replay] → the replay reports `changed`, and the walk grades it fresh and keeps the passing version.
- [Another open change edits `schema/seed.sql`] → the cut is three rows and two comments; a later merge resolves by keeping both edits.
