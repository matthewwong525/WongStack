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
