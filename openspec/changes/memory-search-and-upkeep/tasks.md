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

- [ ] 6.1 Run the memory tests and payload checks in CI through `/save`. Verify CI passes.
