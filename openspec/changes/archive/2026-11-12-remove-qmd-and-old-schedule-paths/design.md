# Design

## Context

See `proposal.md` for the why. Three removals share one release because each is a deletion with the same shape: remove the code, its tests, its docs, and its spec text, then retire its names.

What the planning checks found, on 2026-11-12:

- **QMD.** `memory.mjs documents-status` on this host reports `runtimeReady: false`, and `~/.local/share/wongstack/documents` does not exist. The latest `qmd-retrieval.yml` report (run 43168567557) has 8 cases: keyword passes 6, `auto` passes 7 (`semanticRecovery: ["paraphrase-persistence"]`); keyword takes 512 to 673 ms, `auto` 7,758 to 10,458 ms; setup took 106,891 ms. The workflow ran 131 non-skipped times since 2026-10-22.
- **Old schedules.** `.agents/inbox/move-in.mjs` shipped at 49.0.0 (2026-11-05); `lib/legacy.mjs` at 40.0.0 (2026-10-09). No install record under `/root/*/.claude/.wong-stack.json` has `components.routines`, and no `.env` there declares `WONG_ROUTINES_KEY`. `/root/ClaymooApp/schedules/monthly-reconcile.json` ("Monthly books close") still waits for the move; WongOS has no routine or own sweep left.
- **Retired names.** `scripts/retired-names.json` has 290 entries and 185 `allow` paths. 20 `allow` paths name a file that no longer holds the name. 35 name a file under `scripts/tests/fixtures/document-retrieval/`. Two more go with this change: `` `/routine` `` → `wiki/stack/legacy-cloud-schedules.md` and `dream-memory --small` → `scripts/tests/schedule-legacy.test.mjs`.

## Goals / Non-Goals

**Goals:** document search is one code path with no state outside the checkout; the schedule store has no command for an old home; a dead exception cannot return to the retired-names list.

**Non-goals:** `records.mjs`, `mirror`, and `runs.mjs`'s `mirrorRound`, which still read `schedules/*.json`; the `paseo-store`; keyword ranking in `lexical.mjs`; any file outside this repo.

## Decisions

### 1. Document search becomes `scanCorpus` → `lexicalSearch` → `verifyPassage`

`retrieve.mjs` keeps `retrieveDocuments` with one path: scan, `lexicalSearch`, sort, `interleaveSources`, `verifyPassage`, and the one rescan when a passage is rejected. It returns `{ documents, documentSource }` only. `startRefresh`, `anchoredPassage`, and `locatedPassages` go: only QMD candidates used them. `commands.mjs` drops `documentPaths`, the `paths` argument, and the three `documents-*` commands; its two timeout fallbacks return the same two fields.

Deleted whole: `qmd.mjs`, `setup.mjs`, `refresh-worker.mjs`, `state.mjs`, `runtime.json`, `runtime/package.json`, `runtime/package-lock.json`. Before deleting `state.mjs`, confirm nothing outside the deleted set imports it; `document-corpus.test.mjs` imports it today, so its state cases go with it.

*Alternative: keep `state.mjs` as a cache of the scan.* Rejected: the scan is bounded to four seconds and keyword lookups measure about half a second; a cache brings back the stale-index cases this change removes.

### 2. The packet is version 2

`renderPacket` writes `version: 2` and drops `mode`, `backend`, `coverage`, and `requestedModeState`. `packetText`'s first line is `Recall v2 · scope <scope>`, and the `Semantic coverage` line goes. A document-source reason still shows on the `Facts: …; documents: …` line. `.agents/memory/operations.mjs` updates both operations' `outputSchema`, `required` list, example output, and description.

*Alternative: keep version 1 with fixed values.* Rejected: four fields that never vary cost bytes of a 6,144-byte budget on each call.

### 3. `--mode` is accepted for `keyword` and `auto`, refused for `semantic` and `deep`

`input.mjs` keeps `mode` in the allowed keys. `keyword` and `auto` validate and have no effect; `semantic` and `deep` throw `RetrievalInputError` (exit 2) with a message that meaning-based search was removed. `MODES` is no longer exported if nothing imports it. The usage text in `memory.mjs` no longer lists `--mode`, `--deep`, `--cpu`, or the `documents-*` lines; `parseArgs` keeps `mode` and drops `deep` and `cpu` unless another command uses them (check first).

### 4. The fixture corpus and the evaluator go; three behaviors keep a test

Delete `scripts/evaluate-document-retrieval.mjs`, `scripts/tests/document-evaluation.test.mjs`, `scripts/tests/document-runtime.test.mjs`, and `scripts/tests/fixtures/document-retrieval/`. Before deleting `document-runtime.test.mjs`, move any case that tests `corpus.mjs`, `input.mjs`, or `lexical.mjs` alone into `document-corpus.test.mjs` or `document-recall.test.mjs`. Then confirm, and add where missing, a test with its own temp pages for each behavior the evaluator alone graded: a current-scope question leaves an archived proposal out; history scope returns it labeled `archive`; a question with no match reports `empty`, not a failure.

### 5. The Windows check moves to its own workflow

Delete `.github/workflows/qmd-retrieval.yml`. Add `.github/workflows/document-search.yml` with the one `windows-2025` job that runs `scripts/tests/document-portable.test.mjs`, the same pinned actions, and path filters for `.agents/plugins/memory/**`, the test, and the workflow file. `document-portable.test.mjs` asserts version 2, that `--mode keyword` works, that `--mode semantic` exits 2, and that no `wongstack/documents` folder appears under the temp data folder. Neither workflow is in the payload, and neither is a required check.

