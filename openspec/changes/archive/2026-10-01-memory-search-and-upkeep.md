<!-- openspec-archive v1 2026-10-01-memory-search-and-upkeep -->
<!-- file proposal.md utf8 12135 -->
# Memory finds what you mean and keeps itself tidy

**Status:** ready-to-ship

**Branch:** memory-system-explanation

**Open questions:** none

## Why

On 2026-10-01 the assistant looked into how well memory works in practice, using the real saved notes. Four things fell short:

- A search for *how should previews be checked* missed the note about checking every route on the preview, because search treats *previews* and *preview* as different words.
- 94 open questions sat unchecked, 82 of them not tied to any step that would check them.
- Look-alike labels piled up (*tests* and *testing*), and some descriptions went stale. No folder labels had been added yet, so a lookup on the app's server code found nothing.
- The assistant answered a plain question without searching memory first.

The tidy-up meant to fix the labels has run successfully only three times, because it waits for a full day *and* five newly saved chats.

## What Changes

- **Search matches different forms of a word.** *Previews*, *checked*, and *checking* find notes that say *preview* and *check*. Filler words like *how* and *should* no longer pull in unrelated notes. A fixed set of real questions now runs in the automatic checks, each with the notes it must find, so a later change can't quietly break search.
  ```text
   "how should previews be checked"
              │
     before   │   after
   ───────────┼─────────────────
   previews≠  │ previews = preview
   preview    │ checked  = check
   misses the │ finds "probe every
   route note │ route on the preview"
  ```
- **Every open question says who checks it, and stale ones close.** A new question must name the step (*plan*, *verify*, *sync*) or the code folder whose next visit should check it, or it isn't saved. Older questions get that label where their own words name one. One left unchecked for 30 days closes as *never checked*. It stays searchable, but it stops cluttering the list and the save check.
  ```text
   new question ──▶ names a step
                    or a folder?
                     │       │
                    yes      no ──▶ refused,
                     │            say which
                     ▼
                  saved
                     │ 30 days, unchecked
                     ▼
               closed: "never checked"
  ```
- **Labels stay clean.** Look-alike labels merge under one name, so a search on *memory* also finds notes labelled *memory-worker*. A label's description can now be corrected. Each folder label's description stays in step with the shipped list of folders.
- **The simple tidying runs on every save, as plain code.** Labelling notes by folder, merging look-alike labels, and closing stale questions happen each time memory saves, with no AI call and no waiting. The occasional AI tidy-up keeps only the work that needs judgment: merging notes that say the same thing, and settling contradictions.
  ```text
   every save         now and then
   (plain code)       (AI tidy-up)
   ─────────────      ─────────────
   folder labels      merge repeats
   merge labels       settle clashes
   close stale qs
  ```
- **Notes about a folder show up on their own.** The first time the assistant changes a file in a folder, during a chat, the open questions and recent notes for that folder appear before the edit, once per folder. This works in a plain request too, without the assistant having to remember to search. It works in Claude Code; Codex gets it only if its hooks report file edits.
  ```text
   assistant edits app/worker/index.ts
              │ first time this chat
              ▼
   ┌────────────────────────────────┐
   │ Memory for worker:             │
   │ • probe every route on the     │
   │   preview, not only the new one│
   └────────────────────────────────┘
              │
              ▼
          edit goes on
  ```

After updating, the person who set up memory runs one command to rebuild the search index. Until they do, search works as it does today.

Non-goals: meaning-based search (embeddings); deleting or rewording any note; changing what loads when a chat starts; loading notes before a file is only read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: search matches word stems and ignores filler words, guarded by a shipped question set; a `thread` must carry a verb or area tag; a deterministic upkeep pass runs after every `put-facts` and background run (area re-tags, verb re-tags, tag aliases and definitions, closing threads after 30 days); the model consolidation keeps only merges and contradictions; tags gain aliases and correctable definitions (admin); a pre-edit hook prints an area's facts once per area per session.

## Impact

- `.agents/skills/memory/migrations/0006_stemmed_search.sql` (new): rebuilds `facts_fts` with `tokenize = 'porter unicode61'`.
- `.agents/skills/memory/scripts/memory.mjs`: `ftsQuery` drops filler words; `put-facts` and `gate` refuse an untagged `thread`; new `upkeep` and `tag` commands; `put-facts` runs upkeep after its write.
- `.agents/skills/memory/scripts/lib/upkeep.mjs` (new): the deterministic pass.
- `.agents/skills/memory/scripts/before-edit.mjs` (new): the pre-edit hook.
- `.agents/skills/memory/worker/statements.mjs`: an admin-only tag update; members still only add.
- `.agents/skills/memory/references/areas.json`: an optional `aliases` list per area.
- `.agents/skills/memory/scripts/run.mjs`, `.agents/skills/memory/SKILL.md` (background run steps), `.agents/skills/memory/references/writing-facts.md`.
- `.claude/settings.json`, `.codex/hooks.json`: the pre-edit hook.
- `scripts/tests/memory-store.test.mjs`, `scripts/tests/memory-areas.test.mjs`, `scripts/tests/memory-worker.test.mjs`, `scripts/tests/fixtures/memory-search-questions.json` (new): coverage.
- `wiki/development/memory.md`: search, threads, tags, consolidation, and the hook.
- `CHANGELOG.md`: a `## Next (minor)` entry whose **Updating.** note asks the admin to run `memory.mjs migrate`.

## Decision log

