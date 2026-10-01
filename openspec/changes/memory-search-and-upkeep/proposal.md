# Memory finds what you mean and keeps itself tidy

**Status:** in-progress

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
