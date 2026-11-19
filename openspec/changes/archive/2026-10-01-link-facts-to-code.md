<!-- openspec-archive v1 2026-10-01-link-facts-to-code -->
<!-- file proposal.md utf8 8237 -->
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
- **2026-10-01** — Assumed: archive checkpoint: all 12 tasks ticked, CI passed on PR #229; the spec deltas were already copied into the main memory and apply specs at earlier saves, so the archive skipped specs. Released as 29.3.0.

<!-- end proposal.md -->
<!-- file design.md utf8 7252 -->
# Design

## Context

See proposal.md, Why. Tags live in `tags` (name, definition, `alias_of`) and `fact_tags` (fact id, tag); `search --tag` already matches a tag and its aliases, under the team filter, newest first. On 2026-10-01 the store held 409 live facts; `memory` tagged 9, `ci` 6, `mini-apps` 5, and the Worker routing warning (#539) carried no code tag.

A write runs `putFacts`: `validateFact`, `tagProblems` (a tag must exist or come in `newTags`), then `writeStatements`, which already takes a per-fact `createdAt`. The fact insert's parameters are slug, type, body, session, source, created at, author; the Worker checks a member's author parameter against its own email and lets an admin key write any author. Consolidation (memory `SKILL.md`, *Background run* step 3) reads `live`, which prints no tags, and restates untagged threads with a verb tag.

`/apply` builds in a fresh helper that reads `references/build-helper.md`; with no helper, `/apply` works inline by the brief's *Build* steps. `scripts/measure-context.mjs --check` counts `build-helper.md`, `writing-facts.md`, and memory `SKILL.md`; `writing-facts.md` sits in the save routes, where `active-save` requires a reduction from its baseline.

## Goals / Non-Goals

**Goals:** the build sees the facts for the folders it edits before its first edit; older facts gain area tags without losing date, author, or transcript link; the list is a file a person can extend.

**Non-Goals:** area loading in the digest; a tag write on an existing fact (a Worker statement change); globs or file-content matching.

## Decisions

- **The list: `references/areas.json`**, keyed by tag:

  ```json
  {
    "worker": { "definition": "The main app's Worker: routes, assets, and run_worker_first.", "paths": ["app/worker/", "app/wrangler.jsonc"] },
    "mini-apps": { "definition": "…existing…", "paths": ["app/src/apps/", "app/worker/apps/"] },
    "memory": { "definition": "…existing…", "paths": [".agents/skills/memory/", "wiki/development/memory.md"] }
  }
  ```

  First entries: `worker`, `mini-apps`, `stack-pack` (`app/`), `ci` (`.github/`), `memory`, `review` (`.agents/skills/plan/scripts/`, `review-kit.html`), each verb's skill folder to its verb tag (`plan`, `apply`, `save`, `ship`, `verify`, `explore`, `continue`, `routine`, `close`, `improve`; `wong-sync` → `sync`, `wong-setup` → `setup`), `payload` (`.agents/rules/payload.md`, `payload-files.json`), `wiki` (`wiki/`), `openspec` (`openspec/`), `tests` (`scripts/tests/`), `cloudflare` (`scripts/cf-`). Definitions copy the store's for tags that exist. Alternative: a Markdown table in `writing-facts.md` — rejected; code must read it, and that page is in the save routes.
- **Matching (`lib/areas.mjs`).** Normalize a path to repo-relative with `.claude/` and `.codex/` read as `.agents/`. A path's areas are every tag whose prefix is the longest one matching it; equal-length matches all count. `app/worker/apps/x.ts` → `mini-apps`, `worker`; `app/src/Home.tsx` → `stack-pack`. Alternative: every matching prefix — rejected; `app/` would add `stack-pack`'s 12 facts to every app change.
- **`memory.mjs areas [paths…] [--change <name>] [--limit n]`.** With `--change`, add every backticked span in `openspec/changes/<name>/` `proposal.md`, `design.md`, and `tasks.md` that matches an area. Print one line `Areas: worker (app/worker/index.ts), memory (.agents/skills/memory/scripts/memory.mjs)`, then the live facts carrying any of those tags or their aliases, threads first, then newest first, up to `--limit` (default 20), under the same team filter as `search`. No area → `No mapped area for these paths.`; unreachable store → the standard *memory was not loaded* line, exit 0, so the build goes on. The query is `search`'s tag clause widened to a tag list; `search` keeps its single `--tag`.
- **`memory.mjs retag --file <input>`**, input `{ "retag": [{ "id": 539, "tags": ["worker"] }], "newTags": [] }`. One batch reads each fact and its tags (team filter applied); for each live fact missing one of the given tags, it writes a fact with the same slug, type, body, session, created at, and author, `source: "consolidation"`, the old tags plus the new, superseding the old id. It skips, and reports by id, a fact that is superseded, already carries every tag, or (member key) has another author, so one bad id never fails the batch. It reuses `writeStatements` with per-fact `sessionId` and `author` overrides beside the existing `createdAt`; the Worker's statements are unchanged. Alternative: the model restates through `put-facts` — rejected; it would retype 400-character bodies and could drift.
- **Area tags define themselves.** In `putFacts` and `retag`, a used tag missing from the store but present in `areas.json` joins `newTags` with the list's definition, so a writer never hits *tag does not exist* for an area.
- **Writing bar.** `writing-facts.md` gains, under *Specifics*: tag the code area a fact concerns; `memory.mjs areas <path>` prints it. Offset in the same file.
- **Consolidation.** Memory `SKILL.md` step 3.2's untagged-thread sentence becomes one sentence covering both: an open thread naming a verb's next run without its tag, or a fact about code in an `areas.json` folder without that area's tag, goes to `retag` with the tag. The verb-tag restate thereby also keeps dates. Offset in the same file.
- **Build step.** `build-helper.md` *Build* step 1 appends: then run `node <root>/.claude/skills/memory/scripts/memory.mjs areas --change "<name>"` and treat its facts as dated context the repo overrides. Offset in the same file, so `/apply`'s word count holds.
- **Lookup anywhere.** Memory `SKILL.md`'s *Read* table gains a row: facts for files or a change → `areas <paths…>` or `areas --change <name>`. `/explore`'s *Search memory before asking* runs `search <terms>` for the intent and `areas <paths>` for the paths it expects to touch, replacing "and the paths you expect to touch" on the keyword search, since a path as a search term misses facts that never name it. `/plan`'s bounded pass gets it through `/explore`. Each file is offset in itself.
- **Word budget.** No `--write-baseline`: each edited instruction file ends at or under its starting words and bytes, measured before and after with `measure-context.mjs --json`, and `--check` passes.

## Risks / Trade-offs

- [A wrong area loads noise] → the most specific prefix wins and the limit caps at 20; the list is one file to fix.
- [A path the plan never names] → the build loads nothing for it; plans already name their files in Impact and tasks.
- [Re-tagging churns ids] → a restated fact gets a new id, and the old one stays readable with `--all` and `source`; the digest orders by the kept date, so nothing moves.
- [A big first tidy-up] → re-tagging is ordinary consolidation work spread over runs; nothing waits on it.
- [A downstream's own folders] → the shipped list covers WongStack's layout; a repo adds entries, and sync treats the edited file as locally adapted.

## Migration Plan

None: no schema, Worker, or hook change. The next consolidation re-tags older facts; the next build loads areas. Rollback is reverting the release; re-tagged facts stay valid facts.

<!-- end design.md -->
<!-- file tasks.md utf8 4376 -->
# Tasks

## 1. Area list and lookup

- [x] 1.1 Before any text edit, record each file's words and bytes with `node scripts/measure-context.mjs --json` for `.agents/skills/apply/references/build-helper.md`, `.agents/skills/memory/references/writing-facts.md`, and `.agents/skills/memory/SKILL.md`, and note them in the Decision log. Verify the three counts are logged.
- [x] 1.2 Add `.agents/skills/memory/references/areas.json` with the first entries in design.md's *The list*, copying each existing tag's definition from `memory.mjs tags`, and `.agents/skills/memory/scripts/lib/areas.mjs` with path normalization and longest-prefix matching by design.md's *Matching*. Verify with unit tests in a new `scripts/tests/memory-areas.test.mjs`: `.claude/` paths match like `.agents/`, `app/worker/apps/x.ts` gives `mini-apps` and `worker` but not `stack-pack`, an unmapped path gives none, and every tag in the file has a non-empty definition.
- [x] 1.3 Add `memory.mjs areas [paths…] [--change <name>] [--limit n]` by design.md, reusing `search`'s team filter and alias clause widened to a tag list, and list it in the usage text. Verify in `memory-areas.test.mjs` against the test store: a change whose `tasks.md` names `app/worker/index.ts` prints `worker` and its fact; threads print first; `--limit` caps; a teammate's key does not see another person's `feedback` fact; no match prints `No mapped area for these paths.`; an unreachable store prints the not-loaded line and exits 0.

## 2. Re-tagging and self-defining tags

- [x] 2.1 Add `memory.mjs retag --file <input>` by design.md, with per-fact `sessionId` and `author` overrides in `writeStatements` beside `createdAt`. Verify in `memory-areas.test.mjs`: a re-tagged fact keeps slug, type, body, `created_at`, `session_id`, author, and old tags, gains the new tag, and supersedes the old id; an already-tagged or superseded id is skipped and reported; a member key's batch skips another author's fact and still writes its own.
- [x] 2.2 In `putFacts` and `retag`, add a used tag that is missing from the store but in `areas.json` to `newTags` with the list's definition. Verify a test where `put-facts` tags a fact `worker` in an empty store with no `newTags`, and the tag is stored with the list's definition.

## 3. Skill text

- [x] 3.1 In `writing-facts.md` under *Specifics*, add: tag the code area a fact concerns; `memory.mjs areas <path>` prints it. In memory `SKILL.md` step 3.2, merge the untagged-thread sentence with re-tagging facts about mapped folders, both through `retag`. In `build-helper.md` *Build* step 1, add the `areas --change "<name>"` load, as dated context the repo overrides. Trim each file so it ends at or under its 1.1 words and bytes. Verify with `measure-context.mjs --json` against the logged counts, and `node scripts/measure-context.mjs --check` passes.

## 4. Wiki and release

- [x] 4.1 In `wiki/development/memory.md`, add a short *Facts by code area* section (the list, how a fact gets its area, the build loading it, how a repo adds a folder) and extend *Consolidation* with re-tagging that keeps date, author, and chat. Verify it matches the spec deltas and `node scripts/check-payload-links.mjs` passes.
- [x] 4.2 Add `## Next (minor) — Link memory facts to the code they're about` at the top of `CHANGELOG.md`'s entries, in plain words, with no hand step to update. Verify `node scripts/check-openspec-config.mjs` passes.
- [x] 4.3 Run the memory tests and the payload checks in CI through `/save`. Verify CI passes.

## 5. Area lookup outside the build

- [x] 5.1 Before editing, record `.agents/skills/memory/SKILL.md` and `.agents/skills/explore/SKILL.md` words and bytes with `node scripts/measure-context.mjs --json` in the Decision log. Verify both counts are logged.
- [x] 5.2 Add the *Read* table row for `areas` to memory `SKILL.md`, and change `/explore`'s *Search memory before asking* to run `areas <paths>` on the paths it expects to touch beside `search <terms>`, by design.md's *Lookup anywhere*; add one line to `wiki/development/memory.md`'s *Facts by code area* that planning loads areas too. Trim each skill file to at or under its 5.1 counts. Verify with `measure-context.mjs --json` against the logged counts, `node scripts/measure-context.mjs --check`, and `node scripts/check-payload-links.mjs`.
- [x] 5.3 Run CI through `/save`. Verify CI passes.

<!-- end tasks.md -->
<!-- file specs/apply/spec.md utf8 741 -->
## ADDED Requirements

### Requirement: The build loads facts for the code it touches

Before its first edit, the build SHALL load the live memory facts for the areas the change's named files fall in, and treat them as dated context the repo overrides. A helper and an inline build SHALL do this alike. An unreachable store SHALL NOT stop the build.

#### Scenario: A Worker change

- **WHEN** `/apply` builds a change whose tasks edit `app/worker/index.ts`, and memory holds a Worker routing warning tagged `worker`
- **THEN** the build sees that warning before it edits the file

#### Scenario: Memory is down

- **WHEN** the store cannot be reached as the build starts
- **THEN** the build notes memory was not loaded and works the tasks

<!-- end specs/apply/spec.md -->
<!-- file specs/memory/spec.md utf8 3529 -->
## ADDED Requirements

### Requirement: A fact names the code area it concerns

The `memory` skill SHALL ship a list that maps folder and file prefixes to area tags, each with a definition, and a fact about code SHALL carry the area tag of the folder it concerns. A path's areas SHALL be the tags of its longest matching prefix, with `.claude/` and `.codex/` read as `.agents/`. An area tag missing from the store SHALL be defined from the list on its first write. Given paths or a change name, the skill SHALL print the matched areas and the live facts carrying those tags or their aliases, open threads first, then newest first, capped, under the same team filter as search; for a change it SHALL use the repo paths its proposal, design, and tasks name.

#### Scenario: A change touches the Worker

- **WHEN** a change's tasks name `app/worker/index.ts` and a live fact is tagged `worker`
- **THEN** loading the change's areas prints `worker` and that fact with its age and author

#### Scenario: The most specific folder wins

- **WHEN** the list maps `app/` to `stack-pack` and `app/worker/apps/` to `mini-apps` and `worker`
- **THEN** `app/worker/apps/hello/index.ts` loads `mini-apps` and `worker` facts, and no `stack-pack` facts

#### Scenario: No mapped folder

- **WHEN** none of the given paths matches the list
- **THEN** the command says no area matched and prints no facts

#### Scenario: The store is unreachable

- **WHEN** the area load cannot reach the store
- **THEN** it says memory was not loaded and exits without failing

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, and author, plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another author. Consolidation SHALL re-tag a live fact about code in a mapped folder that lacks that area's tag, and an open thread naming a verb's next run that lacks the verb's tag, through this restate.

#### Scenario: An old warning gains its area

- **WHEN** consolidation re-tags fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, with `worker`
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

## MODIFIED Requirements

### Requirement: The verbs read memory where they decide

`/explore` SHALL search memory before it asks a question (`asking-the-user`), by the intent's words and by the code areas of the paths it expects to touch; `/continue` SHALL read the slug's live facts and open threads, and `/close` SHALL read the session's and its change's facts before it closes. An unreachable store SHALL NOT stop a verb; it SHALL say memory was not loaded.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds facts for that slug
- **THEN** the recap shows its open threads and facts with their ages

#### Scenario: Planning a Worker change

- **WHEN** `/explore` expects to touch `app/worker/index.ts` and a live fact is tagged `worker` without naming that path
- **THEN** it loads that fact before its first question

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41366 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-01-link-facts-to-code</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-01-link-facts-to-code">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-link-facts-to-code</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The assistant saves warnings like &quot;when you touch the app's server routes, test every route, not just the new one&quot;. Today that warning comes back only if a search happens to hit its words. When the assistant builds a change that edits those same files, nothing connects the two, so the lesson can be missed exactly when it matters. On 2026-10-01 most saved facts had no tag naming the part of the code they concern; the routes warning had none.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each fact names the part of the code it's about.</b> A short list matches folders to areas, such as the app's server code to <i>worker</i> and the memory scripts to <i>memory</i>. When the assistant saves a fact about code, it tags that area, the same way it already tags topics.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> folder              area</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">───────────────────┼──────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> app/worker/       │ worker</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> app/src/apps/     │ mini-apps</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> memory scripts    │ memory</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> wiki/             │ wiki</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Building a change loads the facts for the code it touches.</b> Before it edits anything, the build reads which folders the plan names, and loads the saved facts for those areas. A change to the app's server code brings up the routes warning before the first edit. Planning does the same for the files it expects to touch, and the assistant can look up the facts for any file whenever it needs them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0"> plan names app/worker/index.ts</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">            │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">            ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">      area: worker</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">            │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">            ▼</span>
<span class="ln" data-note="item-2-line-7" tabindex="0"> &quot;test every route, not only</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">  the new one&quot; (saved 9-30)</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">            │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">            ▼</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">      build starts</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Old facts get their area too.</b> The background tidy-up re-saves each older fact about a mapped folder with its area. The fact keeps its words, its date, who wrote it, and its link to the chat it came from. On a teammate's computer it re-tags only that teammate's own facts.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0"> #539 routes warning  (no area)</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">            │  tidy-up</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">            ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0"> same words, same date,</span>
<span class="ln" data-note="item-3-line-5" tabindex="0"> same author  + worker</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Nothing gets longer to read.</b> The build's instructions grow by one step and lose as much elsewhere, and nothing is added to what every chat reads at the start.</div></div></li>
</ol>
<p class="aside">Non-goals: a second database or a graph of facts; a change to how facts are stored; loading area facts at the start of a chat; matching by file contents rather than folder.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: scope as settled from the graph-engineering research the same day: &quot;link facts to the code they're about&quot;, ranked second after trigger tags on open threads (shipped in 29.1.0); existing tag tables, no schema change, no graph database (a second store was ruled out with Memanto on 2026-09-30).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how older facts, which mostly carry no area tag (the Worker routing warning #539 has none), get their area → the background tidy-up re-tags them, keeping each fact's date and its link to its chat.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: areas are plain topic tags (<code>worker</code>, <code>memory</code>, <code>mini-apps</code>, <code>ci</code>, <code>wiki</code>…), not an <code>area:</code> namespace, because 29.1.0 chose plain verb tags over an <code>on:</code> namespace for the same reason: writers already use them, and facts already tagged <code>memory</code> or <code>ci</code> come up at once.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the list is a JSON file in the memory skill, keyed by tag with a definition and folder prefixes, because code reads it, it ships with the skill, and a downstream's edits to it are protected by sync like any adapted file.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the most specific matching folder wins, and an entry may name several tags, so <code>app/worker/apps/</code> loads <code>mini-apps</code> and <code>worker</code> but not the broad <code>stack-pack</code>.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the load step goes in the build helper's brief, not <code>/apply</code>'s <code>SKILL.md</code>, because the helper is the fresh agent that edits files and facts loaded by the parent never reach it; <code>/apply</code>'s inline fallback follows the same brief.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: a script reads the change's own files for the paths, so the step is one command, and the model chooses which old facts to re-tag while a script copies them, so a restated fact's words can't drift.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: re-tagging keeps each fact's author; a teammate's key re-tags only its own facts, since the store refuses a member's insert under another email.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: no baseline re-record; each edited instruction file ends no longer in words or bytes than it started, which keeps <code>measure-context.mjs --check</code> and the save and resume routes from growing.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Measured before any text edit (<code>measure-context.mjs --json</code>, current words / bytes): <code>build-helper.md</code> 323 / 2080, <code>writing-facts.md</code> 275 / 1719, memory <code>SKILL.md</code> 920 / 6216. Each ends at or under these.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: checkpoint for gate task 4.3: tasks 1.1–4.2 are built and the memory tests pass locally (areas 7, store 30, worker 58); this save runs CI. The member re-tag test lives in <code>memory-worker.test.mjs</code>, which has the Worker harness; <code>areas.json</code>'s <code>mini-apps</code> definition was corrected to the 29.0.0 layout rather than copied stale from the store.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: gate task 4.3 done: CI passed on PR #229 after merging main 29.1.1 and 29.2.0 (changelog was the only conflict, kept both entries with this one on top); the spec deltas were copied into the main memory and apply specs at this save.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked, after the build, whether the assistant can search memory by code area outside a build → yes: list <code>areas &lt;path&gt;</code> in the memory skill's Read table, and have <code>/explore</code> run <code>areas</code> on the paths it expects to touch beside its keyword search, each offset in its own file. This reverses the earlier non-goal of no area loading in planning.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Measured before task 5.2's edits (<code>measure-context.mjs --json</code>, current words / bytes): memory <code>SKILL.md</code> 938 / 6367, <code>/explore</code> <code>SKILL.md</code> 665 / 4811. Each ends at or under these.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: checkpoint for gate task 5.3: 5.1–5.2 built; memory <code>SKILL.md</code> trimmed three more words after the helper left it one over its start (936 / 6342 against 938 / 6367); the modified <i>The verbs read memory where they decide</i> was copied into the main memory spec at this save.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: gate task 5.3 done: CI passed on PR #229 with area lookup in the memory skill's Read table and in <code>/explore</code>.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: archive checkpoint: all 12 tasks ticked, CI passed on PR #229; the spec deltas were already copied into the main memory and apply specs at earlier saves, so the archive skipped specs. Released as 29.3.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
