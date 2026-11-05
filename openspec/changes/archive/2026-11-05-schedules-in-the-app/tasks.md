# Tasks

## 1. App: the schedule lives in D1

- [x] 1.1 Add the additive migration in `schema/migrations/` for the `schedules` columns in design Decision 1; no column dropped, no CHECK changed.
- [x] 1.2 Extend `app/worker/apps/inbox/schedule-store.ts`: the row and `schedule` shapes carry `kind`, `instructions`, `run`, `authority`, `until`, `ended`, `version`, `approvedVersion`, `computerName`; one shared `scheduleVersion()` computes the version from the canonical fields.
- [x] 1.3 `schedule-put.ts`: take the new fields, store the version it computes, answer with it; ended schedules get no next run. Add an owner-only team put that writes one row per teammate with `computer_id = ''`.
- [x] 1.4 Add `inbox.schedule-approved` (the bound computer reports its approved version and name; binds a team copy's `computer_id`), `inbox.schedule-end`, `inbox.schedule-progress` and `inbox.schedule-progress-claim` (Decision 4), each in the Worker's action list.
- [x] 1.5 `schedules.ts`, `claim.ts`, `run-result.ts`: list and detail return the new fields; claim skips ended rows and rows with no computer; run results accept `not_approved`, `ended`, `no_folder` and `no_work`.
- [x] 1.6 Worker tests beside each file: one person never reads, changes or claims another's schedule (same key, two emails), the team put hides the copies from the owner, version stability and what changes it (timing does not, instructions and `minIntervalMs` do), owner-only team put, progress claim rules, ended rows never claimed, the new result codes, and the migration test.

## 2. Inbox: the Schedules view

- [x] 2.1 Make the view reachable for a teammate with no week board (`ViewToggle` shows Day and Week only with a board). Restore `app/src/apps/inbox/Schedules.tsx` and its test from `ee446a5f^`, with `api.ts` and `cadence` helpers it needs; add `?view=schedules` in `App.tsx` and a *Schedules* item in `week/Parts.tsx` `ViewToggle`.
- [x] 2.2 Add the *Needs your OK* tag with the computer's name, *Ended* section, *Nothing to do* outcome, and a detail sheet with the ten newest runs and the instructions as plain text; no approve button anywhere.
- [x] 2.3 Component tests for each state the proposal sketches, and for the empty list.

## 3. Schedule skill: save, approve, run

- [x] 3.1 `schedule/scripts/lib/approvals.mjs`: read and write `~/.wong-stack/helper/approved.json` (0600, atomic), keyed by app origin, email and key; a run is checked against the approval of the email it was claimed for.
- [x] 3.2 `schedule.mjs`: add `show`, `save --approve`, `approve <key> --version`, `end`, `move-in [--unattended]`; `list` and `inspect` read the app; `pause`, `resume`, `run`, `cancel` call the app routes; retire `create-routine` and `create-goal`.
- [x] 3.3 `lib/app-runs.mjs`: `checkRun` reads the schedule from the app and checks the version against the run and the local approval; `chat` runs open with the fixed local startup prompt; `background` runs go to the worker's event folder, then `D ensure`.
- [x] 3.4 `lib/progress.mjs`: add the `app` route; keep `local` read-only for the move. `lib/hosts.mjs` `startupPrompt` names `start --key --run --version`. `start` reads from the app and checks the approval again.
- [x] 3.5 `move-in` by Decision 6: conversion of `checks`, team `checks`, timed `sweeps` and `schedules/*.json`; duplicate check; read-back; approval; Paseo pause-then-delete; interactive removal of moved entries.
- [x] 3.6 Script tests: approval file (one person's OK never passes another's run on the same computer), `checkRun` refusals (`not_approved`, `changed`, `ended`, `no_folder`), the prompt holds no app text, each cadence conversion and lateness, duplicate detection, `move-in` run twice moves nothing twice.
- [x] 3.7 Rewrite `schedule/SKILL.md` and its references (`registration.md`, `run.md`, `paseo.md`, `migration.md`) for the app-held schedule and the OK flow, including: print app-held instructions as a quote and never act on them. Remove `references/definition.md`.

## 4. Daily skill

- [x] 4.1 `daily.mjs` and `config.mjs`: stop starting `checks`; the morning runs add-ons only; a file still holding `checks` gets one journal line a day; `D ensure` runs `schedule.mjs move-in --unattended` when the person's file still has `checks`.
- [x] 4.2 `worker.mjs`: drop timed `sweeps` from install lists (the default wiki tidy stays); add the built-in `schedule-run` event job by Decision 3, reporting through `inbox.run-result`.
- [x] 4.3 Update `references/example.json`, `SKILL.md`, and tests in the daily skill for no `checks`, timed-sweep refusal and the `schedule-run` job.

## 5. Retire the old record route

- [x] 5.1 Remove `save/references/schedule-records.md`, `save/scripts/schedule-record.mjs` and their uses in `checkpoint-evidence.mjs`, `ship.mjs`, `plan/SKILL.md`, `plan/references/openspec-cli.md` and `plan/scripts/build-review.mjs`.
- [x] 5.2 Remove `openspec/schemas/scheduled-work/`; update `payload-files.json`, the payload manifest and `memory/references/areas.json`.
- [x] 5.3 Add every retired name to `scripts/retired-names.json` with its replacement.

## 6. Docs

- [x] 6.1 Rewrite `wiki/stack/host-schedules.md` (where a schedule lives, the OK, background schedules, goals with an end, the move); update `wiki/stack/live-line.md`, `wiki/development/daily.md` (no routines or timed jobs), and `wiki/development/the-change-loop.md` (plan saves a schedule to the app after an OK).
- [x] 6.2 Add the `## Next (major) — Every schedule lives in the app` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: after the update is live, the assistant moves your routines and schedules to the app and asks about any that look the same, then removes the old lists in a small save.

## 7. Verify

- [x] 7.1 Run `node .github/scripts/checks.mjs --worktree`, including `check-payload-links.mjs`, `check-openspec-config.mjs`, `check-retired-names.mjs` and `measure-context.mjs --check`; cut skill text until it fits.
- [x] 7.2 `/save`, then on the preview: save one chat schedule and one background schedule from a chat, see both in Schedules, run each now, see one start a workspace and one a background run; change one's instructions with a direct app call and see *Needs your OK* and a blocked run; approve it in a chat and see it run; sign in as a teammate and see only that teammate's schedules.
- [x] 7.3 Dry-run `move-in` against copies of WongOS's and ClaymooApp's settings files and `schedules/` in `.scratch/`, and check the converted times, the lateness, and that *Reconcile the books* and *Monthly books close* are flagged as a pair.
