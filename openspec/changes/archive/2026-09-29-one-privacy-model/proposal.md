# Memory stays in its own repo, with one rule for who sees it

**Status:** ready-to-ship
**Branch:** team-memory-segmentation
**Open questions:** none

## Why

"Private" in memory means four different things today: personal facts hidden only by your own computer, a read-only teammate's facts, private life sent to a special home repo, and a `#private` word that stops a chat being saved. Repos already keep memory apart, so a special home on top of that adds a second system without a second need. And the "hidden" part isn't really hidden: any teammate can show your preferences with one flag.

## What Changes

- **Each repo's memory is its own.** Nothing is sent from one repo to another, and nothing loads from another repo when a chat starts. Home becomes an ordinary repo you happen to use alone: setup no longer asks whether a repo is your home, and nothing records one on your computer.
  ```text
  before                      after
  ┌───────────┐   ┌──────┐    ┌───────────┐ ┌──────┐
  │ work repo │──▶│ home │    │ work repo │ │ home │
  │           │◀──│      │    │  memory   │ │memory│
  └───────────┘   └──────┘    └───────────┘ └──────┘
  private life goes home,     nothing crosses
  your likes come back
  ```
- **Inside a repo, two levels: the team, or only you.** The memory page gets one table of what each person can see. Every other page links to it instead of restating it.
  ```text
  ┌─────────────────────┬─────┬───────────┬───────┐
  │ what                │ you │ teammates │ admin │
  ├─────────────────────┼─────┼───────────┼───────┤
  │ decisions, open     │ yes │ yes       │ yes   │
  │ questions, links    │     │           │       │
  │ about you: likes,   │ yes │ no        │ yes   │
  │ habits, your life   │     │           │       │
  │ a read-only         │ yes │ no        │ yes   │
  │ teammate's facts    │     │           │       │
  │ your chats          │ yes │ no        │ yes   │
  └─────────────────────┴─────┴───────────┴───────┘
  ```
- **"Only you" becomes a real lock.** Today your computer hides a teammate's personal facts, and one flag shows them. After this, the server itself keeps them back, however a teammate asks. The admin still sees everything, as before. In a repo only you use, you are the admin.
- **`#private` goes away.** Typing it no longer stops a chat being saved. Chats already marked private stay unsaved.
- **What this costs you.** Your preferences no longer follow you from one repo to another: each repo learns them on its own. Something personal you say in a work chat stays in that work repo, where the admin can read it. For anything you want no one else to see, use a repo only you use.
- **The browser pages move.** Saved logins, pictures of the browser, and handing the browser over lived on the home page. They move to their own page, unchanged.

Non-goals: no change to who reads chats, no new kind of fact, and nothing already in a home store is moved or deleted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: the Worker enforces the team's personal-fact and reader-fact filters for member and reader keys; `--everyone` widens only the admin's view; the home digest part, private-life routing to home, and the `#private` marker are removed.
- `install-onboarding`: setup no longer asks for or records a home.
- `knowledge-center`: private life goes only in a repo no one else reads, with no named home.
- `workspace-cleanup`: `/close` skips uploading only a session an earlier version recorded as private; no word in a message keeps it out.

## Impact

- `.agents/skills/memory/worker/memory-worker.mjs`, `worker/statements.mjs`: member and reader reads see only facts they may see; a role header.
- `.agents/skills/memory/scripts/memory.mjs`, `scripts/lib/digest.mjs`, `scripts/lib/store.mjs`, `scripts/lib/transcripts.mjs`: drop `--home`, the machine record, the From home digest part, `isPrivate`, and the `private` run count.
- `.agents/skills/memory/SKILL.md`, `references/writing-facts.md`, `.agents/skills/wong-setup/SKILL.md`, `.agents/skills/wong-sync/references/payload-manifest.md`.
- Wiki: `wiki/development/memory.md` (the table), `wiki/development/home.md` removed and its browser sections moved to `wiki/development/browsing.md`, links updated in `AGENTS.md`, `README.md`, `wiki/wiki-style.md`, and the rest.
- Tests in `scripts/tests/memory-*.test.mjs` and the memory test harness.
- A payload release: a `CHANGELOG.md` entry, and retired names in `scripts/retired-names.json`.

## Decision log

- **2026-09-29** — Asked where facts about you should live → chose keep today's split: work preferences stay in the team store.
- **2026-09-29** — Asked what happens for someone with no home → chose fall back to the team store, hidden from teammates; superseded by per-repo memory below, where no one has a home.
- **2026-09-29** — Asked whether a work preference shows in your other repos → chose only where it came from.
- **2026-09-29** — Asked what the plan covers → chose the table, the real lock, and removing `#private`.
- **2026-09-29** — Asked how strictly memory stays in its own repo → chose fully separate: nothing sent to home, nothing loaded from home.
- **2026-09-29** — Assumed: sessions already recorded as private stay unsaved and keep their status, because un-marking them would upload chats someone asked to keep out.
- **2026-09-29** — Assumed: the server matches "your own" facts on the key's email only, because it can't trust a people page from a branch; since keys exist, every member fact is written under the key's email anyway.
- **2026-09-29** — Assumed: `--everyone` stays and widens only the admin's view, because a member's flag would now do nothing.
- **2026-09-29** — Assumed: no store migration, because the lock uses columns every store already has, and a store before the reader schema has no reader facts to hide.
- **2026-09-29** — Assumed: the browser sections move to a new `browsing.md` page, not stay on a page named Home, because home no longer means anything special.
- **2026-09-29** — Assumed: the wiki's private-life rule becomes "only in a repo no one else reads", because a shared repo's wiki is readable by the team through git.
- **2026-09-29** — Assumed during the build: the `workspace-cleanup` spec's `/close` transcript rule also drops `#private`, because it restated the marker this change removes, and a stale spec would keep naming a retired word.
- **2026-09-29** — Assumed during the build: a member read may not name `sqlite_dbpage` either, because raw database pages would get round the lock as a schema-qualified name does.
- **2026-09-29** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: a member read that defines its own `facts` or `fact_tags` CTE, at any depth, is refused, because a nested one would replace the filtered facts inside the search fragment.
- **2026-09-29** — Archive checkpoint: all tasks done and archived by `/ship`; released as 27.0.0.
