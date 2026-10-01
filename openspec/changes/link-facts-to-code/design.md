# Design

## Context

See proposal.md, Why. Tags live in `tags` (name, definition, `alias_of`) and `fact_tags` (fact id, tag); `search --tag` already matches a tag and its aliases, under the team filter, newest first. On 2026-10-01 the store held 409 live facts; `memory` tagged 9, `ci` 6, `mini-apps` 5, and the Worker routing warning (#539) carried no code tag.

A write runs `putFacts`: `validateFact`, `tagProblems` (a tag must exist or come in `newTags`), then `writeStatements`, which already takes a per-fact `createdAt`. The fact insert's parameters are slug, type, body, session, source, created at, author; the Worker checks a member's author parameter against its own email and lets an admin key write any author. Consolidation (memory `SKILL.md`, *Background run* step 3) reads `live`, which prints no tags, and restates untagged threads with a verb tag.

`/apply` builds in a fresh helper that reads `references/build-helper.md`; with no helper, `/apply` works inline by the brief's *Build* steps. `scripts/measure-context.mjs --check` counts `build-helper.md`, `writing-facts.md`, and memory `SKILL.md`; `writing-facts.md` sits in the save routes, where `active-save` requires a reduction from its baseline.

## Goals / Non-Goals

**Goals:** the build sees the facts for the folders it edits before its first edit; older facts gain area tags without losing date, author, or transcript link; the list is a file a person can extend.

**Non-Goals:** area loading in `/plan`, `/explore`, or the digest; a tag write on an existing fact (a Worker statement change); globs or file-content matching.

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
- **Word budget.** No `--write-baseline`: each edited instruction file ends at or under its starting words and bytes, measured before and after with `measure-context.mjs --json`, and `--check` passes.

## Risks / Trade-offs

- [A wrong area loads noise] → the most specific prefix wins and the limit caps at 20; the list is one file to fix.
- [A path the plan never names] → the build loads nothing for it; plans already name their files in Impact and tasks.
- [Re-tagging churns ids] → a restated fact gets a new id, and the old one stays readable with `--all` and `source`; the digest orders by the kept date, so nothing moves.
- [A big first tidy-up] → re-tagging is ordinary consolidation work spread over runs; nothing waits on it.
- [A downstream's own folders] → the shipped list covers WongStack's layout; a repo adds entries, and sync treats the edited file as locally adapted.

## Migration Plan

None: no schema, Worker, or hook change. The next consolidation re-tags older facts; the next build loads areas. Rollback is reverting the release; re-tagged facts stay valid facts.
