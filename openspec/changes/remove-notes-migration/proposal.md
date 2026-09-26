# Keep records from the removed notes migration readable

**Status:** in-progress
**Branch:** explore-r2-migration-folder
**Open questions:** none

## Why

WongStack 19.0.0 removed the notes migration: the `memory.mjs import` command, the sync step, and the manifest runbook. Two things were left behind. The memory-store spec still names "the migration" as a writer through the write gate, and no test or requirement protects the records that earlier imports wrote. This repo's own store depends on those records: live facts point readers to `memory.mjs source 114` and `source 120` for the text of migrated notes.

## What Changes

- The memory-store spec gets a requirement that stored records from an earlier notes migration stay readable. `migration:<slug>` sessions, facts with source `migration`, and `migration/<slug>.md` objects in R2 stay unchanged, and `memory.mjs source <fact-id>` prints the note text behind a migrated fact. The requirement also states that no command imports `notes/`. (review.html#/notes-migration)
- A test seeds a store with a migrated note and checks that `source` prints its text. A second test checks that `memory.mjs import` exits with an error and writes nothing.
- The write-gate requirement stops listing the migration as a writer.
- Release as WongStack 19.0.1.

**Non-goals:** No change to `memory.mjs`, the schema, stored rows, or R2 objects. No change to sync, the manifest, or the wiki; 19.0.0 already removed the notes path there. No work in downstream repos.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-store`: the write gate no longer names the migration among its writers, and a new requirement keeps records from earlier migrations readable.

## Impact

This change edits `openspec/specs/memory-store/spec.md` (through the delta), `scripts/tests/memory-store.test.mjs`, `VERSION`, and `CHANGELOG.md`. No shipped behavior changes. Installed repos get only the new test's guarantee: a later change that breaks `source` for migrated notes fails CI.

## Decision log

- **2026-09-25** — Asked what the `migration/` folder in R2 is → it holds each imported note's text, written by `memory.mjs import`.
- **2026-09-25** — Asked whether WongStack can assume that nothing is left to migrate → found that ClaymooApp (348 entries), WongOS (26), SuccessStoryClub (2), and wongstack-cloud (1) still have `notes/`. The user chose: WongStack does not document or support the migration, and each downstream repo decides for itself.
- **2026-09-25** — Asked how to version the release → chose major, 19.0.0, because a command and a sync behavior are removed.
- **2026-09-25** — Asked what sync does when a target still has `notes/` → chose to say nothing. `notes/` is ordinary target content.
- **2026-09-25** — Assumed: keep `migration` in the schema's CHECK constraints and in the script's source list. This repo's store holds migration sessions and facts (facts #114 and #120 cite migrated notes), and `source` reads any stored object key, so it needs no change.
- **2026-09-25** — Assumed: `scripts/tests/migration.test.mjs` stays. It tests the pre-16 generated-layer retirement, not notes.
- **2026-09-25** — Assumed: fix the stale `notes/<slug>.md` line in the change loop page in this change, because it describes the same retired surface. A memory fact had already listed it as a downstream finding.
- **2026-09-25** — Assumed: `scripts/fixtures/context-baseline.json` keeps its `notes/README.md` entries. It is a dated measurement, not a live reference.
- **2026-09-25** — Review page: one `tree` visual, `notes-migration`, owned by the `import` bullet, grouped as removed, edited, and kept. The review checker passes at desktop width and at 390 px.
- **2026-09-26** — `/ship` preflight found that `main` had moved to 19.0.0 (#105), which already removed `import`, its test, the sync step, the manifest section, the `wong-sync` requirement, and the stale change-loop line. The branch fast-forwarded to it and is now `explore-r2-migration-folder`. Asked what to do with this change → chose to ship the leftover as 19.0.1: the write-gate wording plus a requirement and tests that keep migrated records readable. The earlier 19.0.0 and sync decisions above are superseded by #105.
- **2026-09-26** — Implemented tasks 1.1 to 2.2. The two tests seed the fake store directly (no import path exists). The memory suite also ran locally once while the tests were written; CI stays the gate. The review page was redrawn for the smaller scope; the checker passes at desktop width and at 390 px.
- **2026-09-26** — Saved for CI (task 2.3). The memory-store delta is reconciled into `openspec/specs/memory-store/spec.md`. One session fact stored: which downstream repos still have `notes/`, and that each handles its own.
