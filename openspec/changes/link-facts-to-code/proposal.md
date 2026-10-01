# Link memory facts to the code they're about

**Status:** ready-to-ship

**Branch:** cold-fireant

**Open questions:** none

## Why

The assistant saves warnings like "when you touch the app's server routes, test every route, not just the new one". Today that warning comes back only if a search happens to hit its words. When the assistant builds a change that edits those same files, nothing connects the two, so the lesson can be missed exactly when it matters. On 2026-10-01 most saved facts had no tag naming the part of the code they concern; the routes warning had none.

## What Changes

- **Each fact names the part of the code it's about.** A short list matches folders to areas, such as the app's server code to *worker* and the memory scripts to *memory*. When the assistant saves a fact about code, it tags that area, the same way it already tags topics.
  ```text
   folder              area
  ───────────────────┼──────────
   app/worker/       │ worker
   app/src/apps/     │ mini-apps
   memory scripts    │ memory
   wiki/             │ wiki
  ```
- **Building a change loads the facts for the code it touches.** Before it edits anything, the build reads which folders the plan names, and loads the saved facts for those areas. A change to the app's server code brings up the routes warning before the first edit. Planning does the same for the files it expects to touch, and the assistant can look up the facts for any file whenever it needs them.
  ```text
   plan names app/worker/index.ts
              │
              ▼
        area: worker
              │
              ▼
   "test every route, not only
    the new one" (saved 9-30)
              │
              ▼
        build starts
  ```
- **Old facts get their area too.** The background tidy-up re-saves each older fact about a mapped folder with its area. The fact keeps its words, its date, who wrote it, and its link to the chat it came from. On a teammate's computer it re-tags only that teammate's own facts.
  ```text
   #539 routes warning  (no area)
              │  tidy-up
              ▼
   same words, same date,
   same author  + worker
  ```
- **Nothing gets longer to read.** The build's instructions grow by one step and lose as much elsewhere, and nothing is added to what every chat reads at the start.

Non-goals: a second database or a graph of facts; a change to how facts are stored; loading area facts at the start of a chat; matching by file contents rather than folder.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a fact tags the code area it concerns, mapped from folders by a shipped list; `memory.mjs areas` loads the live facts for a set of paths or a change's named paths; `memory.mjs retag` restates a fact with added tags, keeping its body, date, session, and author; consolidation re-tags older facts through it.
- `memory` also: `/explore` loads the areas of the paths it expects to touch beside its keyword search.
- `apply`: the build helper loads the facts for the areas the change's files fall in before it edits.

## Impact

- `.agents/skills/memory/references/areas.json` (new): area tag → definition and folder prefixes.
- `.agents/skills/memory/scripts/memory.mjs`, `scripts/lib/areas.mjs` (new): the `areas` and `retag` commands; `put-facts` and `retag` define a missing area tag from the list.
- `.agents/skills/memory/references/writing-facts.md`, `.agents/skills/memory/SKILL.md`, `.agents/skills/apply/references/build-helper.md`, `.agents/skills/explore/SKILL.md`: one line each, each file offset by an equal or larger cut.
- `scripts/tests/memory-areas.test.mjs` (new): coverage.
- `wiki/development/memory.md`: *Consolidation* and a short *Facts by code area* note.
- `CHANGELOG.md`: a `## Next (minor)` entry. No migration, schema, Worker, or hook change; `AGENTS.md` is unchanged.

## Decision log

- **2026-10-01** — Assumed: scope as settled from the graph-engineering research the same day: "link facts to the code they're about", ranked second after trigger tags on open threads (shipped in 29.1.0); existing tag tables, no schema change, no graph database (a second store was ruled out with Memanto on 2026-09-30).
- **2026-10-01** — Asked how older facts, which mostly carry no area tag (the Worker routing warning #539 has none), get their area → the background tidy-up re-tags them, keeping each fact's date and its link to its chat.
- **2026-10-01** — Assumed: areas are plain topic tags (`worker`, `memory`, `mini-apps`, `ci`, `wiki`…), not an `area:` namespace, because 29.1.0 chose plain verb tags over an `on:` namespace for the same reason: writers already use them, and facts already tagged `memory` or `ci` come up at once.
- **2026-10-01** — Assumed: the list is a JSON file in the memory skill, keyed by tag with a definition and folder prefixes, because code reads it, it ships with the skill, and a downstream's edits to it are protected by sync like any adapted file.
- **2026-10-01** — Assumed: the most specific matching folder wins, and an entry may name several tags, so `app/worker/apps/` loads `mini-apps` and `worker` but not the broad `stack-pack`.
- **2026-10-01** — Assumed: the load step goes in the build helper's brief, not `/apply`'s `SKILL.md`, because the helper is the fresh agent that edits files and facts loaded by the parent never reach it; `/apply`'s inline fallback follows the same brief.
- **2026-10-01** — Assumed: a script reads the change's own files for the paths, so the step is one command, and the model chooses which old facts to re-tag while a script copies them, so a restated fact's words can't drift.
- **2026-10-01** — Assumed: re-tagging keeps each fact's author; a teammate's key re-tags only its own facts, since the store refuses a member's insert under another email.
- **2026-10-01** — Assumed: no baseline re-record; each edited instruction file ends no longer in words or bytes than it started, which keeps `measure-context.mjs --check` and the save and resume routes from growing.
- **2026-10-01** — Measured before any text edit (`measure-context.mjs --json`, current words / bytes): `build-helper.md` 323 / 2080, `writing-facts.md` 275 / 1719, memory `SKILL.md` 920 / 6216. Each ends at or under these.
- **2026-10-01** — Assumed: checkpoint for gate task 4.3: tasks 1.1–4.2 are built and the memory tests pass locally (areas 7, store 30, worker 58); this save runs CI. The member re-tag test lives in `memory-worker.test.mjs`, which has the Worker harness; `areas.json`'s `mini-apps` definition was corrected to the 29.0.0 layout rather than copied stale from the store.
- **2026-10-01** — Assumed: gate task 4.3 done: CI passed on PR #229 after merging main 29.1.1 and 29.2.0 (changelog was the only conflict, kept both entries with this one on top); the spec deltas were copied into the main memory and apply specs at this save.
- **2026-10-01** — Asked, after the build, whether the assistant can search memory by code area outside a build → yes: list `areas <path>` in the memory skill's Read table, and have `/explore` run `areas` on the paths it expects to touch beside its keyword search, each offset in its own file. This reverses the earlier non-goal of no area loading in planning.
- **2026-10-01** — Measured before task 5.2's edits (`measure-context.mjs --json`, current words / bytes): memory `SKILL.md` 938 / 6367, `/explore` `SKILL.md` 665 / 4811. Each ends at or under these.
- **2026-10-01** — Assumed: checkpoint for gate task 5.3: 5.1–5.2 built; memory `SKILL.md` trimmed three more words after the helper left it one over its start (936 / 6342 against 938 / 6367); the modified *The verbs read memory where they decide* was copied into the main memory spec at this save.
- **2026-10-01** — Assumed: gate task 5.3 done: CI passed on PR #229 with area lookup in the memory skill's Read table and in `/explore`.
