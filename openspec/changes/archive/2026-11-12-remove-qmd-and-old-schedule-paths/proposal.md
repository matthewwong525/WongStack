# Search by words only, and the old schedule paths go

**Status:** ready-to-ship
**Branch:** remove-unused-qmd-cleanup
**Open questions:** none

## Why

Three parts of WongStack cost upkeep and almost nothing uses them. Meaning-based search (QMD) is not set up on this computer, and its own test shows a small gain at a high cost. The code that moves old schedules into the app, and the commands for the older Cloudflare runner, serve schedules from before 5 November. The list of retired names carries exceptions for files that no longer hold those names.

## What Changes

- **Search uses words only. Meaning-based search (QMD) goes.** Recall and document search give the same answers as they give on this computer today, because QMD was never set up here. You lose one thing: a search that can find a page when your question uses different words than the page. The setup, the status, and the refresh steps for QMD go too, with QMD's own check, which ran 131 times in the last 3 weeks.
  | QMD's own test, 8 questions | Words only | With QMD |
  | --- | --- | --- |
  | Questions answered | 6 | 7 |
  | Time for one search | about 0.5 seconds | 8 to 10 seconds |
  | Space on each computer | none | about 1 GB |
  | Setup on each computer | none | about 2 minutes, with a download |

- **A search answer gets shorter.** It no longer has the lines that say which search mode ran and how much the meaning search covered. Those lines would say the same thing each time. The room goes to the facts and the passages.
  ```text
  Before
  Recall v1 · scope current · mode auto
    · backend lexical-fallback
  Facts: ok; documents: ok (QMD not
    prepared; run documents-setup)
  Semantic coverage: unavailable;
    requested mode: ok

  After
  Recall v2 · scope current
  Facts: ok; documents: ok
  ```

- **BREAKING: old schedules no longer move into the app by themselves.** A schedule has had three homes. This change removes what is left of the first two. A repo that updates from a version before 49 keeps its old schedule files, but nothing moves them and they do not run. You ask the assistant to save each one as a schedule in the app. While a routine or a timed job from your daily settings is left, the daily journal says so once a day. An old schedule file in the repo gets no journal line.
  | When | Where a schedule lived | What goes now |
  | --- | --- | --- |
  | Before 9 Oct (version 40) | A small program on Cloudflare ran your timed jobs | The commands that list, pause, and remove its jobs, and their page |
  | 9 Oct to 5 Nov | Files in the repo and routines in your daily settings file | The mover that carried them into the app, and the move of one old schedule on request |
  | Since 5 Nov (version 49) | Your company app, one list for each person | Nothing: this stays |

- **One schedule of yours still waits for the mover: "Monthly books close" in ClaymooApp.** This change does not touch ClaymooApp. ClaymooApp still has the mover today, so its move can finish before ClaymooApp takes this update. If it does not, you ask the assistant there to save that schedule in the app by hand.

- **The retired-names list loses its dead exceptions, and keeps each name.** An exception lets one file keep an old name. About 57 exceptions point at a file that is gone or that no longer holds the name: 35 go with QMD's test files, 20 are dead today, and 2 go with the old schedule pages. The check now fails on a dead exception, so the list stays clean.
  | The retired-names list | Today | After |
  | --- | --- | --- |
  | Old names the check catches | 290 | 290, plus the names this change retires |
  | Exceptions | 185 | about 128 |
  | Dead exceptions | 20 | 0, and the check fails on a new one |

- **Search on Windows keeps its check.** It moves to a small check of its own that runs only when the memory files change.

**Non-goals:** a change to how words-only search ranks a passage; a replacement for meaning-based search; the list in the app that shows an old Paseo schedule; removing a name from the retired-names list; the archived review pages; any change in ClaymooApp or another repo.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

### Modified Capabilities

- `document-retrieval`: search is by words only. The requirements for meaning-based search, index refresh, and QMD setup go; the promise that a passage matches its file, and a new promise that search needs no setup, replace them. The promise that search stays within the current checkout gets a new name with no index in it, and the no-match case names no backend.
- `memory`: recall and its files list no longer name a document index, a semantic backend, or document models; a slow document scan, not slow semantic work, is the deadline case.
- `host-schedules`: the requirements for old cloud jobs, for the move at the update, and for moving one old schedule on request go. One new requirement: an update leaves old schedule data in place and runs none of it.
- `daily-routine`: a routine or timed job left in an old list still does not run; the journal now says to save it as a schedule, not that it waits to move.