### 6. The sweep helpers move; the mover goes

`lib/defaults.mjs` imports `fromSweep` and `readBrief` from `move-in.mjs`. Move `fromSweep`, `readBrief`, `sweepTimings`, and the private helpers they need into `lib/defaults.mjs`, and move their test cases from `schedule-move-in.test.mjs` to `schedule-defaults.test.mjs`. Then delete `move-in.mjs`, `lib/legacy.mjs`, `scripts/tests/schedule-move-in.test.mjs`, and `scripts/tests/schedule-legacy.test.mjs`.

`schedules.mjs`'s `extra` keeps `hosts` and `mirror`; `move-in`, `move`, and `legacy` fall through to the existing unknown-command error. `daily.mjs` loses `startMoveIn` and the `moveIn` parameter and call in `ensure`. After the deletes, list the exports in `.agents/inbox/` and `.agents/plugins/daily/schedule/scripts/lib/` that nothing imports, and remove those that only the deleted code used (candidates: `normalizedReceipt`, `validateReceipt`, `legacyPromptStatus`, `checkTiming`, `duplicates`, `settle`). Leave an export that a kept file or test of kept behavior uses.

*Alternative: keep `move` for a Paseo schedule.* Rejected: `moveCommand` passes `only: record:<key>`, so it works only where `schedules/<key>.json` exists, and no code writes that file any more.

### 7. Journal words for a left-over routine or timed job

`worker.mjs` lines near 469 and 592 keep `kind: 'waiting'` and change their words: `Timed jobs in the old list do not run. Ask to save each as a schedule: <ids>` and `Routines in your settings file do not start. Ask to save each as a schedule: <names>`. `daily-worker.test.mjs` follows. A stale `move-in.json` marker in a state folder is left; nothing reads it.

### 8. Docs keep their linked headings

`wiki/stack/host-schedules.md` keeps the heading `## Existing schedules`, because installed repos link `#existing-schedules`; its text becomes the new promise: old files and routines stay, do not run, and are saved as schedules on request; an old cloud runner is removed at Cloudflare by hand. Delete `wiki/stack/legacy-cloud-schedules.md` and `schedule/references/migration.md`, and remove each link to them (`wiki/stack/README.md`, `getting-started.md`, `secrets.md`, `payload-manifest.md`, `schedule/SKILL.md`, `.env.example`, `areas.json`). `wiki/development/document-retrieval.md` loses *Optional meaning-based search* and *Freshness and maintenance*'s index text, and rewrites *Acceptance and performance evidence* to name the Windows check; run `check-payload-links.mjs` to find an installed page that links a removed heading, and keep that heading with new text if one does.

### 9. The spec's Purpose line

A delta cannot change a spec's `## Purpose`. In the save that reconciles the deltas, edit `openspec/specs/document-retrieval/spec.md`'s Purpose by hand to drop "with meaning-based search".

### 10. Retired names: dead exceptions fail the check

`check-retired-names.mjs` reports, and exits 1 on, an `allow` path that is not a tracked file or whose text does not include the entry's name. The trim removes each such path; an entry left with an empty `allow` loses `allow` and `why`. No entry is removed.

New entries, each with its replacement: `QMD`, `documents-setup`, `documents-status`, `documents-refresh`, `evaluate-document-retrieval`, `qmd-retrieval`, `legacy-cloud-schedules`, `WONG_ROUTINES_KEY`, `startMoveIn`, `schedule.mjs move-in`, `references/migration.md`. Check each new name against live files first; a name that also matches kept text (for example a journey record under `.agents/verification/`) gets a narrower spelling, not a broad exception.

### 11. Release

One `## Next (major)` entry. Its **Updating.** note, in plain words: search needs no step; a computer that ran the QMD setup can delete the folder `wongstack/documents` in the user's data folder, about 1 GB; before the update, let any schedule move finish, and after it, ask the assistant to save a left-over routine or schedule file as a schedule; an install with the old Cloudflare runner removes it before the update. `check-module-versions.mjs` names each module whose folder changed; raise those versions (memory and daily at least). `measure-context.mjs --check` must pass; the skill text shrinks, so no cut is owed.

## Risks / Trade-offs

- [An install updates from a version below 49 and its routines stop without a move] → The journal line says so once a day, the **Updating.** note says it before the update, and `/schedule` saves each on request.
- [A person outside this computer still runs the old cloud runner] → The note tells them to remove it first; the runner and its keys are untouched by the update, so nothing is lost, only the commands.
- [A caller parses the version 1 packet] → The only shipped reader is the assistant; `operations.mjs` declares version 2, and the release is `major`.
- [A deleted test was the only cover for a kept behavior] → Decision 4 moves or re-adds those cases before the delete.
- [Another change edits `schedule.mjs` at the same time] → `helper-per-project` touches its usage line; bring `main` in before the save and resolve by keeping both edits.

## Migration Plan

Ship as one release. Rollback is a revert of the merge: no data is reshaped, and nothing outside the repo is deleted. After the release is live, in ClaymooApp (not part of this change): check whether "Monthly books close" moved; if not, save it as a schedule there by hand before ClaymooApp takes this update.
