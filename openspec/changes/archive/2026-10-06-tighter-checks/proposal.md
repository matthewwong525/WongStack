# Checks that can't go quiet

**Status:** ready-to-ship

**Branch:** wongstack-architecture-constraints

**Open questions:** none

## Why

You don't read the code, so the automatic checks are what you trust. Three gaps let them pass when they should not. A check can switch itself off and stay green: the repeated-code check once passed everything because its settings file held a comment. Wrong-typed code passes the required check and is only caught later, while the preview builds. And nothing stops a small app from reaching into another app's files.

## What Changes

- **A check that has stopped checking turns red.** When a change touches a check's settings, or the version of a tool behind one, each check is fed a small piece of code that is wrong on purpose. A check that lets it through is named and the change can't be published. Other changes skip this, so they take no longer.
  ```text
  settings change ─▶ bad sample ─▶ caught ─▶ ok
                         │ passed
                         ▼
                red: names the check
  ```
- **Wrong-typed code is caught before you see a preview.** Today that check runs only while the preview builds, after the required check has passed. It joins the required check, and it runs on your computer before work is saved. It also covers the server's test files, which nothing checks today; about 100 slips it finds there are fixed in this change.
  ```text
    BEFORE              AFTER
  tests ─▶ build      tests +types ─▶ build
             │              │
        found here     found here
  ```
- **The assistant's own scripts keep the testing they have.** 92 of every 100 lines are tested, but the floor that stops this from falling sits at 85. The floor moves up to 92, so a slide shows at once. No tests are added.
- **A small app keeps to its own folder.** A small app may use its own files and the shared parts. One that reaches into another app, a main page, or the server's core fails the check, which names the file. No app breaks this today.
- **After the update, your own app gets the same checks.** If one finds something in a screen your assistant built, the update's plan lists it and your assistant fixes it. Nothing needs doing by hand.

**Non-goals.** No size or branching limits on the assistant's scripts, and no type check for them: the first was offered and not chosen, the second found nothing a past bug supports. The landing page's own checks stay as they are. Running the server's tests inside Cloudflare's runtime is a separate, larger look.

## Decision log

- **2026-10-06** — Asked which of four tighter checks to plan → chose three: checks that prove they can fail, the type check in the required check with a higher floor for the scripts, and the small-app folder rule. Size and branching limits on the scripts were left out.
- **2026-10-06** — Asked whether to type-check the server's test files too, once measuring showed about 100 reports in 12 test files → chose to include them.
- **2026-10-06** — Assumed: the bad-sample run happens only when a change touches a check's settings or a tool's version, because a check should run only when its kind of file changed (`wiki/people/matthew-wong.md`), and this one can't fail otherwise.
- **2026-10-06** — Assumed: the scripts' floor becomes 92 lines and 89 branches, because the last run on the main branch measured 92.88 and 90.02, and a branch floor of 90 would leave room for two branches while two other workspaces are in flight.
- **2026-10-06** — Assumed: the folder rule skips test files, because a screen's test opens it inside the app's router and Home.
- **2026-10-06** — Assumed: the new checks reach an install through the normal update, because the app's checks ship with the app; the update note says what the assistant does when one finds something.
- **2026-10-06** — Assumed: this is a `minor` release, because installs gain new checks and lose nothing.
- **2026-10-06** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-06** — Build: the type check runs while the test files are fixed (groups 1 and 2), because its report is the list of what to fix. Every other task's own check run moves to the one run in group 7, because the build writes all code and tests before running any; each promise those steps checked is still held by a test or by group 7.
- **2026-10-06** — Build: the look at the saved commit's checks (the proof ran, six gates caught, the build still passes) is read from the publish's one save, not from a save of its own, because one publish makes one checkpoint.
- **2026-10-06** — Build: measured on this branch, the server's test files held 105 type reports in 13 files, not 101 in 12. None showed a real slip in a test: each was a body read without a shape, a stand-in with no type, or a platform type wider than the test's own.
- **2026-10-06** — Build: the 30 casts through `unknown` those 13 files already held went too, through two small builders in `app/tests/env.ts`, because the task's search reads each changed file whole, not only its new lines.
- **2026-10-06** — Build: the proof runs each check's own step of the app's `test` script, not a fixed command, so a dropped step, or a dropped option such as `--coverage`, is caught as well.
- **2026-10-06** — Build: with a comment added to `app/.jscpd.json` by hand, `npx jscpd` printed `Found 105 clones.` and exited 0, while `npm run test:checks` printed ``repeated code: passed a bad sample (src/repeated-first.ts, worker/repeated-second.ts); `jscpd` exited 0`` and exited 1. The file was restored.
- **2026-10-06** — Build: this branch's scripts measure 92.96 lines and 90.06 branches of every 100 tested, so the floor is 92 and 89 as planned.
- **2026-10-06** — Check: `app/package.json` adds the type check to the `test` script and a script that runs the bad-sample proof; stricter, nothing removed.
- **2026-10-06** — Check: `app/tsconfig.json` and the new `app/tsconfig.tests.json` add the server's test files to the type check, which `app/tsconfig.worker.json` still leaves out of the build's own project.
- **2026-10-06** — Check: `app/.oxlintrc.json` adds the folder rule for small apps; no rule is removed or relaxed.
- **2026-10-06** — Check: `scripts/tests/.c8rc.json` raises the floor from 85 lines and 81 branches to 92 and 89.
- **2026-10-06** — Check: `.github/scripts/checks.mjs`, `.github/scripts/loosened-checks.mjs` and the new `.github/scripts/check-settings.mjs` share one list of what counts as a check's settings and run the proof when one changes; the loosened-check rule itself is unchanged.
- **2026-10-06** — Archive checkpoint: the main branch moved from 35.2.0 to 36.3.0 while this was built and merged in with no clash; this is numbered 36.4.0. The look at the saved commit's checks follows this save.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-scaffold`: *npm test runs absolute quality gates* adds a type error, in a test file too, to what fails `npm test`.
- `ci-tests`: a new requirement promises that a check which no longer fails on a known-bad sample turns the test check red, and that the proof runs only when a check's settings or tools change.
- `mini-apps`: a new requirement promises that a mini app's code keeps to its own folder and the shared parts.
- `payload-checks`: *Every guard is tested refusing* also covers the scripts' coverage floor.

## Impact

- `app/package.json`, `app/tsconfig.json`, new `app/tsconfig.tests.json`, `app/.oxlintrc.json`.
- `app/worker/**/*.test.ts` and `app/tests/`: about 100 type fixes, most through one shared test helper.
- New `scripts/check-app-checks.mjs` with its samples, listed in `payload-files.json`; its tests in `scripts/tests/`.
- `.github/scripts/checks.mjs`, `.github/scripts/loosened-checks.mjs`, new `.github/scripts/check-settings.mjs`.
- `scripts/tests/.c8rc.json` and a test that the floor refuses.
- `.agents/rules/code.md`, `wiki/stack/mini-apps.md`, `wiki/development/the-change-loop.md`, `CHANGELOG.md` (`minor`).
- Measured on 2026-10-06: the type check takes about 4 seconds; a trial of the server's test files reported 106 errors, 5 of them from the trial copy; the folder rule passes the app as it stands and fails a sample.