- **2026-10-01** — Assumed: scope is the four gaps the assistant reported from the live store the same day (stemming misses, 94 open threads with 82 untagged, drifting tags with no `worker`-tagged fact, a plain request answered without a memory search), because the person asked to plan "all 4 together".
- **2026-10-01** — Asked how this relates to the open "File size limits for wiki and tests" workspace (`wiki-page-checks`), which splits `wiki/development/memory.md` and edits `links.mjs`, `areas.json`, and the memory `SKILL.md` → chose keep going here; the second to publish merges the other's edits.
- **2026-10-01** — Asked what happens to the 94 open threads → chose to tag each with its step or folder, and close one unchecked for 30 days as "never checked", still searchable.
- **2026-10-01** — Asked whether a folder's notes show up on their own the first time the assistant changes a file there in a plain request → chose yes, once per folder per chat.
- **2026-10-01** — Asked whether the simple tidying runs as plain code on every save → chose yes; the model consolidation keeps only merges and contradictions.
- **2026-10-01** — Assumed: stemming through FTS5's built-in `porter` tokenizer, rebuilt by a migration the admin runs with `memory.mjs migrate`, because it needs no new service and D1 ships FTS5 with it; search keeps working on the old index until the migration runs.
- **2026-10-01** — Assumed: keep the existing embeddings trigger in `stats`, and add a fixed question set in CI rather than a live check against each store, because expected fact ids differ per store and CI has no memory key.
- **2026-10-01** — Assumed: "30 days unchecked" counts from the thread's own date, which a re-tag keeps, so re-tagging never restarts the clock.
- **2026-10-01** — Assumed: a thread with no step or area tag is refused with a message naming the verb tags, rather than accepted with a warning, because a warning is what left 82 untagged.
- **2026-10-01** — Assumed: tag aliases and definition fixes are admin-only writes; a member's key still only adds, so the store's guard that members cannot change shared records holds.
- **2026-10-01** — Assumed: the new pass is called *upkeep*, not *tidy*, because `routine/scripts/tidy.mjs` already owns "the tidy-up" of workspaces.
- **2026-10-01** — Assumed: the hook prints facts only (threads first, at most 8 lines), not docs or past changes, to keep its context cost small; `/apply`'s fuller `areas --change` load stays as it is.
- **2026-10-01** — Assumed, at `/ship`: task 1.2 tests `porter` on a local D1 (`wrangler d1 execute --local`), not a throwaway cloud database, so publishing creates nothing in the person's Cloudflare account; the release's own `migrate` is the real-D1 check, and a refusal leaves the old index in place.
- **2026-10-01** — Assumed, at `/ship`: the post-release check (run `migrate`, then search *how should previews be checked*) moved from task 6.2 to a `verify`-tagged memory thread written at the checkpoint, because it can only run after the merge and an unchecked task would block the archive.
- **2026-10-01** — Checked (task 1.2): on a local D1 (`wrangler d1 execute --local`, wrangler 4.144.0, workerd's SQLite), migrations 0001–0005 then two facts: `"previews" OR "checked"` matched nothing. After 0006 it matched the old *preview* fact (rebuilt) and a fact written after the migration, so D1 accepts `porter unicode61` and `ALTER TABLE … RENAME` on the FTS5 table.
- **2026-10-01** — Checked (task 4.2): Claude Code 2.1.280 passes `PreToolUse` `additionalContext` to the model. A headless `claude -p` edit of `app/worker/index.ts`, in a throwaway repo on the test harness's fake store with `WONG_MEMORY_RUN=1`, quoted the `worker` fact word for word. The hook stays on `PreToolUse`.
- **2026-10-01** — Checked (task 4.3): Codex 0.159.2 fires `PreToolUse` for `apply_patch`, with the patch text in `tool_input.command` (`*** Update File: <path>` headers), and passes `additionalContext` to the model: a `codex exec` edit quoted the same fact. `.codex/hooks.json` gets the hook on matcher `apply_patch`, and `before-edit.mjs` reads paths from the patch's Add, Update, Delete, and Move headers. The run used `--dangerously-bypass-hook-trust` for the throwaway repo only; a real install asks once to trust the new hook.
- **2026-10-01** — Measured (task 5.1) with `node scripts/measure-context.mjs --json`, before any text edit: `.agents/skills/memory/SKILL.md` is 935 words, 6,339 bytes; `.agents/skills/memory/references/writing-facts.md` is 273 words, 1,715 bytes. Each ends at or under these.
- **2026-10-01** — Assumed, at build: `lib/upkeep.mjs` holds upkeep's decisions (`upkeepPlan`, `tagSync`, `closingBody`), and `memory.mjs` its reads and writes (`upkeep`, `upkeepLine`), because the writes reuse `retag` and `writeStatements` there and an import back into `memory.mjs` would be a cycle. The member-key upkeep case is tested in `memory-worker.test.mjs`, which already runs member keys through the route.
- **2026-10-01** — Assumed: checkpoint for gate task 6.1, inside `/ship`: tasks 1.1–5.4 built; merged main at 29.5.0 (`wiki-page-checks`, the overlapping workspace, shipped first). Conflicts in `CHANGELOG.md`, `payload-manifest.md`, and `areas.json` were resolved as the union: this entry on top, the pre-edit hook beside the renamed wiki check, and the `memory` aliases on main's new docs list. The memory tests (143) and the wiki, payload-link, retired-name, config, and context checks pass locally; this save runs CI.
- **2026-10-01** — Assumed: archive checkpoint: all 17 tasks ticked, CI passed on PR #235 for gate task 6.1; the spec deltas were applied to the main memory spec by the archive. Numbered 29.6.0 from main's 29.5.0.

<!-- end proposal.md -->
<!-- file design.md utf8 11662 -->
# Design

## Context

See proposal.md for why. The pieces this touches today:

- **Search.** `facts_fts` is an external-content FTS5 table with the default `unicode61` tokenizer (`migrations/0001_memory.sql`), so *previews* and *preview* are different tokens. `ftsQuery` (`scripts/memory.mjs`) OR-joins every word of three or more letters, filler included. The gate's "closest matches" and "open threads this may answer" use the same query. A member key may touch `facts_fts` only through the shared `FTS_HITS` fragment (`worker/statements.mjs`).
- **Threads.** `writing-facts.md` asks for a verb tag; nothing enforces it. The digest already lists only the current change's threads and counts the rest by verb tag (`lib/digest.mjs` `stepLine`). Open threads therefore never crowd the digest; they pile up in the count line and in the gate's "may answer" list.
- **Tags.** `tags.alias_of` exists, and `tagClause` already resolves one level of aliases. Nothing can set an alias or change a definition: the only tag write is `INSERT OR IGNORE`. A stored area definition (`mini-apps`) is stale since 29.0.0.
- **Consolidation.** It runs inside the background run only when 24 hours *and* five captured sessions have passed (`consolidationDue`). The `runs` table shows three successful runs, two of them empty. Re-tagging moved there in 29.3.0 and has not run yet.
- **Migrations.** `memory.mjs migrate` sends each unapplied file as one multi-statement query, then records it. The admin runs it after an update; a sync that adds a migration ends its plan with that task (`payload-manifest.md`).
- **Hooks.** Only `SessionStart`, in `.claude/settings.json` and `.codex/hooks.json`. `/wong-sync` merges a payload hook into a target's own file.

## Goals / Non-Goals

**Goals:** fix stemming at the index; make every new thread findable by the step or folder that should check it; give tags one owner for aliases and definitions; move rule-shaped tidying out of the model run; load a folder's facts without the agent remembering to.

**Non-Goals:** embeddings; rewording or deleting any fact; changing what the digest prints; a new store, service, or table; loading facts on reads.

## Decisions

### 1. Stemming through FTS5's `porter` tokenizer, rebuilt in place

`0006_stemmed_search.sql` creates `facts_fts_new` with `tokenize = 'porter unicode61'`, fills it with `INSERT INTO facts_fts_new (facts_fts_new) VALUES ('rebuild')`, drops the insert trigger and the old table, renames the new one to `facts_fts`, and recreates the trigger. Creating the new table before dropping the old one means a failure partway leaves the old index working. The name stays `facts_fts`, so `FTS_HITS`, the member guard, and every query keep working.

*Alternative:* stem in JavaScript before writing and querying. Rejected: it needs a stemmer dependency, a second body column, and every writer to agree on it. *Alternative:* trigram tokenizer. Rejected: it matches substrings, not word forms, and grows the index about three times.

### 2. Filler words dropped at query time

`ftsQuery` drops a short fixed list of English filler words (*how, should, what, when, which, does, the, and, for, with, that, this, from, into, about, have, been, would, could, there, their, them, then, than, also, just, only, some, any, all, our, your, you, are, was, were, can, will, not*). It keeps them when nothing else is left, so a query is never empty. BM25 already down-weights common words. The list fixes the case where a filler word is the *only* overlap, which the gate's "may answer" list showed on 2026-10-01.

### 3. A shipped question set guards search

`scripts/tests/fixtures/memory-search-questions.json` holds about ten real-shaped facts and the questions that must find each one in the top three, written in other word forms. Two cases come from 2026-10-01: *how should previews be checked* → the route-probe fact, and a query whose only shared word is filler → no match. `memory-store.test.mjs` loads the fixture into the node:sqlite store, which applies every migration, and asserts the ranks. The embeddings trigger in `stats` stays as it is: expected ids differ per store, and CI holds no memory key.

### 4. A thread must carry a verb or area tag

`validateFact` refuses a `thread` whose tags (aliases resolved) include no `VERB_TAGS` member and no area tag from `areas.json`. The refusal lists the verb tags. `gate` prints the same problem, so the writer fixes it before `put-facts`. The background run's spool path reports a refused spooled thread and keeps the file, as it does for any refused write.

*Alternative:* warn and accept. Rejected: a warning is what produced 82 untagged threads.

### 5. Upkeep: one plain-code pass, after every write

`scripts/lib/upkeep.mjs` exports `upkeep(ctx, store)`, also run as `memory.mjs upkeep`. It reads live facts with their tags under the key's team filter; a member's key keeps only its own facts. It then, in order:

1. **Closes stale threads.** A live `thread` whose `created_at` is 30 or more days old is superseded by a `project` fact on the same slug with the same tags, `source: 'consolidation'`: `Closed unchecked after 30 days (thread #<id>, <date>): <body>`, with the body cut at a word boundary to fit 400 characters. A re-tag keeps `created_at`, so re-tagging never restarts the clock.
2. **Re-tags by words.** It reads path-like words in a fact's body (backticked spans and tokens with a `/` or a file extension) through `areasOf`, and adds missing area tags. For a thread, it also maps `/explore`, `/plan`, `/apply`, `/save`, `/ship`, `/continue`, `/verify`, `/routine`, `/close`, `/improve`, `/wong-sync` → `sync`, and `/wong-setup` → `setup`, and adds the missing verb tags. It writes through the existing `retag` restate, so the body, date, session, and author are kept.
3. **Syncs tags (admin key only).** For each `areas.json` entry, it sets the stored definition to the list's when they differ, and sets `alias_of` on each listed alias that exists.

It caps restates at 50 per pass, leaving the rest for the next write, which keeps one batch within the route's limits. It prints one line, `upkeep: closed N, retagged M, tags K`, and never throws: `put-facts` catches its error and prints `upkeep skipped: <reason>` after the write has already succeeded. `put-facts` runs it after its own batch. `run.mjs` runs it once at the end of the background run, which covers captures and consolidation. Upkeep writes no `runs` row: the `runs.kind` CHECK allows only `capture` and `consolidation`, and a new kind would need a table rebuild.

*Alternative:* run upkeep from the session-start hook. Rejected: the hook has a 5-second budget and already spawns the background run, and the person chose "on every save".

### 6. Tag writes are admin-only

A new `ADMIN_WRITES.tagUpdate` (`UPDATE tags SET definition = ?, alias_of = ? WHERE name = ?`) lives outside `WRITES`, so `BY_SHAPE` never admits it. A member's key gets the existing refusal, *a member key may add facts, but not change or delete them*. `memory.mjs tag <name> [--definition <text>] [--alias-of <tag> | --no-alias]` is the admin's command; the consolidation run may use it for look-alikes that aren't areas (`user-preference`). It refuses an alias to itself, to an unknown tag, or to a tag that is itself an alias, which keeps `tagClause`'s one-level resolution correct. `areas.json` gains an optional `aliases` array per entry: `memory` → `memory-architecture`, `memory-worker`; `tests` → `testing`.

This retires the 29.3.0 note that "a stored definition never changes": an area tag's definition now follows `areas.json`.

### 7. The pre-edit hook

`scripts/before-edit.mjs` reads the hook's JSON from stdin: `session_id` and the edited path (`tool_input.file_path`, or `notebook_path`). It maps the path through `areasOf` and drops areas already listed in `statePath(ctx, 'shown-areas', <session>.json)`. For the rest, it queries live facts by tag under the team filter: threads first, then newest, eight lines in total. It prints them as `hookSpecificOutput.additionalContext` under the heading `Memory for <areas>:`, records the areas as shown, and exits 0 every time. It reads the store with a 2.5-second timeout, under a 3-second hook timeout, and an error prints nothing.

- **Claude Code:** `PreToolUse` with matcher `Edit|Write|MultiEdit|NotebookEdit` in `.claude/settings.json`. An apply task confirms that this host's Claude Code passes `additionalContext` from `PreToolUse` to the model. If it doesn't, the hook moves to `PostToolUse` on the same matcher: the first edit then goes ahead before the facts show, and every later edit sees them.
- **Codex:** an apply task checks whether this host's Codex fires `PreToolUse` for its file-edit tool (`apply_patch`) and what the input holds. If it does, `.codex/hooks.json` gets the same hook, with paths read from the patch headers. If not, Codex is documented as covered by the verbs only.
- **Showing nothing:** a file outside every mapped area, a store with no key, and offline all print nothing. `/apply`'s fuller `areas --change` load is unchanged, so inside a build the hook may repeat a few lines once per area. That cost is accepted to keep the hook independent of verbs.

### 8. Consolidation narrows to judgment

The memory `SKILL.md` background step 3 keeps merging repeats, settling contradictions, closing answered threads, and re-tagging only where reading a tag needs judgment. Steps that upkeep now does by rule are removed from it, which also offsets the words the new rules add (`measure-context.mjs --check`).

## Risks / Trade-offs

- **D1 may not accept the `porter` tokenizer** → The migration creates the new table before dropping the old one, so a failure leaves search as it was, and `migrate` stops at that file without recording it. An apply task runs the migration against a throwaway D1 database before release; if D1 refuses, the fallback is to stem in JavaScript (Decision 1's alternative) and the plan is updated.
- **Upkeep's first pass restates many facts at once** → The 50-per-pass cap spreads the work over several writes. Every restate supersedes, never deletes.
- **Closing a real thread after 30 days** → It stays searchable with `--all`, and its closing fact names its id. The person accepted this trade.
- **Path-like words over-tag** → `areasOf` uses the longest matching prefix and ignores broad roots that map nothing. The worst case is an extra tag on a fact, and an admin can supersede it.
- **Hook cost in long builds** → Eight lines at most, once per area per session.
- **Overlap with `wiki-page-checks`** → That change moves memory-key sections out of `wiki/development/memory.md` and edits `areas.json`'s docs lists. This change edits other sections and adds `aliases` fields. Whichever publishes second merges the other's edits.

## Migration Plan

1. Release with a `## Next (minor)` changelog entry. Its **Updating.** note: *after this update is live, the person who set up memory runs `node .claude/skills/memory/scripts/memory.mjs migrate` once to make search match word forms; search works as before until then.*
2. `/wong-sync` merges the new `PreToolUse` hook into each target's own hook files, as it does for `SessionStart`; `payload-manifest.md` names it.
3. The first write after the update runs upkeep. Area definitions and aliases settle at once on the admin's machine; restates and closures spread across writes, 50 at a time.
4. **Rollback:** reverting the code leaves the stemmed index in place, which the old query still reads correctly. Restated and closed facts stay superseded and recoverable with `--all`.

<!-- end design.md -->
<!-- file tasks.md utf8 6372 -->
# Tasks

## 1. Stemmed search

- [x] 1.1 Add `.agents/skills/memory/migrations/0006_stemmed_search.sql` by design.md Decision 1 (new `porter unicode61` table, rebuild, drop the old table and trigger, rename, recreate the trigger). Verify in `scripts/tests/memory-store.test.mjs` that the migration count matches the files and that a fact written after the migration is searchable.
- [x] 1.2 Apply migrations 0001–0006 to a local D1 database with `wrangler d1 execute --local` (workerd's SQLite, no Cloudflare resource), insert two facts, and search *previews* for a fact saying *preview*. Verify the search hits, and log the result in the Decision log. If `porter` is refused, stop and update the plan to Decision 1's alternative.
- [x] 1.3 Drop design.md Decision 2's filler words in `ftsQuery`, keeping them when nothing else is left. Verify unit tests: `how should previews be checked` gives `"previews" OR "checked"`, and `how should` stays non-empty.
- [x] 1.4 Add `scripts/tests/fixtures/memory-search-questions.json` (about ten real-shaped facts, each with questions in other word forms, plus a filler-only query that must match nothing) and a `memory-store.test.mjs` case that loads it and asserts each expected fact ranks in the top three. Verify the case fails on 0005's tokenizer and passes after 1.1–1.3.

## 2. Thread tags and tag control

- [x] 2.1 In `validateFact`, refuse a `thread` with no verb tag or area tag, aliases resolved, listing the verb tags; `gate` prints the same problem. Verify in `memory-store.test.mjs`: an untagged thread's batch is refused and stores nothing; a thread tagged `verify` or `worker` is stored; a refused spooled thread keeps its spool file.
- [x] 2.2 Add `ADMIN_WRITES.tagUpdate` in `worker/statements.mjs`, outside `WRITES`, and `memory.mjs tag <name> [--definition] [--alias-of | --no-alias]` with design.md Decision 6's refusals. Verify in `memory-worker.test.mjs` that a member key's tag update is refused and leaves the tag unchanged, and that the admin's is applied; verify in `memory-store.test.mjs` that `search --tag memory` returns a fact tagged only with its alias `memory-worker`, and that an alias to an alias is refused.
- [x] 2.3 Add optional `aliases` arrays to `.agents/skills/memory/references/areas.json` (`memory`: `memory-architecture`, `memory-worker`; `tests`: `testing`). Verify `memory-areas.test.mjs` checks that every alias is a string and never names an area tag.

## 3. Upkeep

- [x] 3.1 Add `.agents/skills/memory/scripts/lib/upkeep.mjs` and `memory.mjs upkeep` by design.md Decision 5: close threads 30+ days old, re-tag by path-like words and slash commands through `retag`, sync area definitions and aliases on the admin key only, capped at 50 restates, never throwing. Verify in `memory-areas.test.mjs`: a thread dated 31 days back is superseded by a `Closed unchecked after 30 days (thread #N, …)` fact of at most 400 characters; a fact naming `app/worker/index.ts` gains `worker` with body, date, session, and author kept; a thread naming `/wong-sync` gains `sync`; a member key changes only its own facts and no tags; a stale `mini-apps` definition is set to the list's; 60 candidates restate 50.
- [x] 3.2 Run upkeep after `put-facts`'s batch, catching any error as an `upkeep skipped: <reason>` line, and once at the end of `run.mjs`. Verify in `memory-store.test.mjs` that a `put-facts` whose upkeep batch fails still stores its fact and exits 0, and in `memory-capture.test.mjs` that a fake background run calls upkeep once.

## 4. The pre-edit hook

- [x] 4.1 Add `.agents/skills/memory/scripts/before-edit.mjs` by design.md Decision 7. Verify in `memory-areas.test.mjs`, feeding hook JSON on stdin: the first `app/worker/index.ts` edit prints `additionalContext` with the `worker` facts, threads first, at most eight lines; a second edit in the same session prints nothing; an unmapped path, a missing key, and an unreachable store print nothing; every case exits 0.
- [x] 4.2 On this host, confirm that Claude Code passes `PreToolUse` `additionalContext` to the model: add the hook to `.claude/settings.json` with matcher `Edit|Write|MultiEdit|NotebookEdit` and a 3-second timeout, then run a headless `claude -p` edit of an `app/worker/` file with `WONG_MEMORY_RUN=1`. Verify the model's reply quotes a `worker` fact. If it doesn't, switch to `PostToolUse` per Decision 7, and log the outcome in the Decision log.
- [x] 4.3 On this host, check whether Codex fires `PreToolUse` for `apply_patch` and what its input holds. If it does, add the hook to `.codex/hooks.json`, reading paths from the patch headers, and test that parsing in `memory-areas.test.mjs`. If it doesn't, leave `.codex/hooks.json` unchanged. Log the outcome in the Decision log either way.

## 5. Skill text and wiki

- [x] 5.1 Before editing text, record the words and bytes of `.agents/skills/memory/SKILL.md` and `.agents/skills/memory/references/writing-facts.md` with `node scripts/measure-context.mjs --json` in the Decision log. Verify both are logged.
- [x] 5.2 In memory `SKILL.md`: add `upkeep` and `tag` to the tables; narrow background step 3 to merges, contradictions, answered threads, and judgment re-tags (Decision 8); keep the run's `finish-run` counts. In `writing-facts.md`, make a thread's verb or area tag required. End each file at or under its 5.1 counts. Verify against the logged counts with `node scripts/measure-context.mjs --check`.
- [x] 5.3 In `wiki/development/memory.md`, update *How facts are captured* (thread tags are required), *Facts by code area* (definitions follow `areas.json`; retire "a stored definition never changes"), *Consolidation* (upkeep vs. the model run, with the real cadence), *When to add embeddings* (the question set), and add the pre-edit hook under *When memory loads*. In `.agents/skills/wong-sync/references/payload-manifest.md`, add the `PreToolUse` hook to the memory merge line. Verify with `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs`.
- [x] 5.4 Add `## Next (minor) — Memory finds what you mean and keeps itself tidy` at the top of `CHANGELOG.md`'s entries, in plain words, with design.md's Migration Plan step 1 as its **Updating.** note. Verify with `node scripts/check-openspec-config.mjs`.

## 6. Gate

- [x] 6.1 Run the memory tests and payload checks in CI through `/save`. Verify CI passes.

<!-- end tasks.md -->
<!-- file specs/memory/spec.md utf8 8448 -->
## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A word SHALL match its other forms (*previews* finds *preview*, *checked* finds *check*), and common filler words in a query SHALL NOT match on their own. A shipped set of questions, each with the facts it must find, SHALL guard this in CI. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author's full email, in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: A question in other word forms

- **WHEN** a live fact says "probe every Worker route on the preview" and the agent searches `how should previews be checked`
- **THEN** that fact ranks in the first three results, and a fact sharing only *how* or *should* does not

#### Scenario: Two authors share a name

- **WHEN** `operations@example.com` and `operations@example.org` each wrote a live fact
- **THEN** each fact's line names its author's whole email, so the two never read as one person

#### Scenario: A session's branch was renamed

- **WHEN** a session started on branch `magical-chicken`, wrote a fact on change `add-home-repo` and a fact on topic `paseo`, and the branch became `explore/home-mode`
- **THEN** a search by branch `explore/home-mode` and change `add-home-repo` returns both facts

### Requirement: Live facts are consolidated, never deleted

The background run SHALL periodically merge facts that say the same thing into one new fact, supersede contradicted facts, newest wins, and close an open thread that a later live fact shows was answered. It SHALL NOT delete a fact or edit its body. Work that needs no judgment (area and verb tags read from a fact's words, tag aliases and definitions, closing stale threads) SHALL NOT wait for this run: it belongs to upkeep.

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for one setting
- **THEN** the newer supersedes the older, and both bodies are unchanged

#### Scenario: A thread a later fact answered

- **WHEN** an open thread asks for a real phone test and a later live fact records that test passing
- **THEN** consolidation supersedes the thread with a fact that says so, and the thread's body is unchanged

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, and author, plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another author. Upkeep SHALL re-tag, through this restate, a live fact whose words name a path in a mapped folder and that lacks that area's tag, and an open thread whose words name a verb's run and that lacks the verb's tag. Consolidation MAY re-tag a fact whose area or verb needs judgment to read.

#### Scenario: An old warning gains its area

- **WHEN** upkeep finds fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, naming `app/worker/` with no `worker` tag
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

## ADDED Requirements

### Requirement: An open thread names who checks it

A new `thread` SHALL carry the tag of the verb or skill whose next run should check it (`plan`, `save`, `ship`, `sync`, `setup`, and the like), or the area tag of the folder whose next change should check it; a write without either SHALL be refused, saying which tags fit. The digest SHALL tell the agent to load a verb's open threads when that verb starts, by a tag search on `thread` facts. An older open thread with neither tag SHALL gain one when its words name a verb's run or a mapped path, restated with the same text. An open thread 30 days past its own date SHALL be closed as never checked by a fact naming its id; the thread's own words stay searchable with `--all`.

#### Scenario: A verb starts

- **WHEN** 87 open threads exist, 3 of them tagged `plan`, and `/plan` starts
- **THEN** the agent loads those 3 threads with their ages, and none of the other 84

#### Scenario: An untagged thread is written

- **WHEN** a save sends a `thread` with no verb or area tag
- **THEN** the write is refused with the list of verb tags, and nothing in the batch is stored

#### Scenario: A thread nobody checked

- **WHEN** an open thread written 2026-09-01 is still open on 2026-10-01
- **THEN** it is superseded by a fact saying it was never checked and naming its id, and it no longer counts as open

### Requirement: Upkeep runs on every save, without a model

After every memory write and every background run, the `memory` skill SHALL run upkeep: plain code, no model call, over the live facts the key may change. It SHALL re-tag facts and threads by their words, keep area tags' stored definitions and aliases equal to the shipped area list, and close stale threads. It SHALL change only the key's own facts for a teammate, and SHALL NOT stop or fail the write that started it; an unreachable store skips it until the next write.

#### Scenario: A save with old untagged facts

- **WHEN** `/save` writes one fact and the store holds 12 live facts naming `app/worker/` without `worker`
- **THEN** the save reports its fact, and the same run restates those 12 with `worker`, with no model call

#### Scenario: Upkeep cannot finish

- **WHEN** the save's fact is stored and upkeep's batch then fails
- **THEN** the save still succeeds, and the next write retries upkeep

### Requirement: Tags merge under one name and can be corrected

A tag SHALL be able to point at another as its alias, and the admin SHALL be able to correct a tag's definition. A search, area lookup, or thread load by a tag SHALL also return facts carrying its aliases. A member's or reader's key SHALL NOT change a tag. An area list entry MAY name aliases, which upkeep applies.

#### Scenario: A look-alike tag

- **WHEN** `memory-architecture` is an alias of `memory` and a live fact carries only `memory-architecture`
- **THEN** `search --tag memory` returns that fact, and `tags` shows `memory-architecture` as an alias of `memory`

#### Scenario: A member tries to change a tag

- **WHEN** a member's key sends a tag definition change
- **THEN** the store refuses it, and the tag is unchanged

### Requirement: A folder's facts show before the first edit there

When the agent first edits a file in a mapped folder during a session, a hook SHALL show that area's open threads and newest live facts before the edit, capped, under the same team filter as search, once per area per session. It SHALL never block or delay the edit beyond its timeout, and an unreachable store, an unmapped path, or an area already shown SHALL show nothing.

#### Scenario: First edit in the Worker

- **WHEN** a session first edits `app/worker/index.ts` and a live fact is tagged `worker`
- **THEN** the agent sees that fact before the edit, and a second edit in `app/worker/` shows nothing new

#### Scenario: The store is unreachable

- **WHEN** the hook cannot reach the store
- **THEN** the edit goes ahead, and the hook shows nothing

## REMOVED Requirements

### Requirement: An open thread waits for its verb

**Reason**: Replaced by *An open thread names who checks it*, which also accepts an area tag, refuses an untagged thread, closes a thread after 30 days, and moves re-tagging from consolidation to upkeep. Archive can't drop the old *An untagged thread at consolidation* scenario from a MODIFIED block.
**Migration**: None by hand; upkeep tags and closes existing threads on the next write.

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 47099 fence=~~~ -->
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
<title>Review · 2026-10-01-memory-search-and-upkeep</title>
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
<body data-change="2026-10-01-memory-search-and-upkeep">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-memory-search-and-upkeep</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">On 2026-10-01 the assistant looked into how well memory works in practice, using the real saved notes. Four things fell short:</p>
<p data-note="why-2" tabindex="0">A search for <i>how should previews be checked</i> missed the note about checking every route on the preview, because search treats <i>previews</i> and <i>preview</i> as different words.</p>
<p data-note="why-3" tabindex="0">94 open questions sat unchecked, 82 of them not tied to any step that would check them.</p>
<p data-note="why-4" tabindex="0">Look-alike labels piled up (<i>tests</i> and <i>testing</i>), and some descriptions went stale. No folder labels had been added yet, so a lookup on the app's server code found nothing.</p>
<p data-note="why-5" tabindex="0">The assistant answered a plain question without searching memory first.</p>
<p data-note="why-6" tabindex="0">The tidy-up meant to fix the labels has run successfully only three times, because it waits for a full day <i>and</i> five newly saved chats.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Search matches different forms of a word.</b> <i>Previews</i>, <i>checked</i>, and <i>checking</i> find notes that say <i>preview</i> and <i>check</i>. Filler words like <i>how</i> and <i>should</i> no longer pull in unrelated notes. A fixed set of real questions now runs in the automatic checks, each with the notes it must find, so a later change can't quietly break search.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> &quot;how should previews be checked&quot;</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">            │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">   before   │   after</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> ───────────┼─────────────────</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> previews≠  │ previews = preview</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> preview    │ checked  = check</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> misses the │ finds &quot;probe every</span>
<span class="ln" data-note="item-1-line-8" tabindex="0"> route note │ route on the preview&quot;</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Every open question says who checks it, and stale ones close.</b> A new question must name the step (<i>plan</i>, <i>verify</i>, <i>sync</i>) or the code folder whose next visit should check it, or it isn't saved. Older questions get that label where their own words name one. One left unchecked for 30 days closes as <i>never checked</i>. It stays searchable, but it stops cluttering the list and the save check.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0"> new question ──▶ names a step</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                  or a folder?</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                   │       │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                  yes      no ──▶ refused,</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">                   │            say which</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">                   ▼</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">                saved</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">                   │ 30 days, unchecked</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">                   ▼</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">             closed: &quot;never checked&quot;</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Labels stay clean.</b> Look-alike labels merge under one name, so a search on <i>memory</i> also finds notes labelled <i>memory-worker</i>. A label's description can now be corrected. Each folder label's description stays in step with the shipped list of folders.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The simple tidying runs on every save, as plain code.</b> Labelling notes by folder, merging look-alike labels, and closing stale questions happen each time memory saves, with no AI call and no waiting. The occasional AI tidy-up keeps only the work that needs judgment: merging notes that say the same thing, and settling contradictions.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0"> every save         now and then</span>
<span class="ln" data-note="item-4-line-2" tabindex="0"> (plain code)       (AI tidy-up)</span>
<span class="ln" data-note="item-4-line-3" tabindex="0"> ─────────────      ─────────────</span>
<span class="ln" data-note="item-4-line-4" tabindex="0"> folder labels      merge repeats</span>
<span class="ln" data-note="item-4-line-5" tabindex="0"> merge labels       settle clashes</span>
<span class="ln" data-note="item-4-line-6" tabindex="0"> close stale qs</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Notes about a folder show up on their own.</b> The first time the assistant changes a file in a folder, during a chat, the open questions and recent notes for that folder appear before the edit, once per folder. This works in a plain request too, without the assistant having to remember to search. It works in Claude Code; Codex gets it only if its hooks report file edits.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0"> assistant edits app/worker/index.ts</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">            │ first time this chat</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">            ▼</span>
<span class="ln" data-note="item-5-line-4" tabindex="0"> ┌────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-5" tabindex="0"> │ Memory for worker:             │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0"> │ • probe every route on the     │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0"> │   preview, not only the new one│</span>
<span class="ln" data-note="item-5-line-8" tabindex="0"> └────────────────────────────────┘</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">            │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">            ▼</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">        edit goes on</span></pre></div></details></li>
</ol>
<p class="aside">After updating, the person who set up memory runs one command to rebuild the search index. Until they do, search works as it does today.</p>
<p class="aside">Non-goals: meaning-based search (embeddings); deleting or rewording any note; changing what loads when a chat starts; loading notes before a file is only read.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: scope is the four gaps the assistant reported from the live store the same day (stemming misses, 94 open threads with 82 untagged, drifting tags with no <code>worker</code>-tagged fact, a plain request answered without a memory search), because the person asked to plan &quot;all 4 together&quot;.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how this relates to the open &quot;File size limits for wiki and tests&quot; workspace (<code>wiki-page-checks</code>), which splits <code>wiki/development/memory.md</code> and edits <code>links.mjs</code>, <code>areas.json</code>, and the memory <code>SKILL.md</code> → chose keep going here; the second to publish merges the other's edits.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked what happens to the 94 open threads → chose to tag each with its step or folder, and close one unchecked for 30 days as &quot;never checked&quot;, still searchable.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether a folder's notes show up on their own the first time the assistant changes a file there in a plain request → chose yes, once per folder per chat.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked whether the simple tidying runs as plain code on every save → chose yes; the model consolidation keeps only merges and contradictions.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: stemming through FTS5's built-in <code>porter</code> tokenizer, rebuilt by a migration the admin runs with <code>memory.mjs migrate</code>, because it needs no new service and D1 ships FTS5 with it; search keeps working on the old index until the migration runs.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: keep the existing embeddings trigger in <code>stats</code>, and add a fixed question set in CI rather than a live check against each store, because expected fact ids differ per store and CI has no memory key.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: &quot;30 days unchecked&quot; counts from the thread's own date, which a re-tag keeps, so re-tagging never restarts the clock.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: a thread with no step or area tag is refused with a message naming the verb tags, rather than accepted with a warning, because a warning is what left 82 untagged.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: tag aliases and definition fixes are admin-only writes; a member's key still only adds, so the store's guard that members cannot change shared records holds.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the new pass is called <i>upkeep</i>, not <i>tidy</i>, because <code>routine/scripts/tidy.mjs</code> already owns &quot;the tidy-up&quot; of workspaces.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the hook prints facts only (threads first, at most 8 lines), not docs or past changes, to keep its context cost small; <code>/apply</code>'s fuller <code>areas --change</code> load stays as it is.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed, at <code>/ship</code>: task 1.2 tests <code>porter</code> on a local D1 (<code>wrangler d1 execute --local</code>), not a throwaway cloud database, so publishing creates nothing in the person's Cloudflare account; the release's own <code>migrate</code> is the real-D1 check, and a refusal leaves the old index in place.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed, at <code>/ship</code>: the post-release check (run <code>migrate</code>, then search <i>how should previews be checked</i>) moved from task 6.2 to a <code>verify</code>-tagged memory thread written at the checkpoint, because it can only run after the merge and an unchecked task would block the archive.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Checked (task 1.2): on a local D1 (<code>wrangler d1 execute --local</code>, wrangler 4.144.0, workerd's SQLite), migrations 0001–0005 then two facts: <code>&quot;previews&quot; OR &quot;checked&quot;</code> matched nothing. After 0006 it matched the old <i>preview</i> fact (rebuilt) and a fact written after the migration, so D1 accepts <code>porter unicode61</code> and <code>ALTER TABLE … RENAME</code> on the FTS5 table.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Checked (task 4.2): Claude Code 2.1.280 passes <code>PreToolUse</code> <code>additionalContext</code> to the model. A headless <code>claude -p</code> edit of <code>app/worker/index.ts</code>, in a throwaway repo on the test harness's fake store with <code>WONG_MEMORY_RUN=1</code>, quoted the <code>worker</code> fact word for word. The hook stays on <code>PreToolUse</code>.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Checked (task 4.3): Codex 0.159.2 fires <code>PreToolUse</code> for <code>apply_patch</code>, with the patch text in <code>tool_input.command</code> (<code>*** Update File: &lt;path&gt;</code> headers), and passes <code>additionalContext</code> to the model: a <code>codex exec</code> edit quoted the same fact. <code>.codex/hooks.json</code> gets the hook on matcher <code>apply_patch</code>, and <code>before-edit.mjs</code> reads paths from the patch's Add, Update, Delete, and Move headers. The run used <code>--dangerously-bypass-hook-trust</code> for the throwaway repo only; a real install asks once to trust the new hook.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Measured (task 5.1) with <code>node scripts/measure-context.mjs --json</code>, before any text edit: <code>.agents/skills/memory/SKILL.md</code> is 935 words, 6,339 bytes; <code>.agents/skills/memory/references/writing-facts.md</code> is 273 words, 1,715 bytes. Each ends at or under these.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed, at build: <code>lib/upkeep.mjs</code> holds upkeep's decisions (<code>upkeepPlan</code>, <code>tagSync</code>, <code>closingBody</code>), and <code>memory.mjs</code> its reads and writes (<code>upkeep</code>, <code>upkeepLine</code>), because the writes reuse <code>retag</code> and <code>writeStatements</code> there and an import back into <code>memory.mjs</code> would be a cycle. The member-key upkeep case is tested in <code>memory-worker.test.mjs</code>, which already runs member keys through the route.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: checkpoint for gate task 6.1, inside <code>/ship</code>: tasks 1.1–5.4 built; merged main at 29.5.0 (<code>wiki-page-checks</code>, the overlapping workspace, shipped first). Conflicts in <code>CHANGELOG.md</code>, <code>payload-manifest.md</code>, and <code>areas.json</code> were resolved as the union: this entry on top, the pre-edit hook beside the renamed wiki check, and the <code>memory</code> aliases on main's new docs list. The memory tests (143) and the wiki, payload-link, retired-name, config, and context checks pass locally; this save runs CI.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: archive checkpoint: all 17 tasks ticked, CI passed on PR #235 for gate task 6.1; the spec deltas were applied to the main memory spec by the archive. Numbered 29.6.0 from main's 29.5.0.</li>
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
