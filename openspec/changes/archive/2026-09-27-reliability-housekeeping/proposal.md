# Reliability fixes and housekeeping

**Status:** planned
**Branch:** loud-walrus
**Open questions:** none

## Why

Four small things quietly tell the wrong story. The memory's background run can say it saved sessions when it saved nothing. Publishing can miss the notes a chat left if its branch was renamed. The guide to adding a skill doesn't say what a skill kept only in WongStack skips. And the link check never looks at the setup skill, so a broken link there slips through.

## What Changes

- **The memory report counts what was really saved.** The background run no longer reports its own numbers. The memory tool tallies what each save actually stored, and the report shows that tally. When the run's claim differs, the report says so.
  ```text
  run saves sessions
        │
        ▼
  tool tallies each save
        │
        ▼
  report = the tally
  (+ "claim differed")
  ```
- **Publishing finds a chat's notes after a rename.** When it gathers notes to keep, publishing also looks up every chat that wrote a note about the change, not only chats that began on the current branch name.
  ```text
  notes to keep =
    chats on this branch
    + chats with a note
      on this change
  ```
- **The add-a-skill guide covers WongStack-only skills.** A skill that stays in WongStack, like the dependency updater, does only the first step. It skips the install list, setup, and the release notes.
- **The link check covers the setup skill.** Links from the setup skill, and the dependency updater, are checked against WongStack itself, headings included. A renamed heading they point at now fails the check.

**Non-goals:** changing how `/ship` treats local branches; checking heading links across the rest of the payload; the other two parts of this request (Codex reading the rules, memory security).

**Separately, with your OK:** clear the 142 old local branches in the main copy whose online copy is gone. This is a one-time cleanup, listed as the last step; it changes no file and nothing is deleted before you confirm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: search gains a filter for facts from the sessions that worked on a change; the background run's recorded counts come from what the store wrote, not from the model.
- `delivery-gate`: the distill step also reads facts from sessions that wrote a fact on the change, so a renamed branch loses none.
- `payload-checks`: the link check also resolves links and heading anchors in source-only skills against the source repo.

## Impact

- Memory: `.agents/skills/memory/scripts/memory.mjs` (`search --change`, a run tally written by `put-facts` and `strip`, read by `finish-run`), `.agents/skills/memory/scripts/run.mjs` (starts and removes the tally), `.agents/skills/memory/scripts/lib/digest.mjs` (the run line notes a differing claim), `.agents/skills/memory/SKILL.md` (Read table and runbook step 4).
- Ship: `.agents/skills/ship/SKILL.md` (distill commands).
- Link check: `scripts/check-payload-links.mjs`, `scripts/tests/payload-links.test.mjs`.
- Tests: `scripts/tests/memory-capture.test.mjs`, `scripts/tests/memory-store.test.mjs`.
- Wiki: `wiki/development/adding-a-skill.md`, `wiki/development/memory.md` if it restates the run's counts.
- `CHANGELOG.md` gets a `## Next (patch)` entry; `/ship` numbers it.
- Outward, outside the change: local branches in `/root/WongStack`.

## Decision log

- **2026-09-27** — Asked for the scope of this part → chose the five settled items: honest capture counts (fact #169), distill after a branch rename (#178), the source-only skill note (#60), link-check coverage of wong-setup (#55), and a one-time cleanup of gone local branches (#87) as an outward step with a confirm, outside the change.
- **2026-09-27** — Assumed: the run's counts come from a tally the memory script writes as each `put-facts` and `strip` returns, in the clone's state folder, rather than a store query by time window, because a user's own `/save` can write session rows during a run and a time window would count them.
- **2026-09-27** — Assumed: `finish-run` records the tally and ignores the model's numbers, noting in the run's reason when they differ, because the fact (#169) asks that a hedging model cannot report a false success; the model still calls `finish-run` so it can report a failure.
- **2026-09-27** — Assumed: consolidation counts come from the same tally (facts written with source `consolidation`), because `stats` reads them for the embeddings trigger and has the same trust gap.
- **2026-09-27** — Assumed: the rename fix matches the change slug's sessions, not old branch names from the reflog, because a session that worked on the change writes a fact on its slug wherever the rename happened, and the reflog is local and absent after a Paseo rename in another checkout.
- **2026-09-27** — Assumed: on `main`, distill also runs the slug-session search, because unlike `--branch main` it is bounded to the change.
- **2026-09-27** — Assumed: source-only skills are derived as the skill folders no manifest category lists (today `wong-setup` and `update-dependencies`), so a new one is covered with no list to keep.
- **2026-09-27** — Assumed: heading anchors are checked only for source-only skills, because the fact names anchors as the gap there, and turning anchor checks on across the payload may surface unrelated breakage in a housekeeping change.
- **2026-09-27** — Assumed: a patch release, because each item fixes or documents existing behavior.
- **2026-09-27** — Assumed: the branch cleanup deletes only branches not checked out in any worktree and whose tip matches a merged pull request's head, and lists the rest for you, because a gone upstream alone does not prove the work landed.
- **2026-09-27** — Assumed: a `put-facts --home` that finds no home recorded counts every fact in its input as dropped, and a home write adds nothing else to the tally, because the runbook counts `no home recorded` as dropped and home facts are not this repo's capture.
- **2026-09-27** — Assumed: the model's `--counts` is compared only on known count keys, and on a failed run its own reason comes first with the differing-counts note after, so no free text from the model reaches the note.
- **2026-09-27** — Local checks: lint and the c8-wrapped script suite pass (484 tests: 475 pass, 9 skip, 0 fail); the payload link check, now reading 33 heading links in `wong-setup` and `update-dependencies`, found none broken; the OpenSpec config check, the retired-names check, strict spec validation, and the context check pass.
- **2026-09-27** — Asked whether to delete the gone local branches in the main checkout → chose the 138 whose tip equals a merged pull request's head; deleted all 138. Kept `server-setup-script` and `update-openspec` (checked out in worktrees), `explore/setup-usage-ux` (one unpushed renumber commit; its work shipped as #150), and `climu-dev-vars-commands` (PR #17 closed unmerged).
- **2026-09-27** — Distilled facts before the archive: no repeatable fact; the store had no facts for this change or its branch.