## Impact

- **Memory module** (`.agents/plugins/memory/`): `scripts/lib/documents/` loses `qmd.mjs`, `setup.mjs`, `refresh-worker.mjs`, `state.mjs`, `runtime.json`, and `runtime/`; `retrieve.mjs`, `commands.mjs`, `input.mjs`, `packet.mjs`, and `scripts/memory.mjs` get smaller. Its version rises.
- **Company helper** (`.agents/memory/operations.mjs`): the `memory.recall` and `memory.documents` descriptions and output shape, now version 2.
- **Schedules** (`.agents/inbox/`): `move-in.mjs` and `lib/legacy.mjs` go; `schedules.mjs` loses `move-in`, `move`, and `legacy`; `lib/defaults.mjs` takes the three sweep helpers it still uses.
- **Daily module** (`.agents/plugins/daily/`): `daily/scripts/daily.mjs` loses the daily start of the move; `daily/scripts/worker.mjs` gets new journal words; `schedule/SKILL.md`, `schedule/scripts/schedule.mjs`, and `schedule/references/migration.md` (deleted). Its version rises.
- **Wiki:** `wiki/development/document-retrieval.md`, `wiki/development/required-tools.md`, `wiki/stack/host-schedules.md`, `wiki/stack/getting-started.md`, `wiki/development/secrets.md`, `wiki/stack/README.md`; `wiki/stack/legacy-cloud-schedules.md` is deleted.
- **Source repo only:** `.github/workflows/qmd-retrieval.yml` becomes a Windows-only check; `scripts/evaluate-document-retrieval.mjs` and `scripts/tests/fixtures/document-retrieval/` go; `scripts/retired-names.json` and `scripts/check-retired-names.mjs`.
- **Tests:** `document-runtime`, `document-evaluation`, `schedule-legacy`, and `schedule-move-in` tests go or shrink; `document-recall`, `document-portable`, `document-corpus`, `daily`, `daily-worker`, `daily-module`, `schedule-defaults`, `schedule-payload`, `schedule-retirement`, and a retired-names test change.
- **Other:** `.env.example` (the old runner's key name), `.agents/memory/areas.json`, `.agents/skills/wong-sync/references/payload-manifest.md` and `payload-files.json`, `scripts/fixtures/context-baseline.json`, `CHANGELOG.md` with a `major` entry.
- **Overlap in file, not in intent:** `helper-per-project` edits `schedule.mjs` and `approvals.mjs`; `installation-owned-memory-devices` and `automatic-memory-tidy` edit other memory files.

## Decision log

- **2026-11-12** — Asked whether QMD is still needed and which other unused areas to clean up → chose all three: QMD, the old-schedule code, and a trim of the retired-names list.
- **2026-11-12** — Asked what to do with the mover and the old cloud commands, after the check found that ClaymooApp still holds "Monthly books close" for the mover and that no repo on this computer has an old cloud runner → chose to remove both.
- **2026-11-12** — Asked which trim the retired-names list gets → chose dead exceptions only; each name stays.
- **2026-11-12** — Assumed: this is a `major` release, because commands and a search option go, and old schedules no longer move by themselves.
- **2026-11-12** — Assumed: the search answer becomes version 2 without its mode, backend, and coverage fields, because each would hold one fixed value from now on.
- **2026-11-12** — Assumed: a request for the `keyword` or `auto` search mode still works and changes nothing, and a request for `semantic` or `deep` stops with a message that meaning-based search was removed, because the first two ask for what search does anyway, and a silent fallback for the last two would hide the removal.
- **2026-11-12** — Assumed: the update does not delete QMD's folder on a computer that set it up, because it is outside the repo; the update note says where it is and that it is safe to delete.
- **2026-11-12** — Assumed: the move of one old Paseo schedule on request goes with the mover, because it runs the same code and works only on an old schedule file in the repo.
- **2026-11-12** — Assumed: the app's list of old Paseo schedules stays, because other parts still read it and you did not ask for it; it is the next candidate.
- **2026-11-12** — Assumed: QMD's test questions and frozen test pages go with it, because only QMD's test read them; the three behaviors they alone covered get small tests with their own pages.
- **2026-11-12** — Assumed: the retired-names check fails on a dead exception from now on, because 20 went dead with no one noticing.
- **2026-11-12** — Assumed: search on Windows keeps its own check, because Windows paths differ and no other check runs there.
- **2026-11-12** — Built all four parts. The test step that the plan put before the QMD deletes ran at the end, with the same tests kept: the build writes all code and tests first.
- **2026-11-12** — Check: deleted `scripts/tests/document-runtime.test.mjs`, `scripts/tests/document-evaluation.test.mjs`, `scripts/evaluate-document-retrieval.mjs`, `scripts/tests/fixtures/document-retrieval/`, and `.github/workflows/qmd-retrieval.yml`, because they tested only QMD, its index, and its setup, which are gone. The cases for kept behavior moved to `scripts/tests/document-corpus.test.mjs`: input checks, a phrase late in a long section, a source edited during a lookup, current scope without an archived proposal, history scope with it labeled `archive`, no match as `empty`, and a scan that runs out of time.
- **2026-11-12** — Check: `scripts/tests/document-corpus.test.mjs` lost its four index-state cases (index folders per checkout, refresh, refresh locks, old index copies), because `state.mjs` is gone and search keeps no index.
- **2026-11-12** — Check: `scripts/tests/document-portable.test.mjs`, the Windows check, no longer asks for `--mode semantic` to fall back. It now asserts version 2, that `keyword` and `auto` work, that `semantic` and `deep` exit 2, and that the data folder is not created at all.
- **2026-11-12** — Check: deleted `scripts/tests/schedule-move-in.test.mjs` and `scripts/tests/schedule-legacy.test.mjs`, because the mover and the old cloud commands are gone. The `sweepTimings` case moved to `scripts/tests/schedule-defaults.test.mjs`.
- **2026-11-12** — Check: `scripts/tests/schedule-retirement.test.mjs` now asserts that the old `skills/routine/` name has no exception at all, because its exceptions were all dead; `scripts/tests/daily-module.test.mjs` calls `hosts`, not `move-in --dry-run`, to prove the stand-in store's own commands run; `scripts/tests/schedule-payload.test.mjs` asserts the first sentence under `## Existing schedules`, in place of the removed hub link.
- **2026-11-12** — Check: `scripts/tests/cli-conventions.test.mjs` no longer lists `scripts/evaluate-document-retrieval.mjs`, because the script is gone.
- **2026-11-12** — Exports after the deletes (task 2.4). Removed: `localProgress` in `.agents/inbox/lib/progress.mjs`, which only the mover used. Gone with the two deleted files: `moveIn`, `gather`, `settle`, `duplicates`, `checkTiming`, `checkInstructions`, `cadenceOf`, `weekdaysOf`, `mainWords`, `legacyContext`, `legacyAdapter`, `teardownLegacy`, `legacyPromptStatus`. Now private in `lib/defaults.mjs`: `fromSweep`, `readBrief`. Kept: `sweepTimings` (its moved test imports it), `validateReceipt` (`schedules.mjs` uses it for pause and run), `normalizedReceipt` (the Paseo adapter and `schedule-hosts.test.mjs` use it). Unused before this change and not touched: `checkpoint`, `STATES`, `validateBinding` in `records.mjs`; `unsupportedAdapter` in `hosts.mjs`; `approvalKey`, `readApprovals` in `approvals.mjs`; `defaultDefinitions`, `retiredDefaults` in `defaults.mjs`.
- **2026-11-12** — Assumed: `fromSweep` lost the fields that only the mover read (`source`, `origin`, `skill`, `cadence`, `paused`), and the `schedule.mjs` options `--keep`, `--drop`, and `--resources` went, because only the removed commands read them.
- **2026-11-12** — Assumed: all three key names of the old runner left `.env.example` (`WONG_ROUTINES_KEY`, `WONG_ROUTINE_MODEL_KEY`, `WONG_ROUTINE_GITHUB_TOKEN`), because all three belong to the runner whose commands are gone.
- **2026-11-12** — Assumed: four pages the tasks did not list were fixed, because each linked the deleted page or described the move: `wiki/stack/cloudflare-credentials.md`, `wiki/development/repository-improvement.md`, `wiki/development/daily.md`, and `wiki/development/README.md`; `schedule/references/paseo.md` now says how to keep a Paseo schedule in the app on request.
- **2026-11-12** — Assumed: the company helper's input list offers only `auto` and `keyword`, and a `semantic` or `deep` request through it stops with the same removal message as the command line, because the spec asks for that message on each route.
- **2026-11-12** — A document search now writes nothing outside the repo. Before, each `memory.mjs` command made the computer's identity file in the user data folder, also for a search that needs none. The spec of this change promises that no folder appears outside the checkout, so the one check that touched it now runs only inside a memory run.
- **2026-11-12** — The memory module is version 3.0.0 and the daily module is version 2.0.0, because commands left both.
- **2026-11-12** — Retired-names count: 53 exceptions removed, not 57, because 4 of the 20 dead ones were also among the 35 of QMD's test pages. 136 exceptions are left, 4 of them new, and the list has 301 names. 32 entries lost their last exception and keep the name.
- **2026-11-12** — Assumed: the new retired name `qmd-retrieval` keeps an exception for three check records under `.agents/verification/journeys/`, and `schedule/references/migration.md` (the narrower spelling) keeps one for `scripts/fixtures/context-baseline.json`, because each file is a record of a past state and holds the whole path, so no narrower spelling misses it. Other entries have the same exceptions for the same files.
- **2026-11-12** — The replacement text of three old entries changed (`scripts/routine-runner/`, `schedule/scripts/lib/legacy.mjs`, `schedule/scripts/lib/move-in.mjs`), because each pointed at a file or page this change deletes.
- **2026-11-12** — `scripts/fixtures/context-baseline.json` needs no change: the context check passes as it is.
- **2026-11-12** — Open until the save: the retired-names check fails on three `QMD` lines in `openspec/specs/document-retrieval/spec.md`. All three are in requirements this change removes, so the check passes after the save applies the spec changes. The module-version check names the browser module only because `main` moved; it passes after `main` is brought in.
- **2026-11-12** — Check: `.github/workflows/document-search.yml` is new and takes over the one job that `.github/workflows/qmd-retrieval.yml` keeps a use for, the Windows run of `scripts/tests/document-portable.test.mjs`. The QMD jobs (setup, the 8 graded questions, the timing report) are gone, because the code they tested is gone.
- **2026-11-12** — The check records under `.agents/verification/journeys/` still list the paths of deleted files (`qmd.mjs`, `setup.mjs`, `state.mjs`, `refresh-worker.mjs`). They stay as written: each is a record of a past run, and no check reads those paths as live files.
- **2026-11-12** — Review fix: the spec changes now also replace *Indexing stays within the current checkout* with *Document search reads only the current checkout*, and reword the no-match case of *Document evidence is bounded and traceable*, because both kept an index or a backend that is gone. The update note and this plan now promise the daily journal line only for a routine and a timed job, because the worker writes none for a `schedules/` file.
- **2026-11-12** — Assumed: the memory spec's *Recall and pull name the files behind facts* gets the same fix, because it still named the document index and a semantic backend.
- **2026-11-12** — Second review fix: *Document search needs no setup* now names git with Node, because search lists its pages through git. The save applied the spec changes to the four main specs and changed the Purpose of the document search spec by hand; the retired-names check and the spec check pass.
- **2026-11-12** — Releases 56.0.0 and 57.0.0 landed during the build and were brought in. Daily is now one folder and the command is `/daily:schedule`, so the edits of this change sit at the new paths and its texts use the new command name. Daily goes to version 3.0.0, because 57.0.0 took 2.0.0. The retired-names list was rebuilt on the new list: the 11 new names, the three changed replacement texts, and 64 dead exceptions removed there (316 names).
- **2026-11-12** — Archive checkpoint: all tasks are done and the remote checks passed, the Windows search check included. Releases 57.1.0, 57.1.1 and 57.1.2 landed during the publish and were brought in; this change is release 58.0.0.
