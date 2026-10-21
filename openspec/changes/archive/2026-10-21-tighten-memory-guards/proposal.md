# Proposal

**Status:** planned
**Branch:** youthful-gopher
**Open questions:** none

## Why

The Cloudflare security check found four gaps in the team memory's guards, each reproduced with dummy data. A teammate with the lowest access can work out the words in someone else's private notes. They can also put fake text into everyone's start-of-chat summary. An old setup key keeps full memory access after the app goes private. And a teammate can backdate the record that tells the next wiki tidy-up where to start, so it skips new notes. Each is a small, local fix.

## What Changes

- **A search can't reach notes you aren't allowed to see.** Memory search only ever looks through the notes you may read: shared team notes and your own. Today a hand-written search can swap that list for one it makes up, then probe word by word what another person's private notes say. After this change, the list the search checks can't be replaced, however the search is written.
  ```mermaid
  flowchart TD
    q[a search] --> f["notes you may see"]
    f --> s[word search]
    q -. "can't swap" .-> f
  ```

- **Your start-of-chat summary shows only your own background run.** Its line about the last background save now comes only from your own sign-in's runs. It is always one short line inside the summary's size limit. A broken run record is skipped instead of blanking the summary. When your next tidy-up of memory is due is counted from your own runs too, so someone else's record can't put it off.
  | | Today | After |
  |-|-|-|
  | Whose run shows | the newest from anyone | yours |
  | A long or multi-line reason | printed as is | one line, cut short |
  | A broken run record | the summary fails | that run line is left out |

- **The setup key stops working once the app has a sign-in.** An app set up before its card was added gets a memory key with full access, saved on the setup computer. Once the app goes private, the memory store refuses that key, and memory uses each person's company sign-in instead. Rerunning setup after adding the card also turns the key off and removes it from the setup computer. Turning the key off can't be undone: a new one is only made for an app that is open again.
  ```mermaid
  flowchart TD
    open["open app: key works"] --> card[card added, setup rerun]
    card --> off["key off and removed"]
    off --> signin["company sign-in"]
  ```

- **A note's date is the date it was saved.** A teammate or a cloud schedule can no longer give a note a future date. A date ahead of the store's clock becomes the time it was saved. A re-tagged note keeps its original, earlier date. The wiki tidy-up also ignores a record of its last run that is dated in the future, or that claims to have read notes written after it.

**Non-goals:** the per-machine memory rework in the "installation-owned-memory-devices" workspace, which retires hand-written memory reads entirely; this change fixes today's code so the gaps close now. The author name a teammate puts on a note stays theirs to set: it only labels the note and never decides who owns it. The other parts of the security check each have their own workspace.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a non-admin read's full-text filter binds to a reserved shadow the caller can't redefine; runs rows carry their writer and the digest and consolidation state read only the caller's own; the run line is bounded, budgeted, and never throws; an open-site admin key is refused once the Worker has Access ids, and an unparsable expiry counts as expired; a non-admin fact's future `created_at` becomes the Worker's time.
- `cloudflare-provisioning`: the rerun that makes an open install private expires the open-site memory key and removes `CLOUDFLARE_MEMORY_TOKEN` from `.env`.
- `wiki-dream`: `lastDream` and `dreamChecks` ignore a dream fact dated in the future or claiming a fact id at or above its own.

## Impact

- `.agents/skills/memory/worker/statements.mjs` (reserved shadow names, fragment rewrite, `__mem_` refusal, run insert pinned to its writer, non-admin fact time), `memory-worker.mjs` (`keyCaller` takes `env`, refuses keys with Access ids; unparsable expiry; fact time passed to `memberStatements`).
- New migration `.agents/skills/memory/migrations/0009_run_owner.sql` (`runs.owner_subject`, index). Additive: the admin runs `memory.mjs migrate` before publishing, and old code ignores the column.
- `.agents/skills/memory/scripts/lib/digest.mjs` (`formatRun` hardening, run line inside the budget, runs and `CONSOLIDATION_STATE` scoped to `store.owner`).
- `.agents/skills/dream-memory/scripts/dream.mjs` (`isDreamFact` future and id checks).
- `.agents/skills/wong-setup/scripts/provision.mjs` (turn the key off when private), `.agents/skills/wong-setup/references/cloudflare.md` (card-later runbook), `wiki/development/memory.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-store.test.mjs` (digest), `dream.test.mjs`, `provision.test.mjs`.
- `CHANGELOG.md` minor entry with an Updating note.
- Overlap: the "installation-owned-memory-devices" branch replaces `statements.mjs` and the Worker's raw-SQL path and renumbers migrations; its rebase folds `0009_run_owner.sql` in. Its per-machine run scoping matches this change's per-person scoping, and it keeps today's `formatRun`, so the hardening carries over.

## Decision log

- **2026-10-21** — Assumed: fix the search with reserved shadow names the caller can't define, and rewrite the shared search fragment onto them at the Worker, not by widening the text guard, because the security check showed text guards miss comments and quoting, while a name the caller can't write can't be rebound.
- **2026-10-21** — Assumed: keep the existing guard against a read's own `facts` table as an extra refusal, because its tests pass and the other workspace deletes the file anyway.
- **2026-10-21** — Assumed: keep the client's search fragment text unchanged and rewrite it at the Worker, because computers that haven't updated still send today's text, and the admin's unshadowed reads need the plain names.
- **2026-10-21** — Assumed: scope the run line and the consolidation clock to the caller's own runs, not "own or the admin's", because the client can't tell which subject is an admin's, and the other workspace scopes both per machine.
- **2026-10-21** — Assumed: add a `runs.owner_subject` column with a migration, because no existing column can say who wrote a run; it is additive, so the admin applies it before publishing and no chat loses its summary in between.
- **2026-10-21** — Assumed: skip route-side length and format checks on run rows, because once a run reaches only its writer and the digest never throws, a bad row only affects the person who wrote it.
- **2026-10-21** — Assumed: refuse every memory key at the Worker while it has Access ids, not only those without an expiry, because the spec already says no key is accepted after the move to people, and this repo's live store turned its keys off on 2026-10-14.
- **2026-10-21** — Assumed: the rerun runs `migrate-people` to turn keys off, not a new command, because it already expires every key once the install record has a sign-in and reports notes waiting for an owner.
- **2026-10-21** — Assumed: replace a future fact date with the Worker's time and keep past dates, because re-tagging restates a note with its original date and a clock a few seconds ahead shouldn't fail a save.
- **2026-10-21** — Assumed: leave the author label caller-set, because the request named only the date, the label grants no ownership by spec, and pinning it would change how teammates' git emails show.
- **2026-10-21** — Assumed: drop the check's suggestion that a dream's body date equal its saved day, because the dream writes its own date, which can differ from the store's UTC day near midnight and would hide an honest dream.
- **2026-10-21** — Assumed: the full-text rank's corpus-wide statistics stay out of scope, because they predate this finding, give no note's words, and go away with the other workspace's fixed reads.
- **2026-10-21** — Asked whether a teammate's hand-written lookups should also see only their own background-run records, now that each record names its writer → chose to hide others' records from those lookups too.
- **2026-10-21** — Assumed: the after-publishing live check (admin search and digest, an old key refused, a teammate search on the live store) runs after `/ship` merges and is reported there, not kept as a task, because the archive takes only finished tasks and the check needs the published Worker. `migrate` was run on the live store before merging and recorded `0009`.
