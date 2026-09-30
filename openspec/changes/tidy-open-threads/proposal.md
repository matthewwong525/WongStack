# Keep open questions from crowding the session briefing

**Status:** in-progress

**Branch:** memanto-integration

**Open questions:** none

## Why

The briefing each session starts with is now nothing but open questions. This repo holds 87 of them, mostly "check this for real next time" notes. They fill all 40 lines, so decisions and preferences never make it into the briefing. Nothing retires a note once its check is done, so the pile only grows.

## What Changes

- **The briefing makes room for decisions and preferences.** Open questions on the work you are on still come first, all of them. Other open questions show only when they are under 30 days old, at most 8 of them. A line then says how many more there are and how to search them. Older questions stay saved and searchable; they only leave the briefing.
  ```text
     BEFORE                   AFTER
  ┌──────────────────┐   ┌──────────────────┐
  │ Memory digest    │   │ Memory digest    │
  │ thread           │   │ thread (yours)   │
  │ thread           │   │ thread  ┐        │
  │ thread           │   │  ...    │ up to 8│
  │ thread           │   │ thread  ┘ <30d   │
  │  ... 16 threads  │   │ 79 more threads: │
  │                  │   │   search them    │
  │ 398 more facts   │   │ feedback         │
  │                  │   │ project          │
  │                  │   │ reference, user  │
  └──────────────────┘   └──────────────────┘
  ```
- **A done check closes its note.** When a session saves facts, the save check now also lists open questions that sound like what the session did, even ones filed under other work. The writer closes each one the session answered, with a note saying what was found. This covers `/save` and the background run alike.
- **The daily tidy-up closes answered questions.** When a later note shows an open question was answered, the tidy-up closes the question.

Non-goals: Memanto or any second memory store; more kinds of fact; smarter meaning-based search; deleting or rewriting any fact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: the digest caps and ages out other changes' threads; the write gate surfaces matching open threads across slugs; consolidation closes resolved threads.

## Impact

- `.agents/skills/memory/scripts/lib/digest.mjs`: separate thread and fact queries, the 8-thread cap, the 30-day window, the "more open threads" line.
- `.agents/skills/memory/scripts/memory.mjs`: `gate` prints up to 3 keyword-matched open threads on other slugs.
- `.agents/skills/memory/SKILL.md`, `references/writing-facts.md`: closing a thread through the gate and in consolidation.
- `wiki/development/memory.md`: the digest and consolidation paragraphs.
- `scripts/tests/memory-store.test.mjs`: digest and gate coverage.
- `CHANGELOG.md`: a `## Next (minor)` entry. No migration, no schema change, no Worker change.

## Decision log

- **2026-09-30** — Asked whether to add Memanto or borrow its ideas → borrow, not add: a second store would split memory, and its cloud sends data outside the repo's own Cloudflare account.
- **2026-09-30** — Asked which of the borrowed ideas to plan → the three thread fixes: close a note when its check is done, age old notes out of the briefing, cap notes in the briefing.
- **2026-09-30** — Assumed: an aged-out thread stays live and searchable rather than being superseded, because superseding would need the admin to close teammates' threads and would hide checks that are still worth doing.
- **2026-09-30** — Assumed: 30 days and 8 threads, because of the 83 threads this key sees today, 72 are under a week old and 11 are over 30 days. So the cap does most of the work, and 8 leaves over half the 40 lines for other facts. Both are constants a reviewer can change.
- **2026-09-30** — Assumed: the current change's threads stay uncapped and unaged, because they are the work in hand and the digest already puts them first.
- **2026-09-30** — Assumed: the gate finds matching threads by keyword in code, not by the model reading every thread, because a model reading all 87 threads for every session would be slow and costly, and code does it the same way each time.
- **2026-09-30** — Assumed: the live-briefing check moves out of the task list into a memory thread written at save, because it can only run after the release is live, and /ship never archives an unticked task.
- **2026-09-30** — Assumed: the CI checks for tasks 1.2 and 2.2 run in one /save once both tests are written, because one CI run covers both and saves a round.
- **2026-09-30** — Assumed: the build is complete apart from CI for tasks 1.2 and 2.2; this save runs it. The helper also made the digest print when its only facts are the current change's threads, a case the split queries would otherwise have left empty.
