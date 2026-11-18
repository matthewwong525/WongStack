<!-- openspec-archive v1 2026-09-25-add-memory-store -->
<!-- file proposal.md utf8 17989 -->
# Add a fact memory for every session

**Status:** ready-to-ship
**Branch:** explore/auto-memory-consolidation
**Open questions:** none

## Why

A session's context enters the repo only when someone runs `/save`, and many sessions end without one, so what they worked out is lost. When context is saved, nothing reads it again: the start of a session loads no memory, only `/continue` reads a note, and no step removes a stale or duplicate note. Notes in git also do not suit a team: every note is public in a public repo, a protected `main` turns each capture into a pull request, and grep is the only search.

## What Changes

- **BREAKING:** Every WongStack repo gets a **memory store** on Cloudflare: one D1 database named `<repo>-memory`, plus a private R2 bucket of the same name when the account has R2 enabled. The store is reached through the Cloudflare REST API with a dedicated memory token that CI never receives. Setup and sync provision it, and Cloudflare becomes a required account. R2 is optional because it needs a payment method on file. Without R2, raw transcripts are not stored, and everything else works the same.
- **Facts replace notes.** The unit of memory is a short typed fact (`user`, `feedback`, `project`, `reference`, or `thread`) of at most 400 characters, with its slug, author, time, and source session. A fact is never edited. A later fact supersedes it, and a `thread` fact is an open question that stays open until a fact supersedes it. When R2 is enabled, it keeps each full raw transcript forever, so facts can be extracted again. (review.html#/memory-schema)
- **A write gate stops duplicates.** Before a fact is stored, the script shows the model the live facts on the same slug and the closest keyword matches. The model adds the fact, supersedes an older one, or drops it. Search is keyword search (FTS5) with tags. Embeddings are deferred until a measured signal shows keyword search misses duplicates.
- **A digest loads at session start.** The `SessionStart` hook prints a bounded digest of live facts, plus the open threads of the current branch's change. Code builds the digest with no model, from one query, with a local cache as the fallback. It stays frozen for the session. (review.html#/memory-flow/digest)
- **Capture runs in a detached background process.** When past sessions of this repo have no facts, the hook starts a background run of the same agent's command-line tool with a small model, and returns at once. The main agent launches nothing, so your first reply carries no memory cost. The run reads Claude and Codex transcripts idle for 1 hour or more, at most 5 per run. It never reads its own sessions or subagent transcripts. A `#private` tag in any of your messages skips the whole session.
- **The same background run consolidates.** When 24 hours and 5 captured sessions have passed since the last consolidation, it merges duplicate facts, supersedes contradicted ones newest-wins, and records what it merged. No command needs to be run by hand.
- **The verbs read memory.** `/explore`, and `/plan` through it, search the store on the intent before they ask a question. `/continue` reads the slug's live facts and open threads. Every printed fact shows its age, author, and source. `/save` extracts facts through the write gate. A fact that cannot reach the store waits in an ignored local spool.
- `/ship` distills reusable process facts from the change's facts into the owning wiki pages, inside the ship pull request. Nothing else writes the wiki automatically.
- **BREAKING:** `notes/` leaves the repo. One migration pass extracts facts from WongStack's 44 notes and keeps each note's text in R2 as its source when R2 is enabled. `/wong-sync` gives installed repos the same migration task. The prose allowlist becomes `wiki/**` only, and the `notes.md` path rule is removed.
- Release as WongStack 17.0.0.

**Non-goals:** No embeddings or vector index in this release, and no Worker in front of the store. No backfill of sessions that no current checkout of the repo can claim. No rewrite of historical archives or changelog entries, and no attempt to remove old notes from git history.

## Capabilities

### New Capabilities

- `memory-store`: The per-repo D1 database and optional R2 bucket, the fact schema, the memory token, the write gate, search, tags, provenance, and the local spool.
- `memory-capture`: The session-start detection, the detached background run, transcript discovery and exclusions, the `#private` opt-out, fact extraction, and consolidation.
- `memory-recall`: The session-start digest, its bounds and cache, and the reads that the verbs make.

### Modified Capabilities

- `session-notes`: Session context lives as facts in the memory store. `/save` extracts facts through the write gate. `/continue` reads the slug's facts. `notes/` is no longer a payload surface.
- `explore-clarification`: `/explore` searches the memory store on the intent before it asks.
- `context-economy`: The digest is a bounded always-loaded surface.
- `change-branch-association`: The change folder and its facts share the change name.
- `delivery-gate`: The prose allowlist is `wiki/**` only.
- `toolchain-dependencies`: Core setup needs a Cloudflare account, and the memory scripts run on Node.js, which the OpenSpec CLI already requires.
- `agent-knowledge-center`: The knowledge surfaces include the memory store. `/ship` is the one automatic bridge from facts into the wiki.
- `path-scoped-rules`: Four rules ship. `notes.md` is removed.
- `cloudflare-provisioning`: `/wong-cloudflare` provisions the memory store in every repo, without the stack pack, and adds the bucket only when R2 is enabled.
- `install-onboarding`: Setup provisions the memory store.
- `wong-sync`: A sync that brings in this release plans the move of `notes/` into the store.
- `ship-full-cycle`: `/ship` distills the change's facts into the wiki before it archives.

## Impact

This is a payload change under `.agents/` (reached through `.claude/`). It adds the `memory` skill with its scripts, schema, and tests, a `SessionStart` hook in `.claude/settings.json`, and an `AGENTS.md` instruction for agents without a start hook. It edits `explore`, `save`, `continue`, `ship`, `wong-setup`, `wong-sync`, and `wong-cloudflare`, plus `AGENTS.md`, `README.md`, `.env.example`, the payload manifest, and the wiki pages for the change loop, required tools, the knowledge center, credentials, and the stack. It removes `notes/` and `.agents/rules/notes.md`, and adds `wiki/development/memory.md`. Every repo now needs a Cloudflare account and a memory token. R2 is optional. Everyone with that token can read every teammate's raw transcripts. The background run spends the user's own model quota without a visible turn, and the next digest reports what it did.

## Decision log

- **2026-09-25** — Asked how to make memory automatic; the user proposed a session-start subagent. Found that `/dream` did note-to-wiki consolidation until 2026-09-15 and was retired because nobody ran it by hand, so the new design fixes the trigger, not the consolidation.
- **2026-09-25** — Asked what to consolidate → the user clarified the problem: many sessions end without `/save`, and their context must still reach durable storage. The design became a backfill of missing notes.
- **2026-09-25** — Asked the consolidation trigger → chose a threshold checked at session start.
- **2026-09-25** — Asked how the wiki is written → the user chose `/ship` only, from the change's notes.
- **2026-09-25** — Asked how to make notes searchable → chose a summary and tags plus a query script. Asked where tags come from → chose a curated list that the model may extend with a definition line.
- **2026-09-25** — Asked whether to migrate existing notes → chose one pass over all 43.
- **2026-09-25** — Asked hook versus subagent → the hook runs only a fast script and triggers a background subagent that works next to the first prompt, so the first reply is not delayed.
- **2026-09-25** — Asked about publishing in a public repo → first chose main with an opt-out, then replaced git storage with Cloudflare. The `#private` opt-out remains.
- **2026-09-25** — Asked how the store relates to `notes/` → chose all in Cloudflare. Asked for one store per team or per repo → chose per repo. Asked what R2 keeps → chose the full raw transcript.
- **2026-09-25** — Asked what happens without a store → chose Cloudflare as mandatory for setup. Asked about retention → chose forever, in a secure store.
- **2026-09-25** — Asked about encryption → the user chose plain files in a private bucket. Assumed a dedicated memory token that CI never receives, because the provisioning token is widened and copied into GitHub secrets.
- **2026-09-25** — Asked the name → chose `memory` for the database and bucket, with a `sessions` table. Asked the model → chose sessions plus notes. Asked about note history → the user chose none, because a new note is created instead of updating one, so notes are append-only and a slug groups them.
- **2026-09-25** — Assumed: the REST API rather than a Worker, because a Worker adds a service to run. Assumed: known `.env` values are replaced in the raw transcript before upload, and a token-pattern scan blocks a note that contains a match.
- **2026-09-25** — Assumed: a 1-hour idle threshold, a cap of 5 sessions per run, the `#private` marker, and the `memory` skill name. All are cheap to change in review.
- **2026-09-25** — Assumed: the local spool, because `/save` must not lose a note when the network or token fails.
- **2026-09-25** — Assumed: resource ids live in `.claude/.wong-stack.json` and only the token lives in `.env`, because ids are not secrets and `wrangler.jsonc` already commits D1 ids.
- **2026-09-25** — Assumed: sessions are linked to a repo through a registry that the start hook writes, plus checkouts that currently exist. Older transcripts of deleted worktrees are skipped, because the migration already covers their saved notes.
- **2026-09-25** — Assumed: `/wong-cloudflare` is the one door to Cloudflare and provisions memory without the stack pack, because the provisioning token can already mint a scoped token.
- **2026-09-25** — Assumed: Codex uses its start hook if it has one, else an `AGENTS.md` instruction. The implementation verifies this.
- **2026-09-25** — Asked how to make retrieval and storage better, with research on other systems. Found that the plan had no read side at session start, that only `/continue` read notes, and that nothing revisited a note. Claude Code auto-memory, Codex Memories, and Letta all load a small index at start, freeze it for the session, supersede stale facts, and consolidate offline.
- **2026-09-25** — Asked whether notes are needed if facts exist → chose facts only. 42 of the 43 notes back an archived change whose Decision log already holds the why, and R2 keeps the raw transcript as the full record, so an authored note adds little. The loss is the connected argument of a design turn, which stays in the Decision log and the transcript.
- **2026-09-25** — Asked when the digest is populated → code builds it from one query at session start, inside the hook's existing network budget, with a local cache as the fallback. It is frozen for the session so prompt caching holds.
- **2026-09-25** — Asked whether to vectorize → first recommended hybrid search with Workers AI embeddings stored in D1, then reversed on review. The digest does most retrieval, the write gate uses the model to catch paraphrases, consolidation is the backstop, and the scale is hundreds to low thousands of facts. Embeddings are deferred until consolidation keeps merging duplicates that the gate missed, or live facts pass 2,000.
- **2026-09-25** — Asked to make it work on the Cloudflare free plan → found that D1, Vectorize, and Workers AI fit, but R2 needs a payment method on file. The user said a card is fine, so R2 stays. `/wong-cloudflare` checks that R2 is enabled before it creates the bucket.
- **2026-09-25** — Assumed: the hook starts a detached headless run of the same agent's command-line tool, not a subagent from the main agent, so the first reply has no memory cost. The first capture task probes this. If the probe fails, the hook falls back to the earlier instruction to the main agent. Recorded as assumed because the user was not available for an exit round.
- **2026-09-25** — Assumed: consolidation runs in the same background run when 24 hours and 5 captured sessions have passed, as Claude Code's consolidation does. No new verb, because `/dream` was retired when nobody ran it by hand.
- **2026-09-25** — Assumed: five fact types (`user`, `feedback`, `project`, `reference`, `thread`), a 400-character cap, a digest cap of 150 lines and 25 KB, and curated tags kept on facts. All are cheap to change in review.
- **2026-09-25** — Assumed: migrated notes become sessions with agent `migration`, whose R2 object is the note's text, so every fact links to a source the same way.
- **2026-09-25** — Asked what happens when R2 is not enabled → the user chose to skip transcript storage and keep everything else working. This replaces the earlier plan to stop provisioning until R2 is enabled. `/wong-cloudflare` provisions D1 and the token, records no bucket, and names the step that turns R2 on. A later run adds the bucket.
- **2026-09-25** — Probed D1 and R2 (task 1.1): created the real `wongstack-memory` database, so the account is not held to the free plan's cap of 10. FTS5 virtual tables, triggers, parameterized batches, and `RETURNING` work through the REST query endpoint, and a second migration run writes 0 rows. One fact insert with its FTS5 row costs 5 rows written. A 10 MB R2 object round-trips byte-identical through the REST object endpoint. An account without R2 could not be observed here, so detection keys on the list call's error that asks to enable R2.
- **2026-09-25** — Probed the detached headless run (task 1.2): `claude -p --model haiku --no-session-persistence --permission-mode dontAsk` started detached from a script, authenticated through the normal login, ran only the allowed command, and left no transcript. `--bare` was rejected, because it reads only an API key and never OAuth. A heredoc does not match a `Bash(<prefix>:*)` rule, so the run writes JSON inputs through an `Edit(//<work folder>/**)` rule instead, which also denies writes outside that folder. The runbook and the writing bar go inline in the prompt. The fallback subagent path stays for machines where the CLI cannot start.
- **2026-09-25** — Checked Codex (task 4.6): Codex 0.155 reads `SessionStart` hooks from `.codex/hooks.json` and adds plain stdout as developer context. The hook prints plain text for both agents, because Codex rejects JSON `additionalContext` on `SessionStart` (openai/codex issue 45999). No `AGENTS.md` instruction is needed. Codex asks the user to trust the hook once.
- **2026-09-25** — Found that this repo's `CLOUDFLARE_API_TOKEN` is account-scoped with no token-write permission, so `/wong-cloudflare` cannot mint the memory token here. The skill now gives the by-hand path for that case. The database, bucket, and schema are provisioned and recorded in `.agents/.wong-stack.json`; the memory token for this repo must be created by the user.
- **2026-09-25** — Moved ownership of the `CLOUDFLARE_MEMORY_TOKEN` name to `wiki/development/memory.md`, because `wiki/stack/` ships only with the pack while every repo gets the token. The credentials page links to it.
- **2026-09-25** — Changed the R2-later re-run from minting a new memory token to adding R2 permissions to the existing one, so the value in `.env` does not change.
- **2026-09-25** — Checkpoint: implementation complete except task 2.5, the memory token for this repo, which the user must create by hand. Imported the 43 notes as 121 facts (120 live) into the real store, deleted `notes/`, and reconciled the 14 delta specs into `openspec/specs/` through the CLI's own archive merge in a throwaway copy. Applied the `/simplify` review: one write path for put-facts and the import, structured error kinds, one digest plan shared by the hook and every writer, one parse per transcript, and the excluded session enforced in code. 23 memory tests pass locally; `review.test.mjs` needs `npm ci` in `app/` and runs in CI.
- **2026-09-25** — The user replaced the account-scoped provisioning token with a user token that had only `API Tokens Write` and no account in its resources. Asked whether the agent could expand it → it could: the token added its own `Account API Tokens Write` policy for the recorded account, then widened to the standard provisioning set plus `Workers R2 Storage Write`, keeping both API-token groups. It then minted `wongstack-memory` with only `D1 Write` and `Workers R2 Storage Write`, written to the primary `.env`. Task 2.5 is done; the GitHub `CLOUDFLARE_API_TOKEN` secret still holds the old account token.
- **2026-09-25** — At ship time, `main` had gained `notes/wongstack-managed-service.md` after this branch started. Merged `main`, extracted 13 facts from it into `migration.json`, imported it, and deleted it, so the store holds 44 migration sessions and 134 facts. The resumed import exposed a defect: tags were written only with the file's first note, which a resumed run skips. Tags now go with the first note actually imported, and a test covers it.
- **2026-09-25** — Ship distillation: moved the measured headless-run overhead into `wiki/development/memory.md` (background run cost). Also superseded two migrated facts that pointed into the deleted `notes/` folder, so they point at the preserved note text instead.
- **2026-09-25** — Archived with `--skip-specs` after confirming the main specs equal a fresh merge of the deltas from `main`. Every task is checked. Ship checkpoint follows.

<!-- end proposal.md -->
<!-- file design.md utf8 15389 -->
## Context

See proposal.md for why. The facts that shape the approach:

- `.claude` is a symlink to `.agents`, so every payload file is edited under `.agents/`. `CLAUDE.md` is a symlink to `AGENTS.md`.
- Transcripts stay on the machine. Claude Code writes `~/.claude/projects/<escaped-cwd>/<session-id>.jsonl`, with a separate folder for each worktree (this repo has 20 such folders but only 1 live worktree). Codex writes `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, with the working directory in its `session_meta` line.
- A raw transcript is large (the biggest here is 8.6 MB), and its user and assistant text is only 0.4% of that (37 KB).
- 42 of the 43 notes back an archived change, so the change's Decision log already holds most of their why.
- The provisioning token (`CLOUDFLARE_API_TOKEN`) can mint and widen tokens, and it is copied into GitHub secrets for deploys.
- Cloudflare free plan: D1 allows 10 databases per account, 500 MB per database, 5 million rows read and 100,000 rows written per day. R2 gives 10 GB free but needs a payment method on file, so the bucket is optional: without it the store keeps no transcripts and nothing else changes. This account has R2 enabled and already holds 10 D1 databases, which is the free-plan cap.
- CI runs `node --test scripts/tests/*.test.mjs`. Payload scripts use Node built-ins only.

## Goals / Non-Goals

**Goals:** The main agent spends nothing on capture. The hook adds one bounded digest and no model call. Only code handles transcripts until the model gets a reduced text. The store works the same way for one person or a team.

**Non-Goals:** No search across repos (one store per repo was chosen). No web UI. No automatic tag merging: an alias is added by an explicit edit. No embeddings in this release.

## Decisions

### Layout

```
.agents/skills/memory/
  SKILL.md                     search usage, the capture runbook, the consolidation runbook
  references/writing-facts.md  the bar for facts, moved and adapted from notes/README.md
  migrations/0001_memory.sql
  scripts/memory.mjs           CLI: search, show, source, tags, gate, put-facts, pending, strip, live, digest, stats, spool, due, finish-run, migrate, import
  scripts/session-start.mjs    hook entry point
  scripts/run.mjs              detached background run: lock, then the agent's headless CLI
  scripts/lib/store.mjs        D1 and R2 REST client, config and .env loading, spool
  scripts/lib/transcripts.mjs  discover, parse, claim, and strip Claude and Codex transcripts
  scripts/lib/scan.mjs         .env value replacement and token-pattern scan
  scripts/lib/digest.mjs       digest query, branch-to-slug lookup, formatting, cache
.agents/settings.json          SessionStart hook (reached as .claude/settings.json)
scripts/tests/memory-*.test.mjs, scripts/tests/fixtures/memory/
wiki/development/memory.md     the convention: what is stored, the digest, search, #private, the token
```

One skill owns memory, so `/explore`, `/save`, `/continue`, `/ship`, the hook, and the background run all call one script. Nothing else talks to the store.

### Facts, not notes

A fact is one row of at most 400 characters, with a type, a slug, tags, and its source session. A reason stays in the same fact as its decision. Facts are never edited: `superseded_by` points from an old fact to the fact that replaced it, and a fact is live while that column is null. A `thread` fact is an open question, closed by a superseding fact. The narrative that facts cannot hold stays in two places that already exist: the change's Decision log, and, when the store has a bucket, the raw transcript in R2, which `memory.mjs source <fact-id>` prints reduced to user and assistant text.

Alternative considered: notes plus facts. Rejected because the Decision log already holds a change's narrative for 42 of 43 notes, and two authored surfaces would need to agree with each other.

### The write gate

Writing is two calls. `memory.mjs gate --file candidates.json` prints, for each candidate, the live facts with that slug and the top 5 FTS5 matches for the candidate's significant words joined with `OR`, so a paraphrase that shares a few words still ranks. The model then writes a decision per candidate (`add`, `supersede <id>`, or `drop`), and `memory.mjs put-facts --file decisions.json` scans each fact, checks its tags, and writes facts, supersedes, tags, and the session row in one D1 batch. `/save`, the capture run, the migration, and consolidation all use this path.

Alternative considered: hybrid search with Workers AI embeddings stored in D1, to catch paraphrases. Deferred: the model is a better judge of a paraphrase than a cosine threshold, consolidation catches what the gate misses, and the scale is hundreds to low thousands of facts. `runs.counts.merged` records how many duplicates consolidation had to merge, and `memory.mjs stats` prints it over time. Add an embeddings table in a forward-only migration when that number keeps growing or live facts pass 2,000. Search stays behind the one script, so nothing else changes.

### Local state lives in the git common directory

`$(git rev-parse --git-common-dir)/wong-memory/` holds `registry.jsonl` (session id, agent, transcript path, working directory, started time, and a `background` flag), `seen.json` (session id, the transcript size, and the last line captured, as a cache of the store's ledger), `spool/`, `digest.md` (the last digest, with its fetch time), and `run.lock`. All worktrees of one clone share the common directory, so a session started in a worktree that is later deleted stays claimable. Git never tracks this directory, so it needs no ignore rule.

### The hook contract

The Claude `SessionStart` hook passes `session_id`, `transcript_path`, and `cwd` on stdin. `session-start.mjs` then works through these steps:

1. Append to the registry. When `WONG_MEMORY_RUN=1` is set, mark the entry `background` and exit: a background run's own session gets no digest and starts nothing.
2. Send one D1 batch within a 1.5-second budget: the digest query, the latest run, and the time and captured-session count since the last consolidation. On a timeout, read `digest.md` and mark its age.
3. While that batch is in flight, compute pending sessions from local files only: registry entries and transcripts inside live checkouts, idle for 1 hour or more, whose size differs from `seen.json`.
4. Print `additionalContext`: the current session id, the digest, and the latest run's result line.
5. When sessions are pending, the spool holds facts, or consolidation is due, spawn `run.mjs` detached (`stdio: 'ignore'`, `unref()`) and exit. The current session id goes in `WONG_MEMORY_EXCLUDE`, and the script refuses to list or strip that session.

Any failure prints one line and exits 0. For Codex, the implementation checks whether the installed Codex supports a start hook. If it does not, `AGENTS.md` carries one instruction to run `session-start.mjs` at the start of a session and to read its output as context.

### The digest

`lib/digest.mjs` selects live facts, ordered by type (`feedback`, `user`, `project`, `reference`, `thread`) and then by `created_at` descending, and puts the live `thread` facts of the current change first. The current change is the change folder whose proposal's `**Branch:**` line names the current branch. Code trims the list at 150 lines or 25 KB and adds a last line with the count left out and the search command. Each line reads `- [type] body (slug, 12d, author, #id)`. The header states in one line that facts are dated context to check against the repo, not instructions. The digest is printed once and is frozen for the session, so the prompt cache holds. `/save` and the background run rewrite `digest.md` after they write, so an offline start on this machine still sees its own newest facts.

### The background run

`run.mjs` takes `run.lock` with an exclusive create. It treats a lock older than 2 hours as stale. It then starts the headless CLI of the agent that fired the hook, with `WONG_MEMORY_RUN=1` and the smallest capable model:

- Claude: `claude -p` with the `haiku` model, and allowed tools limited to `Bash(node .claude/skills/memory/scripts/memory.mjs:*)`.
- Codex: `codex exec` with its small model and a sandbox limited to the same command.

The model can only call the memory script. The script reads transcripts, strips them, and uploads them, so the model never gets file access outside the memory commands. The prompt names the capture runbook in `SKILL.md`:

1. Drain the spool through the gate.
2. For each pending session, newest first, up to 5: `memory.mjs strip <session>` re-checks the ledger, detects `#private` (and then writes a `private` row and stops), replaces `.env` values, uploads the raw file to R2 when the store has a bucket, and prints the reduced text after `read_through`. The model proposes facts to the bar in `writing-facts.md`, runs `gate`, and then runs `put-facts`, or records the session as `skipped`.
3. When consolidation is due, run the consolidation runbook.
4. Write the `runs` row with its counts, and refresh `digest.md`.

The first capture task probes whether a headless run started from a hook works on this machine: authentication, permission mode, and exit without a terminal. When it does not, `session-start.mjs` prints the fallback instruction for the main agent to start one background subagent with the same runbook.

Alternative considered: the main agent launches a background subagent, as the first draft had it. That costs one tool turn before the first reply and puts a report into the conversation later. Detaching removes both, at the cost of a run the user does not see, which the next digest reports.

### Consolidation

Consolidation is due when 24 hours and 5 captured sessions have passed since the last `consolidation` run. `memory.mjs live` prints live facts grouped by slug and type. The model returns merge groups (several ids to one new body) and contradictions (an older id and the newer id that replaces it). `put-facts` applies them with source `consolidation`, as supersedes. The run records `merged`, `superseded`, and the live count. It never deletes a row.

### Search

`search` builds one SQL query: FTS5 `MATCH` for text, joins for tags (aliases resolved), and `WHERE` clauses for type, dates, author, branch, slug, and `superseded_by IS NULL` unless `--all` is given. It then filters by change state locally, because change state comes from the checkout. The output is one line per fact in the digest's format. `show <slug>` prints open threads first, then the other live facts newest first. The near-duplicate tag check compares normalized names (lower case, letters and digits only, trailing `s` removed), and it also flags an edit distance of 2 or less when the name is 5 or more characters.

### The verbs

- **`/explore`** runs `search` once on the intent's key terms and the paths it expects to touch, before its first question. A live fact that answers a question becomes a recorded assumption with its age.
- **`/save`** writes candidate facts from the conversation since `read_through`, runs `gate`, then `put-facts --source save --session <id>`. The route table loses its notes row, and a save that only stores facts makes no commit.
- **`/continue`** calls `show <slug>`.
- **`/ship`** calls `show <slug>` before the archive step and edits the wiki under `.agents/rules/wiki.md`. Its existing post-archive `/save` commits those edits with the archive, so the ship-full-cycle contract of exactly two checkpoints holds.

### Migration

A model pass reads the 43 notes oldest first and writes `migration.json` inside the change for review: per note, its facts with type, body, and tags, and supersedes against facts that the pass produced earlier. `memory.mjs import` uploads each note's text to R2 at `migration/<slug>.md` when the store has a bucket, writes a `migration:<slug>` session with the note's `updated:` date and the author of its first commit, and writes its facts with source `migration`. A note with no facts gets a `skipped` session. The folder is deleted only after 43 migration sessions exist. `notes/README.md` splits into two: the bar moves to `references/writing-facts.md`, and the surface description moves to `wiki/development/memory.md`.

## Risks / Trade-offs

- [The background run spends the user's model quota without a visible turn] → At most 5 sessions per run, one run at a time, the smallest model, and the next digest reports every run.
- [A headless run cannot start from a hook on some machines] → The probe task decides. The fallback is the in-session background subagent.
- [The digest adds tokens to every session] → Hard caps of 150 lines and 25 KB. Consolidation keeps the live set small, and the context-economy delta counts the digest as always-loaded.
- [A poisoned fact reaches every session through the digest] → Transcript text is data in the runbook, the model in the run can only call the memory script, the credential scan rejects matches, and every line shows its author and age.
- [Keyword search misses a paraphrase] → The gate always shows the slug's live facts, consolidation merges what the gate missed, and `stats` measures it as the trigger for embeddings.
- [Facts lose the connected argument of a design turn] → The Decision log keeps a change's why, and `source` reaches the transcript.
- [The memory token can read the app's D1 databases, and every holder can read every raw transcript] → Document it on the memory page and the credentials page. Keep the token out of CI.
- [Raw transcripts kept forever include secrets that were never in `.env`] → Replace known values before upload, keep the bucket private, and use `#private`. This is accepted as the user's choice.
- [The transcript formats are undocumented and change] → The parsers detect the format and report "not recognized" instead of storing empty text. Fixture tests pin both formats.
- [D1 FTS5 writes count against the daily row limits in an undocumented way] → The first task measures rows written for one fact through the REST API.
- [The free plan allows 10 D1 databases per account, and this account already has 10] → The first probe creates the real `wongstack-memory` database. If the cap blocks it, stop and ask the user which database to free or whether to upgrade. Document the cap: a stack-pack repo uses 3, and a memory-only repo uses 1.
- [A store without R2 cannot re-extract facts later] → Accepted. Facts and the Decision log remain, and adding R2 later stores new transcripts from then on.
- [The hook grows slow as the registry grows] → Pending computation reads only file metadata, and only the first line of a Codex rollout. Each background run prunes the registry of entries whose transcript is gone and of captured sessions older than 30 days.

## Migration Plan

1. Provision this repo's store, review `migration.json`, and import before `notes/` is removed, in the same branch.
2. Release 17.0.0 with a changelog entry that names the required account, R2 as optional, the token, and the removed `notes/`. `/wong-sync` in an installed repo plans provisioning, then migration, verification, and deletion, in that order.
3. Rollback: the notes remain in git history, and a revert of this change restores `notes/` and the old skills. The store can stay, unused.

<!-- end design.md -->
<!-- file tasks.md utf8 8816 -->
## 1. Probes

- [x] 1.1 Probe a real account with `curl`: create this repo's real `wongstack-memory` D1 database (the account is at the free-plan cap of 10, so stop and ask if creation is refused), confirm FTS5 virtual tables work through the REST query endpoint, and measure the rows written for one fact insert with its FTS5 index. Confirm R2 object `PUT` and `GET` through the REST API with a 10 MB file, and find how to detect an account without R2. Record the results in the Decision log, and stop to re-plan if D1 fails.
- [x] 1.2 Probe the detached headless run: from a `SessionStart` hook, spawn `claude -p` with the `haiku` model and allowed tools limited to one `node` command, detached, and confirm that it authenticates, runs, and exits with no terminal. Do the same for `codex exec` if Codex is installed. Record the results and the chosen fallback in the Decision log.

## 2. Store and provisioning

- [x] 2.1 Write `.agents/skills/memory/migrations/0001_memory.sql` with `sessions`, `facts` (with `superseded_by` and a 400-character check), `tags`, `fact_tags`, `runs`, and the FTS5 index plus its sync triggers, per review.html#/memory-schema.
- [x] 2.2 Extend `/wong-cloudflare` to install and run in every repo: offer and provision the `<repo>-memory` database, add the private bucket only when R2 is enabled (else record no bucket and name the dashboard step), and add it on a later run once R2 is on, apply the migrations, mint `CLOUDFLARE_MEMORY_TOKEN` with only D1 permissions plus R2 when a bucket exists, write it to `.env`, record `components.memory`, and report "current" on a re-run. Keep the stack-pack part gated on `components.stackPack`.
- [x] 2.3 Add `CLOUDFLARE_MEMORY_TOKEN` to `.env.example`, with `wiki/development/memory.md` owning the name (it ships to every repo, while `wiki/stack/` is pack-only) and `wiki/stack/cloudflare-credentials.md` linking to it. State that it never goes into CI.
- [x] 2.4 Provision this repo's memory store: the `wongstack-memory` database and private bucket, the schema, and `components.memory` in `.agents/.wong-stack.json`.
- [x] 2.5 Create `CLOUDFLARE_MEMORY_TOKEN` for this repo by hand (this repo's `CLOUDFLARE_API_TOKEN` is account-scoped and cannot mint tokens): account-scoped, `D1 Write` and `Workers R2 Storage Write` on this account only, written to the primary worktree's `.env`. Verify with `memory.mjs digest`.

## 3. Memory script

- [x] 3.1 Write `scripts/lib/store.mjs`: load `components.memory` and the token, run D1 batches and R2 object calls, fail with the variable name and never the value, and write to the spool on network, token, or API failure.
- [x] 3.2 Write `scripts/lib/scan.mjs`: replace `.env` values with a placeholder, and detect token patterns (`ghp_`, `github_pat_`, `sk-`, `AKIA`, JWTs, `Bearer`) without printing a match.
- [x] 3.3 Write `memory.mjs` commands `gate`, `put-facts`, `search`, `show`, `source`, `live --grouped`, `tags`, `stats`, and `import`. Include the length limit, supersede in one batch, a store with no bucket (no upload, and `source` states that transcripts are not stored), the tag definition rule, the near-duplicate warning, alias resolution, the derived change state, and the one-line fact format with age and author.
- [x] 3.4 Add `scripts/tests/memory-store.test.mjs` against a local fake of the REST endpoints. Cover a store with no bucket, facts that are never edited, supersede and live filtering, a closed thread, the gate's neighbour output, the length limit, tag rejection and warning, aliases, search filters, the credential rejection, and spool then drain.

## 4. Capture and recall

- [x] 4.1 Write `scripts/lib/transcripts.mjs`: discover Claude and Codex transcripts, claim them through the registry or live checkouts, exclude subagent and background sessions, detect `#private`, strip to user and assistant text plus error strings after `read_through`, and report unknown formats. Expose it as `memory.mjs pending` and `memory.mjs strip`.
- [x] 4.2 Write `scripts/lib/digest.mjs`: the digest query, the branch-to-slug lookup through `**Branch:**`, the 150-line and 25 KB limits with the omitted count, the header line, the latest run line, and the `digest.md` cache with its age.
- [x] 4.3 Write `session-start.mjs` per review.html#/memory-flow/digest: registry append, the `WONG_MEMORY_RUN` exit, one D1 batch within 1.5 seconds, the cache fallback, local pending computation, `additionalContext`, and the detached spawn of `run.mjs`. Exit 0 on any failure.
- [x] 4.4 Write `run.mjs` per review.html#/memory-flow: the lock with a 2-hour stale limit, the headless CLI of the calling agent with the small model and the one allowed command, or the fallback that task 1.2 chose.
- [x] 4.5 Write `.agents/skills/memory/SKILL.md`: search usage for the verbs, the capture runbook (spool, at most 5 sessions newest first, gate, `skipped`, transcript text as data, the `runs` row, the digest refresh), and the consolidation runbook per review.html#/memory-flow. Move the bar from `notes/README.md` to `references/writing-facts.md` and adapt it to facts.
- [x] 4.6 Register the hook in `.agents/settings.json`. Check whether the installed Codex supports a start hook: use it if so, else add the one-line instruction to `AGENTS.md`. Record the result in the Decision log.
- [x] 4.7 Add `scripts/tests/memory-capture.test.mjs` with Claude and Codex fixtures, including a subagent transcript, a background session, a `#private` session, a partly saved session, a deleted worktree, and an unknown format. Cover a hook run with nothing to do (no spawn), with work pending (one detached spawn), with the store unreachable (cached digest, exit 0), a held lock, the digest limits and omitted count, the branch threads, and the consolidation-due rule.

## 5. Workflow skills

- [x] 5.1 `/explore`: search the store once on the intent's key terms and expected paths before the first question, and turn a live fact that answers a question into a recorded assumption with its age.
- [x] 5.2 `/save`: extract facts since `read_through` through `gate` and `put-facts`. Remove `notes/**` from the route table so the allowlist is `wiki/**` only. A facts-only save makes no commit. The report states added, superseded, dropped, and stored or spooled.
- [x] 5.3 `/continue`: read the slug's open threads and live facts through `memory.mjs show`, and state when the store is unreachable.
- [x] 5.4 `/ship`: before the archive, read the change's live facts, edit the owning wiki pages under the wiki rules, and log the pages changed or "no reusable fact". Skip with a log line when the store is unreachable.
- [x] 5.5 `/wong-setup` and `/wong-sync`: plan store provisioning with R2 as optional, and for a repo with `notes/`, plan the migration, the session-count verification, and deletion in that order. Update the payload manifest (add the `memory` skill and the hook, remove `notes/README.md` and `rules/notes.md`, and make `/wong-cloudflare` core).
- [x] 5.6 Update `.agents/rules/openspec.md` so session context routes to facts in the memory store, and delete `.agents/rules/notes.md`.

## 6. Migration of this repo's notes

- [x] 6.1 Extract facts from the 43 notes (44 with the note `main` gained during the change), oldest first, with supersedes against earlier output, and save the result as `openspec/changes/add-memory-store/migration.json` for review.
- [x] 6.2 Import with `memory.mjs import`, and verify that one `migration` session exists per note (44) and, when the store has a bucket, that each note's text is in R2.
- [x] 6.3 Delete `notes/`, and remove `notes/README.md` from the payload rule's `paths:` list.

## 7. Docs and release

- [x] 7.1 Write `wiki/development/memory.md`: facts and their types, the digest and when it loads, search, the background run and what it costs, consolidation, `#private`, the token and who can read what, a store without R2, the embeddings trigger, and the known risks. Link it from `wiki/development/README.md`.
- [x] 7.2 Update `AGENTS.md` (the "Where context lives" table and the prose rule), `README.md`, `wiki/agent-knowledge-center.md` (the surfaces, the digest, and `/ship` as the one bridge), `wiki/development/the-change-loop.md` (allowlist `wiki/**`), `wiki/development/required-tools.md` (the Cloudflare account, R2 as optional with its payment method, and the Node scripts), and `wiki/stack/README.md` (memory is not part of the opt-in pack).
- [x] 7.3 Bump `VERSION` to 17.0.0 and add a `CHANGELOG.md` entry that names the required account, R2 as optional, the token, the removed `notes/`, the digest, and the sync migration.
- [x] 7.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate add-memory-store --strict --no-interactive`. Then run `/save` so CI runs the new tests.

<!-- end tasks.md -->
<!-- file specs/agent-knowledge-center/spec.md utf8 1996 -->
## MODIFIED Requirements

### Requirement: The philosophy maps knowledge surfaces to repo files

The knowledge-center documentation SHALL name the durable surfaces WongStack uses: agent instructions, the progressive-disclosure wiki, active OpenSpec changes, archived changes, skills, and the memory store that holds session facts and raw transcripts outside the repository. It SHALL explain what each surface owns without duplicating operational details owned by deeper docs.

#### Scenario: Reader understands where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can identify where reusable process, active plans, shipped records, session context, and repeatable agent actions live

#### Scenario: Details remain linked

- **WHEN** the philosophy page names a deeper process such as the change loop, wiki structure, or the memory store
- **THEN** it links to the owning page instead of restating the full procedure

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and session facts SHALL be presented as the mechanisms that let each project leave more useful context for the next person or agent. Sessions without `/save` SHALL be presented as captured by the background run that the session start begins, and the digest SHALL be presented as how the next session starts with that context. `/ship` SHALL be presented as the one automatic bridge from a change's facts into the wiki, and its wiki edits SHALL be reviewed in the ship pull request.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
- **AND** `/ship` is named as the only automatic path from facts into the wiki

<!-- end specs/agent-knowledge-center/spec.md -->
<!-- file specs/change-branch-association/spec.md utf8 1288 -->
## MODIFIED Requirements

### Requirement: Save records the selected change's actual branch

`/save` SHALL select the change established by explicit input, current-session context, or a unique active change modified in the current worktree or branch diff. It SHALL record the actual feature branch in that change's proposal. The change folder and the session's facts SHALL use the change name as their slug. It SHALL NOT create a second change solely because the branch name differs.

#### Scenario: A unique uncommitted change has another name

- **WHEN** `/save` runs on feature branch `editor-work` with a single uncommitted active change `review-handoff`
- **THEN** it updates `review-handoff` and records `editor-work` as its branch
- **AND** it does not create `openspec/changes/editor-work/`

#### Scenario: A clean branch holds a committed change

- **WHEN** the worktree is clean and the branch diff contains one active change whose name differs from the branch
- **THEN** `/save` selects that change for its checkpoint and PR body

#### Scenario: Several changes are plausible

- **WHEN** more than one active change is modified on the current branch and no explicit or session selection resolves one
- **THEN** `/save` asks which change to update before writing another change

<!-- end specs/change-branch-association/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 4414 -->
## ADDED Requirements

### Requirement: The provisioning skill provisions the memory store in every repo

`/wong-cloudflare` SHALL be installed in every WongStack repo. It SHALL provision the memory store whether or not the repo took the stack pack: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, apply the memory migrations, and use the provisioning token to mint a separate memory token that carries only D1 permissions, plus R2 permissions when a bucket exists. It SHALL write that token to the git-ignored `.env`, SHALL NOT set it as a CI secret, and SHALL record the resource ids under `components.memory` in `.claude/.wong-stack.json`. A run that finds the store already provisioned SHALL change nothing. Minting the memory token is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the skill SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the skill SHALL provision the database and the token without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket and SHALL add R2 permissions to the existing memory token.

#### Scenario: A repo without the stack pack

- **WHEN** `/wong-cloudflare` runs in a repo with `components.stackPack` false and no memory store
- **THEN** it offers the memory store and the pack as separate choices
- **AND** a yes to the memory store with a no to the pack provisions the store without landing any pack file

#### Scenario: The memory token is narrow

- **WHEN** provisioning mints the memory token
- **THEN** the token carries D1 permissions, and R2 permissions only when a bucket exists, and no token-write, Worker, or Access permission
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: R2 is not enabled

- **WHEN** `/wong-cloudflare` provisions memory on an account where R2 is not enabled
- **THEN** it creates the memory database and token, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, adds R2 permissions to the memory token, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store and token already exist and verify
- **THEN** the run reports the store as current and creates nothing

## MODIFIED Requirements

### Requirement: A provisioning skill stands the app up from a single API token

The payload SHALL include a provisioning skill that takes a repo from "has a Cloudflare token" to "has a memory store" in every repo, and, where `components.stackPack: true`, to "has a deployed Worker backed by two D1 databases and a CI pipeline." It SHALL be runnable at any time after `/wong-setup`, not only during onboarding, because the token typically arrives later than the install does. It SHALL drive the Cloudflare REST API directly and SHALL NOT require `node`, `npm`, or `wrangler` on the machine running it. It SHALL write nothing outside the repo and SHALL leave its repo changes uncommitted for `/save`.

#### Scenario: Provisioning runs long after setup

- **WHEN** a user runs the provisioning skill in a repo where WongStack is already installed and the stack pack was taken
- **THEN** it provisions from the current token without re-running onboarding
- **AND** it reports the production URL and the preview URL pattern on completion

#### Scenario: The skill is absent for a repo that declined the pack

- **WHEN** a repo's manifest has `components.stackPack` false or absent
- **THEN** the skill's stack-pack part (Worker, app databases, CI pipeline) is neither run nor offered, and only the memory store is provisioned
- **AND** no stack-pack file enters that repo

#### Scenario: Repo changes are left for review

- **WHEN** provisioning finishes writing the D1 binding, workflow file, install record, and env entries
- **THEN** those edits sit uncommitted in the working tree
- **AND** the skill runs no git command in the repo

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/context-economy/spec.md utf8 943 -->
## ADDED Requirements

### Requirement: The memory digest is a bounded always-loaded surface

The session-start memory digest SHALL count as always-loaded context. It SHALL stay within the limits that `memory-recall` sets, and SHALL carry only facts from the memory store and the one-line result of the latest background run. It SHALL NOT restate a fact that the WONG-STACK block, a skill description, a rule, or a wiki page owns. Consolidation SHALL be the means that keeps the live facts inside the limit, not a larger limit.

#### Scenario: A fact duplicates a wiki page

- **WHEN** a live fact states a convention that a wiki page now owns
- **THEN** consolidation supersedes the fact with one that links the page, or `/ship` has already moved it there

#### Scenario: The digest reaches its limit

- **WHEN** live facts would fill more than the digest limit
- **THEN** the digest is cut at the limit and states how many facts it left out

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 6265 -->
## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's path prefix inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state `notes/**` as part of the carve-out, or say that wiki edits require a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/verify` produces on request

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, the memory wiki page, and the `save` skill
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the path prefix is stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefix

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Prose exception.** A `/save` whose entire diff falls inside the **prose allowlist** SHALL bypass the branch-and-PR gate and commit directly to the default branch. The allowlist is exactly one path prefix: `wiki/**`. The carve-out is decided by **path scope only** — never by file extension, and never by a judgment of how consequential the edit is. It is exact: if any path outside the allowlist appears in the diff, the normal branch + PR flow applies in full to the whole save.

Routing SHALL NOT key on file extension. Markdown outside the allowlist — `.claude/**` (the shipped payload, whose edit is a release), `openspec/**` (the specs), `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and any config file — keeps the full gate.

The gate is not weakened by this. A wiki page is prose reviewed in the diff that produced it, and nothing in it executes, deploys, or changes what the tooling does. Session facts are not in the repository, so they need no route.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Wiki-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `wiki/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-allowlisted path restores the gate

- **WHEN** a save's diff contains `wiki/<page>.md` plus any path outside the allowlist
- **THEN** the normal branch + PR flow applies and the prose rides along on that branch

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and its only output is facts
- **THEN** the facts go to the memory store, and no commit, PR, or `/ship` is involved

#### Scenario: A leftover notes file keeps the gate

- **WHEN** a save's diff contains a path under `notes/`
- **THEN** the normal branch + PR flow applies, because `notes/**` is not in the allowlist

#### Scenario: Markdown payload keeps the gate

- **WHEN** a save's diff touches `.claude/skills/save/SKILL.md`, `CLAUDE.md`, or `openspec/changes/<name>/proposal.md` — markdown, but not in the allowlist
- **THEN** the normal branch + PR flow applies in full

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/explore-clarification/spec.md utf8 1257 -->
## ADDED Requirements

### Requirement: Explore searches memory before it asks

Before its first question in standalone or bounded mode, `/explore` SHALL search the memory store once on the intent's key terms and the paths it expects to touch, and SHALL read the live facts it finds. It SHALL NOT ask a question that a live fact already answers. It SHALL instead state the fact, with its age and author, as a recorded assumption that the user can correct. When the store is unreachable, `/explore` SHALL say so in one line and continue. `/plan` gets this through the bounded mode it already invokes.

#### Scenario: A preference is already known

- **WHEN** the store holds a live `feedback` fact that the user prefers one bundled pull request for refactors, and the intent is a refactor
- **THEN** `/explore` does not ask how to split the pull requests
- **AND** its summary names the fact and its age as the reason

#### Scenario: Nothing relevant is stored

- **WHEN** the search returns no live fact for the intent
- **THEN** `/explore` asks its questions as it does today

#### Scenario: Plan inherits the search

- **WHEN** `/plan` invokes `/explore` in bounded mode
- **THEN** the search runs once before the exit round, and not again inside `/plan`

<!-- end specs/explore-clarification/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 948 -->
## ADDED Requirements

### Requirement: Setup provisions the memory store

The installation plan SHALL include provisioning the memory store through `/wong-cloudflare`, and SHALL install the session-start hook and the `memory` skill. When no Cloudflare token is available yet, setup SHALL complete the rest of the install, state that session memory is off until provisioning runs, and name the command that turns it on. It SHALL NOT report the install as complete with memory working when no store exists.

#### Scenario: A token is available

- **WHEN** the installation tasks run with a Cloudflare provisioning token in `.env`
- **THEN** the memory store is provisioned and the install record lists it under `components.memory`

#### Scenario: No token yet

- **WHEN** the installation tasks run without a Cloudflare token
- **THEN** the install completes, and the report states that session memory is off and that `/wong-cloudflare` turns it on

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/memory-capture/spec.md utf8 7512 -->
## Purpose

Capture sessions that ended without `/save`, and keep the live facts small and consistent, in a background run that the session-start hook starts and that never delays the first reply.

## ADDED Requirements

### Requirement: The session-start hook starts background work and runs no model

The payload SHALL register a `SessionStart` hook that runs a script and no model. The script SHALL record the new session's id, agent, working directory, and repo in a registry on the machine. It SHALL start one background run when at least one of these is true: this repo has sessions that are idle for at least 1 hour, are not the current session, and have no `captured`, `skipped`, or `private` row covering their latest message; the local spool holds facts; or consolidation is due. The hook SHALL NOT wait for the run. The hook SHALL finish within 2 seconds, SHALL exit successfully on any failure, and SHALL NOT block the session.

#### Scenario: Nothing to do

- **WHEN** every past session of this repo has a row, the spool is empty, and consolidation is not due
- **THEN** no background run starts

#### Scenario: Three sessions need capture

- **WHEN** three idle sessions of this repo have no row
- **THEN** the hook starts one background run and returns without waiting for it

#### Scenario: The store is unreachable

- **WHEN** the hook cannot reach the store
- **THEN** the session starts normally and the hook reports one line that it skipped

### Requirement: The background run is detached from the session

The background run SHALL be a detached process that runs the same agent's command-line tool without a user, with the smallest capable model and the capture runbook of the `memory` skill. The main agent SHALL NOT launch it, wait for it, or receive its output during the session. Only one run SHALL be active for a repo at a time. The run's own session SHALL be marked in the registry so that no later run captures it. When the agent's command-line tool cannot start a run without a user, the hook SHALL instead tell the main agent to start one background subagent with the same runbook, and SHALL say that it fell back.

#### Scenario: The user asks a question at session start

- **WHEN** capture is pending and the user's first prompt is a question
- **THEN** the main agent answers the question and launches nothing

#### Scenario: Two sessions start together

- **WHEN** two sessions of the same repo start within a second
- **THEN** only one background run is active

#### Scenario: A headless run is not available

- **WHEN** the agent's command-line tool cannot run without a user on this machine
- **THEN** the hook asks the main agent to start a background subagent, and says so in one line

### Requirement: The next digest reports what the background run did

Each background run SHALL record in the `runs` table when it ran, on which machine, and its counts: sessions captured, skipped, and private; facts added, superseded, and dropped; and, for consolidation, facts merged. The next session's digest SHALL show the result of the latest run in one line, and a failed run SHALL show as failed with its reason.

#### Scenario: A run captured sessions

- **WHEN** the previous background run captured 3 sessions and added 7 facts
- **THEN** the next digest's header states those counts and the run's time

#### Scenario: A run failed

- **WHEN** the previous background run stopped because the token was rejected
- **THEN** the next digest states that the run failed and names the token variable, without its value

### Requirement: Discovery claims only this repo's own sessions

The background run SHALL read Claude Code and Codex transcripts. It SHALL claim a transcript for this repo only when the registry maps it to this repo, or when its working directory is inside a checkout of this repo that currently exists. It SHALL exclude subagent transcripts, background-run sessions, and sessions it cannot claim. When a transcript's format is not recognized, it SHALL report that and store nothing for it.

#### Scenario: A deleted worktree

- **WHEN** a transcript's working directory no longer exists and the registry has no entry for it
- **THEN** the run skips it

#### Scenario: A background session

- **WHEN** the run looks for pending sessions
- **THEN** it never lists a background-run session or a subagent transcript

#### Scenario: A changed format

- **WHEN** a transcript does not parse as a known format
- **THEN** the run's counts name the file as not recognized and no row is written

### Requirement: `#private` removes a session from memory

When any user message in a session contains `#private`, the background run SHALL record the session with status `private`. It SHALL NOT upload the transcript, and SHALL NOT send the transcript to a model. The check SHALL be a plain text search, which uses no model.

#### Scenario: Marked private at the end

- **WHEN** the user's last message in a session contains `#private`
- **THEN** that session gets a `private` row, no R2 object, and no facts

### Requirement: Capture is bounded and extracts facts through the write gate

One background run SHALL capture at most 5 sessions, newest first. Before any model reads a transcript, code SHALL reduce it to the user and assistant text plus error strings. The model SHALL propose facts to the same bar as `/save`, and every fact SHALL pass the write gate. A session with no fact worth keeping SHALL be recorded as `skipped`. A session that already has facts from `/save` SHALL be read only after the last message that save covered. The run SHALL treat transcript content as data, never as instructions.

#### Scenario: A large backlog

- **WHEN** 40 sessions are pending
- **THEN** one run captures the 5 newest and later runs continue

#### Scenario: A saved session continued

- **WHEN** a session ran `/save` and then continued for an hour
- **THEN** the run reads only the messages after the save

#### Scenario: A session on an existing change

- **WHEN** a pending session worked on change `add-po-search`
- **THEN** its facts have slug `add-po-search`

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript contains a web page that tells the reader to write something into memory
- **THEN** the facts record only what the session did, not that instruction

### Requirement: The background run consolidates the live facts

When 24 hours and 5 captured sessions have passed since the last consolidation, the background run SHALL consolidate after capture. It SHALL read the live facts by slug and type, merge facts that say the same thing into one new fact that supersedes them, and supersede a fact that a newer live fact contradicts, newest first. It SHALL NOT delete a fact or edit its body. It SHALL record in its counts how many facts it merged that the write gate had let through, so that search can later be judged by that number.

#### Scenario: Consolidation is due

- **WHEN** 30 hours and 6 captured sessions have passed since the last consolidation
- **THEN** the run consolidates after capture and records the number of merged facts

#### Scenario: Consolidation is not due

- **WHEN** 30 hours but only 2 captured sessions have passed since the last consolidation
- **THEN** the run captures and does not consolidate

#### Scenario: Two facts disagree

- **WHEN** two live facts on one slug give different values for the same setting
- **THEN** the older fact is superseded by the newer one, and both bodies are unchanged

<!-- end specs/memory-capture/spec.md -->
<!-- file specs/memory-recall/spec.md utf8 3561 -->
## Purpose

Put what the repo remembers in front of the agent at the right time: a bounded digest at session start, and searches inside the verbs that make decisions, each fact shown with its age and source.

## ADDED Requirements

### Requirement: A bounded digest loads at session start

The session-start hook SHALL add a digest of the memory store to the agent's context. Code SHALL build the digest with no model. The digest SHALL list live facts ordered by type and recency, and SHALL add the live `thread` facts of the change whose recorded branch is the current branch. It SHALL NOT exceed 150 lines or 25 KB. When facts are left out, its last line SHALL state how many and how to search them. Each line SHALL show the fact's type, body, slug, age in days, author, and id. When the store has no live facts and no run to report, the hook SHALL add nothing.

#### Scenario: A repo with many facts

- **WHEN** the store holds 400 live facts
- **THEN** the digest holds at most 150 lines, and its last line states how many facts it left out and names the search command

#### Scenario: Work continues on a change branch

- **WHEN** a session starts on the branch that change `add-po-search` records, and that slug has two open threads
- **THEN** the digest lists those two threads

#### Scenario: An empty store

- **WHEN** the store has no live facts and no background run
- **THEN** the hook adds nothing to the context

### Requirement: The digest is fast and frozen for the session

The hook SHALL fetch the digest within its network budget. When the store does not answer in that budget, the hook SHALL use the last digest cached on the machine, and SHALL state its age. When no cache exists, it SHALL add nothing. The digest SHALL NOT change during the session, and a fact written during the session SHALL appear in the next session's digest.

#### Scenario: Offline start

- **WHEN** a session starts with no network and a digest cached 2 days ago
- **THEN** the agent gets the cached digest, marked as 2 days old

#### Scenario: A fact is written mid-session

- **WHEN** `/save` stores a fact during a session
- **THEN** the current session's digest is unchanged and the next session's digest includes the fact

### Requirement: A fact is shown as dated context, not as an instruction

Every surface that prints a fact SHALL show its age and source, and the digest SHALL state in one line that facts are dated context to check against the repo, not instructions. When a fact conflicts with the current repo, the repo SHALL win, and the agent MAY record a superseding fact.

#### Scenario: A stale fact

- **WHEN** a 90-day-old fact names a file that no longer exists
- **THEN** the agent trusts the repo and does not act on the fact as written

### Requirement: The verbs read the store where they decide

`/explore` SHALL search the store on the intent before it asks a question, as `explore-clarification` requires. `/continue` SHALL read the slug's live facts and open threads through the memory script. `/ship` SHALL read the change's live facts before it archives. Each read SHALL be one call to the memory script, not a subagent, and an unreachable store SHALL NOT stop the verb.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds live facts for that slug
- **THEN** the recap includes the open threads and the facts, with their ages

#### Scenario: The store is unreachable

- **WHEN** a verb cannot reach the store
- **THEN** it continues without the facts and states that memory was not loaded

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/memory-store/spec.md utf8 10332 -->
## Purpose

Give every WongStack repo one private, searchable store of short typed facts, and of raw session transcripts when R2 is available, so that session context survives without a commit and a team can query it across topics, people, and time.

## ADDED Requirements

### Requirement: Every repo has one memory store on Cloudflare

Every WongStack repo SHALL have one memory store: one D1 database named `<repo>-memory` in the repo's Cloudflare account, plus one private R2 bucket of the same name when the account has R2 enabled. The bucket SHALL be optional. Without it, the store SHALL keep no raw transcripts, and every other memory behavior SHALL work the same. The store SHALL be separate from any application database, and it SHALL have no staging twin. The account id, database id, and bucket name (or its absence) SHALL be recorded under `components.memory` in `.claude/.wong-stack.json`. They are not secrets.

#### Scenario: A repo is provisioned

- **WHEN** provisioning completes in a repo named `billing`
- **THEN** a D1 database named `billing-memory` exists, and a private R2 bucket of the same name exists when the account has R2 enabled
- **AND** `.claude/.wong-stack.json` records the account id, database id, and bucket name or its absence under `components.memory`

#### Scenario: An account without R2

- **WHEN** the store has no bucket
- **THEN** facts, the write gate, search, the digest, capture, and consolidation all work
- **AND** no raw transcript is stored

#### Scenario: The app database is separate

- **WHEN** the repo also has the stack pack's production and staging databases
- **THEN** the memory database is a third database, which the app's Worker has no binding to

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the Cloudflare REST API with a dedicated token named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention. That token SHALL carry only the D1 permissions the store needs, plus R2 permissions when the store has a bucket. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No Worker SHALL stand in front of the store.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable and the page that owns it
- **AND** no value is printed

### Requirement: The unit of memory is a short typed fact that is superseded, never edited

The memory database SHALL hold `sessions` (one row per transcript), `facts`, `tags`, `fact_tags`, a `runs` table for background runs, and a full-text index over each fact's body, created by forward-only migrations that ship with the payload. A fact SHALL have a slug, one type (`user`, `feedback`, `project`, `reference`, or `thread`), a body of at most 400 characters, a source (`save`, `backfill`, `migration`, or `consolidation`), a creation time, an author, and its source session. A fact SHALL NOT be edited or deleted after it is written. New understanding SHALL become a new fact that supersedes the old one, and a fact is live while nothing supersedes it. A `thread` fact records an open question, and it closes when a later fact supersedes it.

#### Scenario: A decision changes

- **WHEN** a live fact says the digest cap is 100 lines and a later session sets it to 150
- **THEN** a new fact with the new cap exists and the old fact points to it as superseded
- **AND** the old fact's body is unchanged

#### Scenario: An open thread is resolved

- **WHEN** a session resolves the question in a live `thread` fact
- **THEN** a new fact that states the resolution supersedes the thread, and the thread is no longer live

#### Scenario: A fact is too long

- **WHEN** a fact's body has more than 400 characters
- **THEN** the store rejects it and states the limit

#### Scenario: A migration runs twice

- **WHEN** the schema migrations run against a database that is already current
- **THEN** no table or row changes

### Requirement: A write gate decides add, supersede, or drop

Before the store accepts a fact, the memory script SHALL show the writer the live facts with the same slug and the closest keyword matches across all slugs. The writer SHALL then add the fact, supersede one named live fact, or drop the fact. The script SHALL record a supersede in the same batch as the new fact. The gate SHALL be the same for `/save`, the background capture, the migration, and consolidation.

#### Scenario: A paraphrase of a live fact

- **WHEN** a session produces a fact that says the same thing as a live fact in other words
- **THEN** the writer sees the live fact among the matches and drops the new fact

#### Scenario: A correction

- **WHEN** a new fact contradicts a live fact that the gate shows
- **THEN** the new fact is stored and supersedes the old one

### Requirement: R2 keeps each full raw transcript

When the store has a bucket, for each session with status `captured` or `skipped`, the store SHALL keep the full raw transcript file in R2 at `sessions/<agent>/<session-id>.jsonl`, and SHALL keep it with no expiry. Before upload, every non-empty value in the repo's `.env` SHALL be replaced with a fixed placeholder. A session with status `private` SHALL have no R2 object. The memory script SHALL be able to print a stored transcript reduced to user and assistant text, so a reader can return to the full record behind a fact. When the store has no bucket, the session row SHALL still be written with no object key, and the script SHALL state that transcripts are not stored.

#### Scenario: A known secret in a transcript

- **WHEN** a transcript contains the value of a variable from `.env`
- **THEN** the uploaded object contains the placeholder in its place

#### Scenario: A longer session is uploaded again

- **WHEN** a session that was uploaded earlier has grown since
- **THEN** the object at the same key is replaced with the full current file

#### Scenario: A reader follows a fact to its source

- **WHEN** the agent asks for the source of a fact and the store has a bucket
- **THEN** it gets the source session's reduced text, not the raw file

#### Scenario: No bucket

- **WHEN** a session is captured in a store with no bucket
- **THEN** its session row and facts are written, no upload is tried, and asking for its source states that transcripts are not stored

### Requirement: A fact never stores a credential value

Before the store accepts a fact, its body SHALL be checked against every non-empty `.env` value and against known token patterns (for example `ghp_`, `sk-`, `AKIA`, JWTs, and `Bearer` headers). A match SHALL reject the fact. The report SHALL name the session and the pattern, but never the value.

#### Scenario: A pasted token reaches a fact draft

- **WHEN** a fact draft contains a string that matches a GitHub token pattern
- **THEN** the store rejects the fact
- **AND** the report names the session and the pattern without the value

### Requirement: The memory script searches facts with keywords and tags

The payload SHALL ship a dependency-free Node.js script that searches the store. It SHALL filter by full text, tag (including aliases), type, date range, author, branch, slug, and change state, and SHALL return live facts unless asked for superseded ones. It SHALL print one line per fact: type, body, slug, age in days, author, and fact id. It SHALL print a slug's live facts newest first, with its open threads first. Change state SHALL be derived from the repo (`active` when `openspec/changes/<slug>/` exists, `shipped` when an archive for the slug exists, and `conversation` otherwise), and SHALL NOT be stored. Search SHALL NOT depend on embeddings or a vector index.

#### Scenario: Search by tag and date

- **WHEN** the agent searches for tag `ship` since `2026-09-01`
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: Read a topic

- **WHEN** the agent asks for slug `add-po-search`
- **THEN** it gets that slug's open threads, then its other live facts newest first

#### Scenario: A shipped change

- **WHEN** a slug has an archive folder and no active change folder
- **THEN** the output shows the state `shipped`

### Requirement: Tags come from a curated table that the model may extend

A fact's tags SHALL exist in the `tags` table. The script SHALL list every tag with its definition and use count. Adding a tag SHALL require a definition. When the new name is close to an existing tag, the script SHALL warn and name that tag. A tag with `alias_of` set SHALL match its target in searches.

#### Scenario: A tag without a definition

- **WHEN** a fact uses a tag that is not in the table and gives no definition
- **THEN** the store rejects the fact and names the missing tag

#### Scenario: A near-duplicate tag

- **WHEN** a fact adds the tag `saves` while `save` exists
- **THEN** the script warns and names `save`

#### Scenario: An alias

- **WHEN** `checkpoint` is an alias of `save` and the agent searches for `save`
- **THEN** facts tagged `checkpoint` are included

### Requirement: A fact that cannot reach the store waits in a local spool

When a fact cannot be written to the store because the network, the token, or the API fails, the script SHALL write it to an ignored local spool, report it as spooled, and exit successfully. A spool that is not empty SHALL be a reason for the next session start to begin a background run, and that run SHALL pass the spooled facts through the write gate, upload them, and then remove them. A spooled fact SHALL still pass the credential check before it is written to the spool.

#### Scenario: Save while offline

- **WHEN** `/save` runs with no network
- **THEN** its facts are written to the spool and the save reports them as spooled
- **AND** the git checkpoint is not blocked

#### Scenario: Spool drains

- **WHEN** a later session starts with the store reachable and the spool holds facts
- **THEN** the background run passes them through the write gate, uploads them, and removes them from the spool

<!-- end specs/memory-store/spec.md -->
<!-- file specs/path-scoped-rules/spec.md utf8 4189 -->
## MODIFIED Requirements

### Requirement: The payload ships path-scoped rules in the core category

The payload SHALL include a `.claude/rules/` directory (real path `.agents/rules/` in this repo, reached through the `.claude` symlink) as a core, copy-if-absent category on the payload manifest. Each rule file SHALL carry YAML frontmatter with a `paths:` list of glob patterns, so an agent loads it only when reading files those patterns match. Four rules SHALL ship:

- `code.md`, scoped to the code surfaces (`app/**`, `scripts/**`, `.github/workflows/**`)
- `wiki.md`, scoped to `wiki/**`
- `openspec.md`, scoped to `openspec/**`
- `secrets.md`, scoped to the env surfaces (`.env*`, `**/.env.example`)

A target repo that already has any of these files SHALL keep its own copy untouched, per the sync's existing local-authorship rule.

#### Scenario: An agent edits code

- **WHEN** an agent reads or edits a file under `app/`, `scripts/`, or `.github/workflows/`
- **THEN** the `code.md` rule is in its context before the edit
- **AND** a session that touches no matching file never loads it

#### Scenario: An agent touches the wiki or notes

- **WHEN** an agent reads a file under `wiki/`
- **THEN** the matching rule imports the owning convention pages into context for that surface
- **AND** no rule loads for session context, because facts live in the memory store and not under `notes/`

#### Scenario: An agent works inside an OpenSpec change

- **WHEN** an agent reads or edits a file under `openspec/`
- **THEN** the `openspec.md` rule is in its context, stating where each kind of fact belongs across the four surfaces and that OpenSpec never runs git

#### Scenario: An agent touches an env file

- **WHEN** an agent reads or edits `.env.example` or another env surface
- **THEN** the `secrets.md` rule is in its context, pointing at the owning secrets convention

#### Scenario: A target repo receives the rules

- **WHEN** `/wong-sync` runs in a repo that lacks `.claude/rules/code.md`
- **THEN** the file is proposed as a missing payload file
- **AND** a locally authored rule of the same name is never overwritten

### Requirement: A rule is a thin importer, except for the fact it owns

A rule file SHALL NOT restate a convention another payload file owns — it SHALL name the owning doc, either importing it with Claude Code's `@path` syntax or linking it, keeping each rule short. `@`-imports load at launch (Claude Code expands imports eagerly); a rule SHALL therefore `@`-import only conventions worth holding in every session, and link the rest for the agent to read when the rule fires. Where a rule states a fact no other file owns, the rule file itself SHALL be that fact's single owner. Specifically:

- `code.md` SHALL own the write-less-code standard — the least code that does the job and none that doesn't; decompose branchy code into named helpers as it is written; prefer surgical edits over file rewrites; verify with the project's own checks after substantive edits; no `any`, and `unknown` only where it is narrowed before use — and SHALL state that the numeric limits are enforced by the repo's CI gates, not by the agent's memory.
- `wiki.md` SHALL import the wiki style and voice pages and restate nothing from them.
- `openspec.md` SHALL own the cross-surface routing rule in rule form — a fact about why a change is shaped its way goes to the change's Decision log, session context to facts in the memory store, reusable process to the wiki — and SHALL restate no surface's own convention.
- `secrets.md` SHALL link the secrets convention page and restate nothing from it beyond the one-line reason to read it.

#### Scenario: A rule names an owned convention

- **WHEN** a rule needs the reader to follow a convention another file owns
- **THEN** it imports or links the owning file rather than restating its scope or exceptions

#### Scenario: The code rule states the standard

- **WHEN** an agent loads `code.md`
- **THEN** the write-less-code standard is stated there in full, because no other file owns it
- **AND** every numeric limit is attributed to the CI gate that enforces it, not restated as a number the agent must track

<!-- end specs/path-scoped-rules/spec.md -->
<!-- file specs/session-notes/spec.md utf8 8686 -->
## ADDED Requirements

### Requirement: Session context lives as facts in the memory store

Session context SHALL live as facts in the repo's memory store, not in the repository. A fact's slug SHALL be the OpenSpec change name for change work, or a kebab-case topic slug for a conversation-only session. No session SHALL write a file under `notes/`.

#### Scenario: Facts are keyed to their line of work

- **WHEN** a session's work is tracked as change `add-po-search` on any branch
- **THEN** its facts have slug `add-po-search` in the memory store
- **AND** no file under `notes/` is written

#### Scenario: A conversation-only session still leaves facts

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** facts with a topic slug are written to the memory store
- **AND** no OpenSpec change folder is created for them

### Requirement: `/save` is the deliberate capture point

`/save` SHALL extract facts from the conversation since the session's last capture and pass each through the write gate, with the current session id and tags. It SHALL write no fact when the session produced nothing beyond the diff and the change's Decision log, and SHALL say so in its report. Its report SHALL state how many facts were added, superseded, and dropped, and whether they were stored or spooled. The background capture SHALL be the automatic capture point for sessions that end without `/save`.

#### Scenario: A second save supersedes

- **WHEN** `/save` runs again on a change and one new fact corrects an earlier one
- **THEN** the new fact supersedes the earlier one, and the earlier fact's body is unchanged

#### Scenario: A save with nothing new to capture

- **WHEN** the session produced nothing beyond the diff and the Decision log
- **THEN** `/save` writes no fact and reports that it skipped capture

### Requirement: Facts keep what a cold reader needs

A session's facts SHALL keep what the user stated (facts, constraints, preferences, corrections), decisions with their reason, options ruled out with their reason, and concrete specifics (names, repo-relative paths, numbers, versions, error strings). An unresolved question SHALL become a `thread` fact. Facts SHALL omit tool-call mechanics, file dumps, the assistant's reasoning, the path taken to a conclusion, and anything already true in the repo or in the change's Decision log. A reason SHALL stay in the same fact as its decision.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** one fact records the rejected option and why it was rejected

#### Scenario: A question stays open

- **WHEN** a session ends with a question that nobody answered
- **THEN** a `thread` fact records it, and it stays live until a later fact supersedes it

## MODIFIED Requirements

### Requirement: Session capture excludes credential values

When `/save` or the background capture turns a session into facts, it SHALL exclude every real credential value supplied, rotated, read, or written during the session. It MAY preserve the variable name, the fact that it changed, its purpose, where it is obtained, and any non-secret operational decision. The same exclusion SHALL apply to the change's Status, Decision log, tasks, commit message, PR body, `/save` report, and background-run counts.

#### Scenario: A token was rotated during the session

- **WHEN** `/save` captures a session in which `SERVICE_TOKEN` was rotated
- **THEN** a fact may record that `SERVICE_TOKEN` rotated and its non-secret sourcing guidance
- **AND** neither the old nor new value appears in a fact or another handoff surface

#### Scenario: A pasted credential appears in surrounding conversation

- **WHEN** a credential value is present in conversation context used to write facts
- **THEN** the writer omits the value rather than treating verbatim user text as automatically durable
- **AND** the facts remain useful by retaining the non-secret decision and variable name

### Requirement: A conversation-only session does not produce an OpenSpec change

`/save` SHALL NOT author an OpenSpec change for a session that produced no code and no plan. It SHALL write the session's facts, and report that no change was created.

#### Scenario: No fake proposal

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** no `openspec/changes/<name>/` folder is created
- **AND** no proposal describing nothing changing and no empty `tasks.md` are written

### Requirement: A prose-only save commits directly to the default branch

When a `/save`'s entire diff falls inside the **prose allowlist** — the path prefix `wiki/**` — `/save` SHALL commit and push directly to the default branch: no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope; any changed path outside the allowlist restores the normal branch + PR flow for the whole save. `/save` SHALL NOT route on file extension, and SHALL NOT make a judgment call about whether a prose edit is consequential enough to warrant a PR. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

A save that only stores facts has no diff. It SHALL write the facts to the memory store and make no commit.

If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is understanding
- **THEN** its facts are written to the memory store
- **AND** no commit, branch, or PR is created, and the user is not asked to run `/ship`

#### Scenario: A dream session lands in one command

- **WHEN** `/save` runs after explicit wiki work and every changed path is under `wiki/`
- **THEN** the whole diff is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains a wiki page plus a source, skill, spec, or config file
- **THEN** the wiki page rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Markdown outside the allowlist keeps the gate

- **WHEN** a save's diff touches `.claude/skills/**/*.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, or `openspec/**`
- **THEN** the normal branch + PR flow applies, because routing is by path prefix and not by extension

#### Scenario: Prose-only save reports without a PR link

- **WHEN** a prose-only save completes
- **THEN** the report names the changed prose paths and states they landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

#### Scenario: Protected default branch falls back

- **WHEN** a prose-only save's direct push to the default branch is rejected
- **THEN** `/save` cuts a branch, opens a PR whose body is the prose change, and states that the default branch is protected
- **AND** it never force-pushes

## REMOVED Requirements

### Requirement: Session notes live in a repo-committed `notes/` surface

**Reason**: Session context moves to facts in the memory store, which is private, needs no commit, and can be searched.
**Migration**: The one-time migration extracts facts from each `notes/<slug>.md`, keeps the note's text in R2, then deletes `notes/`. See the `wong-sync` delta for installed repos.

### Requirement: `/save` is the sole conversation capture point

**Reason**: The background capture adds an automatic capture point.
**Migration**: Replaced by "`/save` is the deliberate capture point" and the `memory-capture` capability.

### Requirement: Notes are a compression of the session, not a summary or a transcript

**Reason**: Notes no longer exist. The raw transcript in R2 is the full record, and facts keep what a cold reader needs.
**Migration**: Replaced by "Facts keep what a cold reader needs".

### Requirement: `/continue` reads the note alongside the change

**Reason**: `/continue` reads the slug's facts from the memory store.
**Migration**: Replaced by "The verbs read the store where they decide" in the `memory-recall` capability.

### Requirement: `notes/` is a payload surface installed by `/wong-sync`

**Reason**: `notes/` no longer exists. The bar for facts moves into the `memory` skill's references, where `/save` and the background capture both read it.
**Migration**: `/wong-sync` plans the move of an installed `notes/` into the memory store.

<!-- end specs/session-notes/spec.md -->
<!-- file specs/ship-full-cycle/spec.md utf8 1159 -->
## ADDED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before it archives a change, `/ship` SHALL read that change's live facts from the memory store and extract only reusable process facts. It SHALL edit the owning wiki pages under the wiki rules, in the same pull request as the change, and SHALL record in the Decision log which pages changed, or that no fact was reusable. No other skill or hook SHALL write the wiki automatically. When the store is unreachable, `/ship` SHALL record that the step was skipped and continue.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention that applies to future work
- **THEN** the ship pull request edits the wiki page that owns that topic
- **AND** the Decision log names the page

#### Scenario: Nothing reusable

- **WHEN** a change's facts hold only change-specific context
- **THEN** no wiki file changes and the Decision log states that no fact was reusable

#### Scenario: The store is unreachable at ship time

- **WHEN** `/ship` cannot read the memory store
- **THEN** it records the skipped step in the Decision log and continues to merge

<!-- end specs/ship-full-cycle/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 7149 -->
## ADDED Requirements

### Requirement: Core setup requires a Cloudflare account

Every WongStack repo SHALL require a Cloudflare account for its memory store. R2 SHALL be optional: it needs a payment method on file, and without it the store keeps no raw transcripts. That account need not host the application, and the Cloudflare stack pack SHALL stay opt-in. The required-tools page SHALL list the account, the provisioning token, and the memory token beside the command-line tools, and SHALL link the credentials page for how to obtain them.

#### Scenario: A reader checks what setup needs

- **WHEN** a reader opens the required-tools page
- **THEN** a Cloudflare account is listed as required for the memory store, and R2 is listed as optional with the payment-method step
- **AND** the stack pack is still described as opt-in

## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/verify` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, and `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/verify` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

Core payload scripts MAY run on Node.js, which the OpenSpec CLI already requires, only when they use Node's built-in modules and need no package manifest, dependency entry, or install step. The memory scripts, the review builder, and the improvement survey are such scripts. No core payload script or skill SHALL invoke a standalone `jq`, `python`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/verify`, `curl` as a provisioning dependency, and dependency-free Node scripts on the runtime OpenSpec brings. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: A memory script uses only built-in modules

- **WHEN** a reviewer inspects the memory skill's scripts
- **THEN** they import only Node built-in modules
- **AND** the repository gains no package manifest or lockfile for them

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/verify` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/verify` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/verify`
- **THEN** no browser tool or browser is installed on its behalf

### Requirement: Runtimes are installed at the point of need, never pre-emptively

No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node is a real dependency of the planning verbs and of the memory layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what
the verbs actually do. `/save` shells out to `openspec new change`,
`openspec status --json`, and `openspec instructions` when it authors a change for a
session that skipped `/plan`, and it writes facts through the memory script, so it is
**not** a no-runtime verb. A list that is wrong here is worse than no list: it
is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs its readiness check on a machine with no Node.js
- **THEN** it does not install Node during the check
- **AND** it proceeds until a step genuinely requires the OpenSpec CLI or the memory script, then explains in plain language what needs installing and why, and asks

#### Scenario: The user declines the runtime install

- **WHEN** the user declines the Node install
- **THEN** setup completes the layer that needs no runtime — `CLAUDE.md`, the wiki, the skills, and the verbs that touch only git and files
- **AND** it names exactly which verbs are unavailable without Node, including session memory, and how to enable them later
- **AND** it does not dead-end, fail, or leave the repo half-written

#### Scenario: Install prefers a user-local method

- **WHEN** the user consents to installing Node
- **THEN** the install targets the user's own home directory rather than requiring `sudo`, wherever the platform allows it

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** setup states which verbs work without Node
- **THEN** `/save`'s change-authoring and fact paths are named as needing it, alongside `/plan`, `/apply`, `/continue`'s fact recap, `/explore`'s memory search,, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI or the memory script

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 1432 -->
## ADDED Requirements

### Requirement: Sync plans the move of notes into the memory store

When a sync brings in the memory store to a repo that has a `notes/` directory, the planned update SHALL include tasks to provision the store, and then, for every `notes/<slug>.md`: upload the note's text to R2 when the store has a bucket, record a session with agent `migration` for it, and extract its facts through the write gate with source `migration` and the note's original dates. The plan SHALL then verify that every note has its migration session, and only then delete `notes/` and its path rule. A note with no fact worth keeping SHALL still get its migration session, recorded as `skipped`. A locally changed `notes/README.md` SHALL be reported so its local conventions can move to an owning page.

#### Scenario: An installed repo with notes

- **WHEN** `/wong-sync` plans an update to this release in a repo with 12 notes
- **THEN** the plan migrates 12 notes, verifies that 12 migration sessions exist in the store, and only then deletes `notes/`

#### Scenario: The migration fails midway

- **WHEN** the migration stops after 5 of 12 notes
- **THEN** `notes/` stays in place and the task reports the 7 notes that have no migration session

#### Scenario: A note's text is kept

- **WHEN** a note is migrated into a store with a bucket
- **THEN** its full text is in R2, and each of its facts links to its migration session

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file migration.json utf8 61417 fence=~~~ -->
~~~json
{
 "tags": [
  {
   "name": "save",
   "definition": "The /save checkpoint: capture, commit, push, PR, and CI wait."
  },
  {
   "name": "ship",
   "definition": "The /ship archive-and-merge step."
  },
  {
   "name": "sync",
   "definition": "/wong-sync and how target repos take upstream updates."
  },
  {
   "name": "setup",
   "definition": "/wong-setup and first-time installation."
  },
  {
   "name": "verify",
   "definition": "/verify, the on-demand evidence walk of a preview."
  },
  {
   "name": "review",
   "definition": "The review.html page, its kit, builder, and visuals."
  },
  {
   "name": "explore",
   "definition": "/explore and its question rounds."
  },
  {
   "name": "plan",
   "definition": "/plan and the planning artifacts it drafts."
  },
  {
   "name": "apply",
   "definition": "/apply and how tasks are worked."
  },
  {
   "name": "continue",
   "definition": "/continue and cold resume."
  },
  {
   "name": "openspec",
   "definition": "The OpenSpec CLI, changes, specs, and archives."
  },
  {
   "name": "wiki",
   "definition": "The progressive-disclosure wiki and its rules."
  },
  {
   "name": "cloudflare",
   "definition": "Cloudflare accounts, tokens, D1, R2, Workers, and Access."
  },
  {
   "name": "ci",
   "definition": "GitHub Actions and the delivery gate."
  },
  {
   "name": "secrets",
   "definition": "Credentials, .env handling, and secret hygiene."
  },
  {
   "name": "skills",
   "definition": "Skill authoring, descriptions, and skill layout."
  },
  {
   "name": "tests",
   "definition": "Test suites, fixtures, and what they must prove."
  },
  {
   "name": "payload",
   "definition": "What WongStack ships to target repos, and its release rules."
  },
  {
   "name": "context",
   "definition": "Context budget, token cost, and always-loaded instructions."
  },
  {
   "name": "git",
   "definition": "Branches, worktrees, commits, and merges."
  },
  {
   "name": "stack-pack",
   "definition": "The opt-in Cloudflare stack pack and app scaffold."
  },
  {
   "name": "user-preference",
   "definition": "How the user wants work done, stated by the user."
  },
  {
   "name": "dependencies",
   "definition": "Toolchain and package versions, and how they are surveyed and updated."
  },
  {
   "name": "managed-service",
   "definition": "The hosted WongStack service: accounts, VMs, billing, pairing, and login rules."
  }
 ],
 "notes": [
  {
   "slug": "widen-save-prose-fast-path",
   "started": "2026-07-30",
   "updated": "2026-07-30",
   "facts": [
    {
     "key": "widen-save-prose-fast-path#1",
     "type": "feedback",
     "body": "User wants a PR only for changes that can affect the deployed app: code, config, and Cloudflare wiring. Prose such as notes and wiki pages may go straight to main without review (stated 2026-07-30).",
     "tags": [
      "save",
      "git",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "cf-secret-parity-gate",
   "started": "2026-08-01",
   "updated": "2026-08-01",
   "facts": [
    {
     "key": "cf-secret-parity-gate#1",
     "type": "project",
     "body": "As of 2026-08-01, the downstream app wongos runs no cron triggers on staging. The user exercises scheduled work there only by manual trigger, so the schedule itself is tested only in production.",
     "tags": [
      "cloudflare",
      "stack-pack"
     ],
     "supersedes": []
    },
    {
     "key": "cf-secret-parity-gate#2",
     "type": "thread",
     "body": "Open since 2026-08-01: the `wrangler secret bulk` and `wrangler secret list` round-trip in `npm run secrets:push` (scripts/cf-secrets.mjs) was never run against a live Cloudflare account; the test stopped at auth. Confirm the happy path on the next real push.",
     "tags": [
      "cloudflare",
      "secrets",
      "stack-pack"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "staging-worker-env",
   "started": "2026-08-01",
   "updated": "2026-08-01",
   "facts": [
    {
     "key": "staging-worker-env#1",
     "type": "reference",
     "body": "wongos is a downstream repo that uses the stack pack: Worker `wongos`, D1 `wong-db`. The user shares `wong-db` on purpose across several mini apps.",
     "tags": [
      "stack-pack",
      "cloudflare"
     ],
     "supersedes": []
    },
    {
     "key": "staging-worker-env#2",
     "type": "feedback",
     "body": "User wants a change proven against real infrastructure before /ship, not only by reasoning or local checks (asked 2026-08-01, again 2026-08-02). For a stack-pack change, rehearse on a scratch Worker, queue, and D1, then tear them down, because a wrong assumption reaches every adopting repo.",
     "tags": [
      "ship",
      "verify",
      "stack-pack",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "staging-worker-env#3",
     "type": "project",
     "body": "To tear down a Worker that consumes a queue, delete the queue consumer first (`DELETE /accounts/{id}/queues/{queue_id}/consumers/{consumer_id}`), then the Worker, then the queue. Each blocks the other's delete, and `wrangler delete` did not resolve it (2026-08-01).",
     "tags": [
      "cloudflare",
      "stack-pack"
     ],
     "supersedes": []
    },
    {
     "key": "staging-worker-env#4",
     "type": "project",
     "body": "Exercise pack-script changes (scripts/cf-*.sh, lib-wrangler-config.*) against a synthetic repo under /tmp with an `app/` layout and a prod + `env.staging` wrangler config before you push. On 2026-08-01, `bash -n` alone missed that the staging D1 needs its own database_name.",
     "tags": [
      "stack-pack",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "staging-worker-env#5",
     "type": "thread",
     "body": "Open since 2026-08-01: should pack migration files carry an app prefix in their names, because `wong-db` is shared across mini apps? Timestamps already prevent collisions, so this is about readability only.",
     "tags": [
      "stack-pack"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "zero-dependency-onboarding",
   "started": "2026-08-01",
   "updated": "2026-08-01",
   "facts": [
    {
     "key": "zero-dependency-onboarding#1",
     "type": "user",
     "body": "The target WongStack user is non-technical. Setup must be: paste one prompt, then hand over one Cloudflare token, with as few local dependencies as possible (stated 2026-08-01). Development is remote: push, then look at the preview URL.",
     "tags": [
      "setup",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "zero-dependency-onboarding#2",
     "type": "user",
     "body": "The user has two Cloudflare accounts on one login: `Info@claymoo.com's Account` and `Matthewwong525@gmail.com's Account`. A token can see both, so provisioning cannot assume one account.",
     "tags": [
      "cloudflare"
     ],
     "supersedes": []
    },
    {
     "key": "zero-dependency-onboarding#3",
     "type": "feedback",
     "body": "User prefers one end-to-end-verified PR: fold a bug that a change's own testing finds into that change, not into a follow-up (chosen twice on 2026-08-01).",
     "tags": [
      "ship",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "zero-dependency-onboarding#4",
     "type": "project",
     "body": "After you merge upstream into a file you rewrote wholesale, diff the upstream range for that file (`git diff <old>..<new> -- <file>`). On 2026-08-01 a rewrite of wiki/stack/cloudflare-credentials.md silently dropped a new upstream section, with no conflict marker.",
     "tags": [
      "git"
     ],
     "supersedes": []
    },
    {
     "key": "zero-dependency-onboarding#5",
     "type": "thread",
     "body": "Disposable GitHub repos from the 2026-08-01 end-to-end test may still exist: matthewwong525/wongstack-e2e-test and matthewwong525/wongstack-e2e-test2. Deleting needs `gh auth refresh -h github.com -s delete_repo` first.",
     "tags": [
      "git",
      "setup"
     ],
     "supersedes": []
    },
    {
     "key": "zero-dependency-onboarding#6",
     "type": "thread",
     "body": "The reference Cloudflare token 'WongStack Token' was left widened after testing on 2026-08-01. Narrowing it back was offered but not done.",
     "tags": [
      "cloudflare",
      "secrets"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "consolidate-payload-duplication",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "consolidate-payload-duplication#1",
     "type": "thread",
     "body": "Unresolved since 2026-08-02: what openspec/specs/ is for in a repo whose payload is prose. Live specs delivery-gate, app-scaffold, and secrets-convention still have a TBD Purpose, and archived delta specs nearly duplicate the live ones. Not raised with the user yet.",
     "tags": [
      "openspec"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "extract-walk-skill",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "extract-walk-skill#1",
     "type": "project",
     "body": "`disable-model-invocation: true` in skill frontmatter also blocks the Skill tool, not only auto-loading (error: 'cannot be used with Skill tool due to disable-model-invocation', verified 2026-08-02). Never set it on a WongStack verb, because the verbs hand off to each other through the Skill tool.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "extract-walk-skill#2",
     "type": "reference",
     "body": "Claude Code truncates a skill's `description` plus `when_to_use` at 1,536 characters in the skill listing, so trigger text past that cannot match (code.claude.com/docs/en/skills, checked 2026-08-02).",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "extract-walk-skill#3",
     "type": "project",
     "body": "Skills hot-reload mid-session: a new .agents/skills/<name>/SKILL.md is invocable at once. To test a frontmatter flag, make a flagged probe skill and an unflagged control. The control proves the reload, so a failure comes from the flag.",
     "tags": [
      "skills",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "extract-walk-skill#4",
     "type": "reference",
     "body": "github.com/cloudflare/skills is Cloudflare's own Apache-2.0 skill set; its `cloudflare` skill is about 2.0 MB. User dropped vendoring it on 2026-08-02. If revisited: the workers + d1 + wrangler slice is about 124 KB, and a per-machine install does not reach teammates who clone.",
     "tags": [
      "cloudflare",
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "payload-hardening-9-1-0",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "payload-hardening-9-1-0#1",
     "type": "feedback",
     "body": "When several OpenSpec changes are ready together, the user chose one branch, one PR, and one VERSION/CHANGELOG entry, applied in dependency order (release 9.1.0, 2026-08-02). Reason: each change bumps VERSION and CHANGELOG.md, so separate branches conflict on both.",
     "tags": [
      "ship",
      "payload",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "payload-hardening-9-1-0#2",
     "type": "reference",
     "body": "Access test resources left standing on 2026-08-02 in Matthewwong525@gmail.com's Cloudflare account: custom domain wongstack-staging.ithinkwong.com, Access app 'WongStack staging (Access runbook verification)', service token 'wongstack-access-verification'. Remove them when no longer needed.",
     "tags": [
      "cloudflare"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "setup-sync-consolidation",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "setup-sync-consolidation#1",
     "type": "project",
     "body": "GitHub heading anchors turn each space into a hyphen and drop punctuation, so `## Step 1 — refresh` becomes `#step-1--refresh` with a double hyphen. That anchor is correct; a checker that collapses whitespace wrongly reports it as broken (2026-08-02).",
     "tags": [
      "wiki",
      "payload"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "ship-staging-tests",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "ship-staging-tests#1",
     "type": "feedback",
     "body": "The user often steers by picking a direction instead of answering every open question. When they move past a fork, take the recommended option and state the assumption plainly; they accepted that both times on 2026-08-02.",
     "tags": [
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "ship-staging-tests#2",
     "type": "feedback",
     "body": "When infrastructure does not work, the user wants a diagnosis of why, not a workaround or an accepted limitation (2026-08-02).",
     "tags": [
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "ship-staging-tests#3",
     "type": "reference",
     "body": "GitHub renders inline images and playable video only for `user-attachments` URLs, which come from a drag-and-drop in the web UI. No gh or REST path makes them, so media posted from a CLI shows as a link unless hosted elsewhere (checked 2026-08-02).",
     "tags": [
      "verify",
      "review"
     ],
     "supersedes": []
    },
    {
     "key": "ship-staging-tests#4",
     "type": "project",
     "body": "This repo's own app is provisioned in Matthewwong525@gmail.com's Cloudflare account: Workers wongstack and wongstack-staging, D1 wongstack-db and wongstack-db-staging. It was set up by hand on 2026-08-02, not through /wong-cloudflare.",
     "tags": [
      "cloudflare",
      "stack-pack"
     ],
     "supersedes": []
    },
    {
     "key": "ship-staging-tests#5",
     "type": "thread",
     "body": "Open since 2026-08-02: a repo with a Worker but no D1 cannot use the pack pipeline, because scripts/cf-build.sh exits with an error when it cannot read a database_name. Still true on 2026-09-25; not pursued.",
     "tags": [
      "stack-pack",
      "ci"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "wong-sync-verdict-transparency",
   "started": "2026-08-02",
   "updated": "2026-08-02",
   "facts": [
    {
     "key": "wong-sync-verdict-transparency#1",
     "type": "feedback",
     "body": "When a WongStack skill makes a judgment call for the user, the user expects to choose, or at least to see and reverse the call later (stated 2026-08-02 about /wong-sync 'auto deciding'). Treat it as a standing preference for every skill.",
     "tags": [
      "user-preference",
      "skills",
      "sync"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-verdict-transparency#2",
     "type": "project",
     "body": "Design check: a tool can have a review gate for what it says yes to and none for what it says no to. Look for this asymmetry wherever a skill proposes work, because nobody audits the rejected set (found in /wong-sync, 2026-08-02).",
     "tags": [
      "review",
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-verdict-transparency#3",
     "type": "project",
     "body": "In a persisted record, keep the agent's inferences apart from the user's decisions, and let only the user's decisions suppress future work. A guess stored in the same slot as a refusal gets the refusal's permanence (lesson from /wong-sync verdicts, 2026-08-02).",
     "tags": [
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "first-time-install-audit",
   "started": "2026-08-05",
   "updated": "2026-08-05",
   "facts": [
    {
     "key": "first-time-install-audit#1",
     "type": "project",
     "body": "To find install defects, drive a real install from an empty folder (no git, no app) as a non-technical persona, from the cached upstream clone, through setup, sync, /wong-cloudflare, CI deploy, and teardown. This repo hides such defects. Decided 2026-08-05 not to automate it, because a fixture repo drifts from a real install.",
     "tags": [
      "setup",
      "tests",
      "payload"
     ],
     "supersedes": []
    },
    {
     "key": "first-time-install-audit#2",
     "type": "feedback",
     "body": "Do not ask the user for what can be looked up (stated 2026-08-05). Example: derive git identity from `gh api user` instead of a prompt.",
     "tags": [
      "user-preference",
      "setup"
     ],
     "supersedes": []
    },
    {
     "key": "first-time-install-audit#3",
     "type": "project",
     "body": "Cloudflare D1 deletion is eventually consistent. On 2026-08-05 a delete returned success, but an immediate re-create still failed with `7406 System limit reached` (10 D1 per account); the same create worked about 20 s later.",
     "tags": [
      "cloudflare"
     ],
     "supersedes": []
    },
    {
     "key": "first-time-install-audit#4",
     "type": "project",
     "body": "As of 2026-08-06, the CLOUDFLARE_API_TOKEN in this repo's .env is account-scoped: D1 and Workers calls pass, but `POST /user/tokens/verify` returns 1000. The /wong-cloudflare widen step cannot run with it; that needs a user-scoped token from My Profile > API Tokens.",
     "tags": [
      "cloudflare",
      "secrets"
     ],
     "supersedes": []
    },
    {
     "key": "first-time-install-audit#5",
     "type": "thread",
     "body": "Disposable GitHub repos from end-to-end tests may still exist: matthewwong525/wongstack-e2e-test and wongstack-e2e-test2 (2026-08-01), and e2e-run-club-test (2026-08-05). Deleting needs `gh auth refresh -h github.com -s delete_repo`, then `gh repo delete <repo> --yes`.",
     "tags": [
      "git",
      "setup"
     ],
     "supersedes": [
      "zero-dependency-onboarding#5"
     ]
    }
   ]
  },
  {
   "slug": "authorize-token-widen",
   "started": "2026-08-06",
   "updated": "2026-08-06",
   "facts": [
    {
     "key": "authorize-token-widen#1",
     "type": "project",
     "body": "When the payload tells an agent to do something its default caution would flag (touch a credential or an external account), state the permission explicitly, next to the rule it is an exception to. Otherwise the agent asks every run, because it generalizes from the nearest rule (2026-08-06, token widen).",
     "tags": [
      "skills",
      "payload"
     ],
     "supersedes": []
    },
    {
     "key": "authorize-token-widen#2",
     "type": "thread",
     "body": "Not audited since 2026-08-06: whether other /wong-cloudflare steps (gh secret set, teardown, the Access branch) lack a stated permission, the way the token widen did.",
     "tags": [
      "cloudflare",
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "browser-run-testing",
   "started": "2026-08-06",
   "updated": "2026-08-06",
   "facts": []
  },
  {
   "slug": "tests-belong-to-the-app",
   "started": "2026-08-09",
   "updated": "2026-08-09",
   "facts": [
    {
     "key": "tests-belong-to-the-app#1",
     "type": "project",
     "body": "To check CI test wiring before a push, paste the `has_test` discovery loop from .github/workflows/test.yml into bash and see which directories it resolves (used 2026-08-09).",
     "tags": [
      "ci",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "tests-belong-to-the-app#2",
     "type": "thread",
     "body": "Open since 2026-08-09: the staging-vs-production database-name test for the pipeline scripts was removed with the root tests/ folder. `readDatabaseName` in scripts/lib-wrangler-config.mjs still has no direct test under scripts/tests/ on 2026-09-25.",
     "tags": [
      "tests",
      "stack-pack"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "walk-self-healing",
   "started": "2026-08-09",
   "updated": "2026-08-09",
   "facts": [
    {
     "key": "walk-self-healing#1",
     "type": "feedback",
     "body": "User agreed on 2026-08-09 that /save must never write tests. A checkpoint that changes code is not a checkpoint, tests written at save time rubber-stamp code written minutes earlier, and it slows every save. /apply writes tests beside the implementation, and CI enforces them.",
     "tags": [
      "save",
      "apply",
      "tests",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "walk-self-healing#2",
     "type": "project",
     "body": "Merging a new main into a branch that predates a squash-merged archive move can resurrect the change: openspec/changes/<name>/ and openspec/changes/archive/<date>-<name>/ both survive, and openspec list shows it active again. After such a merge, run openspec list and delete the resurrected active copy. The archive is the record.",
     "tags": [
      "git",
      "openspec"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "walk-stack-agnostic",
   "started": "2026-08-09",
   "updated": "2026-08-09",
   "facts": [
    {
     "key": "walk-stack-agnostic#1",
     "type": "feedback",
     "body": "When the user pushes for a more radical version of a change than proposed (remove a fallback entirely, drop a rule instead of narrowing it, one change not two), take it seriously. On 2026-08-09 each of three such pushes exposed a coupling that the safer, incremental option kept alive.",
     "tags": [
      "plan",
      "explore",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "walk-stack-agnostic#2",
     "type": "project",
     "body": "The WongStack source repo has a deployable app: app/ is a Vite + React SPA with a Worker and wrangler.jsonc, the scaffold WongStack ships and dogfoods. CI deploys it and publishes a preview. Do not tell the user this repo has no app.",
     "tags": [
      "payload",
      "ci",
      "stack-pack"
     ],
     "supersedes": []
    },
    {
     "key": "walk-stack-agnostic#3",
     "type": "project",
     "body": "save/scripts/preview-url.sh resolves deployments for the head SHA, so it returns nothing until CI has published that commit. An empty result after the commit but before the push or CI does not mean there is no app. Run it after CI completes.",
     "tags": [
      "save",
      "verify",
      "ci"
     ],
     "supersedes": []
    },
    {
     "key": "walk-stack-agnostic#4",
     "type": "project",
     "body": "agent-browser, the /verify engine, is pre-1.0 (v0.33.2 when adopted on 2026-08-09) in the Vercel Labs incubator. That is the known risk. The mitigation: the driver is one shell script, and agent-browser get cdp-url leaves a plain CDP path open for a replacement.",
     "tags": [
      "verify"
     ],
     "supersedes": []
    },
    {
     "key": "walk-stack-agnostic#5",
     "type": "project",
     "body": "Deliberately not adopted from agent-browser on 2026-08-09: a11y (axe), vitals, HAR capture, network interception, the dogfood skill, and its MCP server. The payload configures no MCP servers, and adding the first one is its own decision.",
     "tags": [
      "verify",
      "payload"
     ],
     "supersedes": []
    },
    {
     "key": "walk-stack-agnostic#6",
     "type": "thread",
     "body": "Open since 2026-08-09: a graded multi-step /verify journey, driven to a verdict against a written THEN, is not proven. The plumbing works against a real deployment; proof needs a UI-bearing change.",
     "tags": [
      "verify"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "wong-sync-adapt-by-default",
   "started": "2026-08-09",
   "updated": "2026-08-09",
   "facts": [
    {
     "key": "wong-sync-adapt-by-default#1",
     "type": "feedback",
     "body": "User preference (2026-08-09): a WongStack update adopts non-breaking upstream changes by default, small deltas included (for example adding a date), with no need for an 'adapt as much as possible' instruction. Justify not adopting: a wrong adopt costs seconds of review, a wrong skip hides the gap indefinitely.",
     "tags": [
      "sync",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "wong-sync-self-update-and-run-plan",
   "started": "2026-08-09",
   "updated": "2026-08-09",
   "facts": [
    {
     "key": "wong-sync-self-update-and-run-plan#1",
     "type": "feedback",
     "body": "The user wants the full changeset of a run listed in one reviewable document before anything durable lands. A change that happened but was not written down for review is the defect, not a detail (stated 2026-08-09 for /wong-sync).",
     "tags": [
      "sync",
      "plan",
      "review",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-self-update-and-run-plan#2",
     "type": "project",
     "body": "scripts/check-payload-links.mjs resolves file paths only and ignores #anchors (it splits each target on #). A link to a missing heading passes silently, so check anchors by hand. Renaming a payload heading can break deep links from other skills.",
     "tags": [
      "payload",
      "wiki"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-self-update-and-run-plan#3",
     "type": "project",
     "body": "A heading with an em dash, such as 'pass — first, and once', makes a double-hyphen anchor, so the obvious link does not match. Use a colon in headings that other pages deep-link to.",
     "tags": [
      "wiki",
      "payload"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "wong-sync-proposes-apply-disposes",
   "started": "2026-08-09",
   "updated": "2026-08-10",
   "facts": [
    {
     "key": "wong-sync-proposes-apply-disposes#1",
     "type": "feedback",
     "body": "User prefers a standard over a magic number. On 2026-08-10 they rejected a fixed cap of 3 clarification questions as the wrong kind of rule and accepted a per-question admission test at once. Reach for a qualifying condition before a quota.",
     "tags": [
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-proposes-apply-disposes#2",
     "type": "feedback",
     "body": "User wants gates at decision points, not prompts: a reviewable plan beats a terminal yes/no prompt. The objection is to changes that land before a human sees them, not to interactivity (2026-08-10).",
     "tags": [
      "review",
      "plan",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-proposes-apply-disposes#3",
     "type": "feedback",
     "body": "User accepts breaking changes when a contract is wrong. On 2026-08-10 they allowed a major rewrite of /wong-sync before its cost was known.",
     "tags": [
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "wong-sync-proposes-apply-disposes#4",
     "type": "project",
     "body": "check-payload-links.mjs does not check wong-setup, because it resolves links against the file set a target receives and wong-setup is source-only. A broken link or anchor from wong-setup into another skill passes. When you rename a payload heading, grep wong-setup by hand.",
     "tags": [
      "payload",
      "setup"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "add-update-dependencies-skill",
   "started": "2026-08-10",
   "updated": "2026-08-10",
   "facts": [
    {
     "key": "add-update-dependencies-skill#1",
     "type": "thread",
     "body": "Open since 2026-08-10, still true 2026-09-25: this machine has gh 2.46.0 and Node 22.22.1 (gh 2.97.0 and Node 26.7.0 were latest). Both need sudo, so they are the user's call. CI pins Node 22 in test.yml, deploy.yml, and payload.yml, so decide local and CI Node together.",
     "tags": [
      "dependencies",
      "ci"
     ],
     "supersedes": []
    },
    {
     "key": "add-update-dependencies-skill#2",
     "type": "project",
     "body": "gh 2.46.0 breaks gh pr edit in every repo: GitHub no longer serves projectCards ('Projects (classic) is being deprecated'). The working path is gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@file, which /save uses.",
     "tags": [
      "save",
      "git",
      "dependencies"
     ],
     "supersedes": []
    },
    {
     "key": "add-update-dependencies-skill#3",
     "type": "thread",
     "body": "Open since 2026-08-10: app/package.json has @types/node ^26 while CI runs Node 22, from the aggressive-to-latest posture. Nothing broke, but the types describe a newer runtime than the suite runs on. Raise CI's Node or accept the skew knowingly.",
     "tags": [
      "dependencies",
      "ci",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "add-update-dependencies-skill#4",
     "type": "project",
     "body": "npm outdated needs node_modules: without an install it reports MISSING and omits devDependencies. In a checkout with no install, query the registry per package instead.",
     "tags": [
      "dependencies"
     ],
     "supersedes": []
    },
    {
     "key": "add-update-dependencies-skill#5",
     "type": "thread",
     "body": "Open since 2026-08-10: wiki/development/adding-a-skill.md is the payload-skill checklist but does not say that a meta-repo-only skill (like update-dependencies) does only step 1 and skips the manifest, setup, and release steps.",
     "tags": [
      "wiki",
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "apply-can-checkpoint-a-task",
   "started": "2026-08-10",
   "updated": "2026-08-10",
   "facts": [
    {
     "key": "apply-can-checkpoint-a-task#1",
     "type": "feedback",
     "body": "When the user asks for an elegant fix, a special-case exception does not qualify. On 2026-08-10 the /apply deadlock was fixed by naming the real predicate (exit versus implementation) in place of its proxy (tasks pending).",
     "tags": [
      "apply",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "update-openspec-deps",
   "started": "2026-08-10",
   "updated": "2026-08-10",
   "facts": [
    {
     "key": "update-openspec-deps#1",
     "type": "feedback",
     "body": "User rule (2026-08-10): never edit upstream-generated or vendored files locally, because the next update rewrites them and wipes the edits. Put WongStack behavior in the WongStack skill that fronts the tool. The generated openspec-* layer was later retired, but the rule still applies to vendored skills such as agent-browser.",
     "tags": [
      "skills",
      "openspec",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "update-openspec-deps#2",
     "type": "feedback",
     "body": "User does not keep deprecated commands for compatibility. On 2026-08-10 they were glad the opsx pointer commands were deleted, reversing an earlier kept-deliberately stance. Remove deprecated entry points; do not preserve them.",
     "tags": [
      "skills",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "rename-walk-to-verify",
   "started": "2026-08-11",
   "updated": "2026-08-11",
   "facts": [
    {
     "key": "rename-walk-to-verify#1",
     "type": "project",
     "body": "The /walk to /verify rename (v12.0.0, 2026-08-11) changed only the verb, skill directory, scripts, and /walk tokens. Concept names stay on purpose: the staging-walkthrough capability and wiki page, references/walkthrough.md, WALK_MEDIA_* variables, and walk as a noun. Do not rename them as cleanup.",
     "tags": [
      "verify"
     ],
     "supersedes": []
    },
    {
     "key": "rename-walk-to-verify#2",
     "type": "thread",
     "body": "Unconfirmed since 2026-08-11: the user asked /verify to 'e2e test to the best of ability'. The session assumed this excludes running the repo's code locally. If the user wants local execution, that reverses the delivery-gate boundary and needs its own change.",
     "tags": [
      "verify"
     ],
     "supersedes": []
    },
    {
     "key": "rename-walk-to-verify#3",
     "type": "thread",
     "body": "Untested since 2026-08-11: /verify sends the Access service-token pair through agent-browser set headers for browser probes and as curl headers for request probes. Nobody has confirmed both work against a real Access-protected preview.",
     "tags": [
      "verify",
      "cloudflare"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "philosophy-docs-integration",
   "started": "2026-08-12",
   "updated": "2026-08-12",
   "facts": [
    {
     "key": "philosophy-docs-integration#1",
     "type": "user",
     "body": "The maintainer is a former tech founder who runs a seven-figure e-commerce business. They wrote the WongStack docs to share their workflow with practitioners doing similar work, so the reader is deciding whether to copy the setup, not a buyer.",
     "tags": [
      "wiki",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "philosophy-docs-integration#2",
     "type": "feedback",
     "body": "Docs tone the user wants: matter-of-fact and concise, not preachy, no 'AI native' framing, no buzzwords. Present WongStack as one way of working that people adapt ('this is just my way of working, people can do it however they want to').",
     "tags": [
      "wiki",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "philosophy-docs-integration#3",
     "type": "thread",
     "body": "Open since 2026-08-12: the user's view that 'terminal is a shitty UI' is stated nowhere in the repo; only the online-only, no-local-dev point became a principle. If it matters, decide what the docs recommend, for example web or desktop clients over the terminal.",
     "tags": [
      "wiki"
     ],
     "supersedes": []
    },
    {
     "key": "philosophy-docs-integration#4",
     "type": "thread",
     "body": "Open since 2026-08-12: the user's principle that 'AI is smart enough to set everything up in one prompt' is not stated as an intention anywhere, though the README's single-paste install shows it.",
     "tags": [
      "wiki",
      "setup"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "slim-claude-md-into-rules",
   "started": "2026-09-02",
   "updated": "2026-09-02",
   "facts": [
    {
     "key": "slim-claude-md-into-rules#1",
     "type": "feedback",
     "body": "User ruling (2026-09-02): keep @-imports in near-universal rules (wiki-style.md, voice.md) even though imports load at launch, because 'it's intended to be loaded anyways'. Rules for occasional surfaces link to their owning doc instead, so the launch load does not grow.",
     "tags": [
      "context",
      "wiki",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "slim-claude-md-into-rules#2",
     "type": "reference",
     "body": "Claude Code memory docs (https://code.claude.com/docs/en/memory, read 2026-09-02): @-imports expand at launch and do not reduce context; path-scoped rules load when Claude reads a matching file; rules without paths: load always; keep CLAUDE.md under 200 lines; HTML comments are stripped before injection.",
     "tags": [
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "slim-claude-md-into-rules#3",
     "type": "reference",
     "body": "Known Claude Code bug (GitHub issue #21858, seen 2026-09-02): path-scoped rules in user-level ~/.claude/rules/ are silently ignored. Put path-scoped rules at project level.",
     "tags": [
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "slim-claude-md-into-rules#4",
     "type": "project",
     "body": "WongStack-authored skill descriptions stay at or under 600 characters (set 2026-09-02): apply at 477 characters triggered well, and a description holds triggers, not a manual. The vendored agent-browser skill is the exception.",
     "tags": [
      "skills",
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "slim-claude-md-into-rules#5",
     "type": "feedback",
     "body": "The user often asks for research on how others solve a problem before planning (rules layout on 2026-09-02, wireframe libraries on 2026-09-14). When a design likely has prior art, search online first and report what you found and why you took it or not.",
     "tags": [
      "explore",
      "plan",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "ship-in-one-go",
   "started": "2026-09-13",
   "updated": "2026-09-14",
   "facts": [
    {
     "key": "ship-in-one-go#1",
     "type": "project",
     "body": "Rejected a seventh verb such as /go for the one-go cycle (2026-09-13), because it needs edits to CLAUDE.md, the loop diagram, and the payload manifest. The loop reuses the pull-in pattern instead: a verb whose precondition is missing invokes the verb before it.",
     "tags": [
      "ship",
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "ship-in-one-go#2",
     "type": "project",
     "body": "Rejected a --no-questions escape hatch for /explore's question round (2026-09-13): the ask tool always offers 'Other', so the user can type 'just pick defaults'.",
     "tags": [
      "explore"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "add-html-wireframes",
   "started": "2026-09-14",
   "updated": "2026-09-14",
   "facts": [
    {
     "key": "add-html-wireframes#1",
     "type": "feedback",
     "body": "The user reviews plan HTML by opening the file directly (for example in the Paseo browser) and said on 2026-09-14 that this is enough. Do not add PR-body screenshots for it; they need image hosting that most repos lack.",
     "tags": [
      "plan",
      "review",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "add-html-wireframes#2",
     "type": "project",
     "body": "When you drive a single-file, multi-screen HTML page with agent-browser, a selector can match a hidden screen's copy of an element (height 0, top 0). 'Element is covered by ...' is then not a layout defect. Scope selectors to the active screen, for example .screen[data-active].",
     "tags": [
      "verify",
      "plan"
     ],
     "supersedes": []
    },
    {
     "key": "add-html-wireframes#3",
     "type": "thread",
     "body": "Deferred since 2026-09-14: hosting the plan's HTML (now review.html) so a PR link renders it. GitHub shows .html as source. The stack pack's per-commit preview deploy could serve it; the WALK_MEDIA_BUCKET route exists, but most repos have no bucket.",
     "tags": [
      "plan",
      "review",
      "stack-pack"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "hide-openspec-skills",
   "started": "2026-09-14",
   "updated": "2026-09-14",
   "facts": [
    {
     "key": "hide-openspec-skills#1",
     "type": "project",
     "body": "disable-model-invocation: true blocks the Skill tool itself, not only autonomous triggering ('Skill X cannot be used with Skill tool due to disable-model-invocation', spike 2026-08-02). Never set it on a WongStack verb, because verbs hand off to each other through the Skill tool.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "hide-openspec-skills#2",
     "type": "project",
     "body": "user-invocable: false hides a skill from the / menu and keeps it callable through the Skill tool (probed 2026-09-14 with a flagged skill and a control). Use it for a skill that is only a handoff target.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "hide-openspec-skills#3",
     "type": "project",
     "body": "An agent cannot check the / menu: its own skill listing is a different surface, and a user-invocable: false skill still shows there. Ask the user to confirm menu visibility.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "hide-openspec-skills#4",
     "type": "project",
     "body": "Skills hot-reload with a delay. A Skill call right after you write a SKILL.md can fail with 'Unknown skill' and succeed moments later, so an immediate failure is not evidence about the frontmatter.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "hide-openspec-skills#5",
     "type": "thread",
     "body": "Open since 2026-09-14: what the frontmatter key hidden: true does is unknown. The vendored agent-browser skill ships it and still appears in the agent's skill listing. Nobody has probed it.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "update-ship-sync-main",
   "started": "2026-09-14",
   "updated": "2026-09-14",
   "facts": [
    {
     "key": "update-ship-sync-main#1",
     "type": "user",
     "body": "The user works in throwaway paseo worktrees under /root/.paseo/worktrees/<id>/<name>/. The durable WongStack checkout is /root/WongStack. Before 2026-09-14 every ship left its main stale, so each new session had to pull by hand.",
     "tags": [
      "git",
      "ship",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "update-ship-sync-main#2",
     "type": "thread",
     "body": "Local branch cleanup is open and unclaimed. On 2026-09-14, `git branch -vv` in /root/WongStack listed dozens of `[gone]` branches. The user declined to make /ship delete merged local branches, because that was wider than asked.",
     "tags": [
      "git",
      "ship"
     ],
     "supersedes": []
    },
    {
     "key": "update-ship-sync-main#3",
     "type": "thread",
     "body": "/ship Step 5 still runs `git push origin --delete \"$BRANCH\"` without checking the exit status of `gh pr merge --squash` (checked 2026-09-25). On 2026-09-14 a failed merge let the delete run, and GitHub closed PR #76. Deleting the head branch of an open PR closes it.",
     "tags": [
      "ship",
      "git"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "add-review-html",
   "started": "2026-09-14",
   "updated": "2026-09-15",
   "facts": [
    {
     "key": "add-review-html#1",
     "type": "user",
     "body": "The user reads only the Why and What Changes sections of a proposal. They asked for review.html to be a 10x better way to see them than proposal.md, with a visual per change.",
     "tags": [
      "review",
      "plan",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "add-review-html#2",
     "type": "user",
     "body": "The user does much development on a phone. UI and UX work must consider the mobile layout, and review pages must work on a phone. Stated 2026-09-15.",
     "tags": [
      "review",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "add-review-html#3",
     "type": "project",
     "body": "Do not add a fifth review visual kind (after screen, flow, diff, tree) until three changes have wanted the same one. The ux-wireframes spec forbids a fifth kind today.",
     "tags": [
      "review",
      "plan"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "bare-ship-continues",
   "started": "2026-09-15",
   "updated": "2026-09-15",
   "facts": [
    {
     "key": "bare-ship-continues#1",
     "type": "feedback",
     "body": "When a draft quotes source text, such as a skill's resolve order, check the quote against the source character for character. On 2026-09-15 two load-bearing misquotes in the first draft were found only by a critic check.",
     "tags": [
      "plan",
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "fix-review-kit-and-rules",
   "started": "2026-09-15",
   "updated": "2026-09-15",
   "facts": [
    {
     "key": "fix-review-kit-and-rules#1",
     "type": "feedback",
     "body": "Verify the property that the requirement names, not a proxy. On 2026-09-15 a check that review states had markup passed, but the states rendered blank. Only a computed-style check found it.",
     "tags": [
      "verify",
      "review",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "fix-review-kit-and-rules#2",
     "type": "feedback",
     "body": "Always test a detector against the failure it exists to detect. The first check-openspec-config.mjs ran `openspec list`, which does not read the config, so it passed a broken file. Only the negative-case test caught it on 2026-09-15.",
     "tags": [
      "tests",
      "openspec"
     ],
     "supersedes": []
    },
    {
     "key": "fix-review-kit-and-rules#3",
     "type": "project",
     "body": "A colon followed by a space inside an unquoted YAML scalar in openspec/config.yaml makes the OpenSpec CLI drop the whole config with only a warning. Rephrase the text to remove the colon, not quote it, so the next author is not one keystroke from the same bug.",
     "tags": [
      "openspec"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "remove-improve-dream",
   "started": "2026-09-15",
   "updated": "2026-09-15",
   "facts": []
  },
  {
   "slug": "structured-explore-questions",
   "started": "2026-09-15",
   "updated": "2026-09-16",
   "facts": [
    {
     "key": "structured-explore-questions#1",
     "type": "project",
     "body": "Structured question tools differ by agent context. On 2026-09-15 the root session had a structured input tool that a review subagent could not see. Instructions must use the active host's available ask mechanism.",
     "tags": [
      "explore",
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "structured-explore-questions#2",
     "type": "project",
     "body": "The generic Codex skill validator rejects WongStack's `user-invocable` frontmatter field. The committed skills keep the field on purpose, because it is supported. Do not remove it to satisfy that validator.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "simplify-review-opening",
   "started": "2026-09-16",
   "updated": "2026-09-16",
   "facts": [
    {
     "key": "simplify-review-opening#1",
     "type": "project",
     "body": "When the user sends a phone screenshot of a review page, the header above review.html belongs to the host app's HTML preview, not to this repo's review toolbar. Only the toolbar is in scope.",
     "tags": [
      "review"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "fix-wrapped-review-bullets",
   "started": "2026-09-17",
   "updated": "2026-09-17",
   "facts": [
    {
     "key": "fix-wrapped-review-bullets#1",
     "type": "project",
     "body": "The paseo worktree manager can rename a worktree's branch after the session starts, so the opening git status snapshot may name a stale branch. Check `git branch --show-current` before git work. On 2026-09-17 `wise-chicken` became `fix/wongstack-wrapped-bullets`.",
     "tags": [
      "git"
     ],
     "supersedes": []
    },
    {
     "key": "fix-wrapped-review-bullets#2",
     "type": "feedback",
     "body": "Test the real shipped source, not a retyped copy of its logic. A harness that copies a parser into a scratch file proves nothing about the shipped code. On 2026-09-17 the proof extracted the real function from review-kit.html and ran it.",
     "tags": [
      "tests",
      "review"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "phone-review-opens-change-list",
   "started": "2026-09-17",
   "updated": "2026-09-17",
   "facts": [
    {
     "key": "phone-review-opens-change-list#1",
     "type": "project",
     "body": "`git diff .claude/skills/...` prints nothing and no error, because .claude is a symlink to .agents. Use the `.agents/...` path in git commands. Edits through either path land in the same file.",
     "tags": [
      "git",
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "phone-review-opens-change-list#2",
     "type": "reference",
     "body": "To set the agent-browser viewport, run `agent-browser set viewport <w> <h>`. `agent-browser viewport` is not a command.",
     "tags": [
      "verify",
      "review"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "fix-improve-survey-symlink-entry",
   "started": "2026-09-21",
   "updated": "2026-09-21",
   "facts": [
    {
     "key": "fix-improve-survey-symlink-entry#1",
     "type": "thread",
     "body": "The /improve survey reports missing-link leads from historical CHANGELOG.md entries, but its report says historical records are excluded. All 21 leads on 2026-09-21 came from there. The user deferred the fix. On 2026-09-25 survey.mjs still did not exclude CHANGELOG.md.",
     "tags": [
      "skills"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "speed-up-ci",
   "started": "2026-09-21",
   "updated": "2026-09-21",
   "facts": [
    {
     "key": "speed-up-ci#1",
     "type": "project",
     "body": "CI baseline on 2026-09-20 per commit on a PR branch: Deploy 31 s, Test 68 s (npm ci 8 s, Playwright install 19 s, npm test 35 s), Payload checks 27 s. Payload checks ran twice until v16.1.1 skipped its pull_request run.",
     "tags": [
      "ci"
     ],
     "supersedes": []
    },
    {
     "key": "speed-up-ci#2",
     "type": "project",
     "body": "Payload checks cannot drop `npm ci`, because scripts/tests/review.test.mjs loads jsdom from app/node_modules. Locally, `node --test scripts/tests/*.test.mjs` fails on review.test.mjs until you run `npm ci` in app/.",
     "tags": [
      "ci",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "speed-up-ci#3",
     "type": "project",
     "body": "Do not prune archived review.html files to save space. On 2026-09-21 ten of them were 506 KB of the 4.7 MB archive. They are the immutable shipped record, and the cost is disk, not CI time.",
     "tags": [
      "review",
      "openspec"
     ],
     "supersedes": []
    },
    {
     "key": "speed-up-ci#4",
     "type": "project",
     "body": "agent-browser serves a cached copy when you reopen the same file in the same session. Add a `?v=<epoch>` query to the file URL to see an edit.",
     "tags": [
      "verify",
      "review"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "add-structured-asks",
   "started": "2026-09-22",
   "updated": "2026-09-22",
   "facts": [
    {
     "key": "add-structured-asks#1",
     "type": "feedback",
     "body": "When the user gives guidance in their own words, encode the guidance in the payload, not their literal sentence. On 2026-09-22 they said not to put \"What do you need from the user to continue?\" into the payload verbatim.",
     "tags": [
      "skills",
      "user-preference"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "fix-review-panel-wrapping",
   "started": "2026-09-22",
   "updated": "2026-09-22",
   "facts": [
    {
     "key": "fix-review-panel-wrapping#1",
     "type": "project",
     "body": "A squash-merged branch still shows its commits in `git log origin/main..HEAD`, so /ship's pull-in preflight will not fire on it. Start the next change on a new branch from origin/main.",
     "tags": [
      "git",
      "ship"
     ],
     "supersedes": []
    },
    {
     "key": "fix-review-panel-wrapping#2",
     "type": "feedback",
     "body": "A review visual author can invent plausible detail. On 2026-09-22 it drew a bullet that exists on no page and used a `.line del` strikethrough for a path that was wrapped, not deleted. When a visual shows a measurement, check that it draws what was measured.",
     "tags": [
      "review",
      "plan"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "simplify-review-pipeline",
   "started": "2026-09-22",
   "updated": "2026-09-22",
   "facts": [
    {
     "key": "simplify-review-pipeline#1",
     "type": "project",
     "body": "Two open payload branches pick the same next version. VERSION then merges with no conflict and only CHANGELOG.md conflicts, which hides the clash. At ship time, compare VERSION with origin/main. Renumber the unmerged branch above main's entry, never main's shipped release.",
     "tags": [
      "ship",
      "payload"
     ],
     "supersedes": []
    },
    {
     "key": "simplify-review-pipeline#2",
     "type": "project",
     "body": "`measure-context.mjs --check` prints the documented before and after from scripts/fixtures/context-baseline.json on every run. It does not show your change's effect. PR #97 misattributed PR #94's reduction this way on 2026-09-22.",
     "tags": [
      "context",
      "payload"
     ],
     "supersedes": []
    },
    {
     "key": "simplify-review-pipeline#3",
     "type": "project",
     "body": "Before 2026-09-22 each /plan spent 8 to 15 minutes on design, critic, and revision subagents in series. The critic's findings were anchor mechanics that check-review.js already reports, plus cosmetic wording. Do not bring the critic back for those.",
     "tags": [
      "plan",
      "review"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "harness-token-efficiency",
   "started": "2026-09-24",
   "updated": "2026-09-24",
   "facts": [
    {
     "key": "harness-token-efficiency#1",
     "type": "reference",
     "body": "`node scripts/measure-usage.mjs --since <date>` prices Claude Code transcripts in ~/.claude/projects/**/*.jsonl per task. Baseline since 2026-09-10: cache reads 55%, cache writes 30%, output 14%; hit rate 97.7%; median $6.54 per task. The full baseline is in notes/harness-token-efficiency.md.",
     "tags": [
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#2",
     "type": "user",
     "body": "Most of the user's billed agent cost is in other repos. On 2026-09-24: ClaymooApp 68%, ClaymooHeadless 10%, SuccessStoryClub 10%, WongStack 5%.",
     "tags": [
      "context",
      "user-preference"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#3",
     "type": "project",
     "body": "A /save run is expensive because of the session it inherits (median ~220k tokens at start), not its runbook. Cutting /save steps was rejected on 2026-09-24, because fewer turns save little and put the gate at risk.",
     "tags": [
      "save",
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#4",
     "type": "thread",
     "body": "Open cost levers from 2026-09-24, not yet done: after 1h or more idle, resume with /continue in a fresh session (up to 3%); keep one model per session (up to 1.7%); trim verb bodies (0.7 to 1.0%); run the review author on Sonnet (~0.5%, needs user approval). Prompt changes need an eval first.",
     "tags": [
      "context",
      "skills"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#5",
     "type": "thread",
     "body": "Open on 2026-09-24: check whether /apply ticking tasks with `sed -i` makes Claude Code re-inject the whole tasks.md, and use the Edit tool if so (up to 1% of cost). The cause is only partly confirmed.",
     "tags": [
      "apply",
      "context"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#6",
     "type": "thread",
     "body": "ClaymooHeadless was on WongStack 15.0.0 on 2026-09-24 and still had 6 legacy openspec-* skills. It needs a /wong-sync.",
     "tags": [
      "sync"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#7",
     "type": "project",
     "body": "A flagged harness lever ships only when $ per task falls beyond run-to-run noise and no quality checklist item regresses. The A/B test plan is in notes/harness-token-efficiency.md. No offline eval had run as of 2026-09-24.",
     "tags": [
      "context",
      "tests"
     ],
     "supersedes": []
    },
    {
     "key": "harness-token-efficiency#8",
     "type": "project",
     "body": "The Monitor tool failed in 21% of sessions that used it, because agents called it before its deferred schema loaded. Load it with ToolSearch first. Measured 2026-09-24.",
     "tags": [
      "context"
     ],
     "supersedes": []
    }
   ]
  },
  {
   "slug": "wongstack-managed-service",
   "started": "2026-09-25",
   "updated": "2026-09-25",
   "facts": [
    {
     "key": "wongstack-managed-service#1",
     "type": "user",
     "body": "The user wants WongStack setup as easy as Meta's Muse or xAI's Grok Bot: sign in and start chatting, with nothing installed. Three account steps plus local tooling (Claude Code on the web, Paseo) was judged too hard (2026-09-25).",
     "tags": [
      "user-preference",
      "setup"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#2",
     "type": "project",
     "body": "The managed WongStack service is a separate product in a new repo made from the WongStack template, not an OpenSpec change in this repo (decided 2026-09-25).",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#3",
     "type": "project",
     "body": "Managed-service MVP journey: sign in with GitHub, pay, log in to Claude in a browser terminal, then scan the Paseo QR code. Payment (Stripe, about $29/month) comes before the VM exists, because a free VM attracts crypto-mining abuse that the service pays for.",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#4",
     "type": "project",
     "body": "Managed-service hosting: one always-on Hetzner CPX22 (2 vCPU, 4 GB) per paying user in the EU, at EUR 19.49 plus EUR 0.50 for IPv4 a month, so the Paseo daemon is always reachable. The VM is about 90% of the cash cost per user. CPX12 was rejected: 2 GB is tight for Claude Code, Paseo, and npm install.",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#5",
     "type": "reference",
     "body": "Hetzner constraints (checked 2026-09-25): cost-optimized plans are sold out; new accounts are capped at 5 servers until one month of history and one paid invoice; stopped servers still bill; IPv4 is required because github.com has no IPv6. Open the Hetzner account early.",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#6",
     "type": "project",
     "body": "Rejected Fly.io Sprites for the managed service: a sleeping Sprite drops the Paseo relay connection, and one kept awake by the relay bills like an always-on VM. Revisit if VM cost or Hetzner stock becomes the blocker.",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#7",
     "type": "project",
     "body": "Users own their Cloudflare accounts; the managed service never creates them, because the Tenant API is for approved resellers only and ownership would make the service liable for billing and abuse. A zero-signup tier on Workers for Platforms stays a later option.",
     "tags": [
      "managed-service",
      "cloudflare"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#8",
     "type": "project",
     "body": "Anthropic forbids third-party apps from offering Claude.ai login or intermediating Claude credentials. Hosting unmodified Claude Code where each user signs in is allowed: accept the Commercial Terms, remove no sign-in option, and never resell or pass through Claude usage.",
     "tags": [
      "managed-service",
      "secrets"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#9",
     "type": "feedback",
     "body": "In the managed service's browser-terminal login: never record the terminal, never read, back up, or move the Claude login file, never run `claude setup-token` into the service's store, and use no custom paste-code form.",
     "tags": [
      "managed-service",
      "secrets"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#10",
     "type": "project",
     "body": "A Paseo pairing link (`app.paseo.sh/#offer=...`) is a password: show it only to its owner, keep it out of logs, and offer a pair-a-new-device action.",
     "tags": [
      "managed-service",
      "secrets"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#11",
     "type": "thread",
     "body": "Open: can a Cloudflare OAuth app get an API-token-write scope, to mint the long-lived CLOUDFLARE_API_TOKEN for GitHub Actions? Test with a private OAuth client and /oauth/scopes. Fallbacks: short-lived tokens through GitHub OIDC, or the user pastes one token.",
     "tags": [
      "managed-service",
      "cloudflare"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#12",
     "type": "thread",
     "body": "Open before building the managed service: written confirmation from Anthropic sales that the browser-terminal login is allowed, and whether Paseo's hosted relay allows commercial use (else self-host it).",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    },
    {
     "key": "wongstack-managed-service#13",
     "type": "thread",
     "body": "Unverified in the managed-service post-login script: which exit code of `paseo provider diagnostic claude` means ready, whether `paseo workspace create` takes `--json`, and the output field of `paseo daemon pair --relay --json`.",
     "tags": [
      "managed-service"
     ],
     "supersedes": []
    }
   ]
  }
 ]
}
~~~
<!-- end migration.json -->
<!-- file review-visuals.html utf8 16793 fence=~~~ -->
~~~html
<section class="visual flow" id="memory-flow" data-kind="flow" data-states="after today">
  <p class="caption">What memory does in a session: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-start">
          <h3>A session starts <span class="tag">Kept</span></h3>
          <p>You open Claude or Codex in a checkout of the repo.</p>
          <details><summary>Details</summary><p>Actor: you. Action: start a session. Result: the agent's <code>SessionStart</code> hook fires. Agents without a start hook follow an <code>AGENTS.md</code> instruction.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-hook">
          <h3>The start hook runs a script with no model <span class="tag">New</span></h3>
          <p>All network work fits in a 1.5 s budget.</p>
          <details><summary>Details</summary><p>Actor: <code>SessionStart</code> hook. Action: append this checkout to the registry, count the pending sessions, check the local spool for facts, and check if consolidation is due. The hook does not upload spooled facts, because each fact must pass the write gate, and the gate needs a model. Result: the facts for the digest and one yes or no answer about background work.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-digest" data-mark="digest">
          <h3>The hook prints the digest <span class="tag">New</span> <i class="callout">1</i></h3>
          <p>Code builds it from one SQL query of live facts. It stays frozen for the whole session.</p>
          <details><summary>Details</summary><p>Actor: script. Action: read the facts that no later fact supersedes, ordered by type and then by recency, and add the open <code>thread</code> facts of the current branch's change. The digest stops at 150 lines or 25 KB. Each line shows the type, the body, the slug, the age in days, the author, and the fact id. Its header reports the result of the last background run. Result: the agent starts with the team's memory. When the store cannot be reached, the script prints the last digest from a local cache in the git common directory.</p></details>
        </div>
        <p class="flow-connector">↓ Are sessions pending, are facts in the spool, or is consolidation due?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-none">
            <h3>If no <span class="tag">New</span></h3>
            <p>Nothing else runs.</p>
            <details><summary>Details</summary><p>Actor: script. Action: exit. Result: the session starts with only the digest added.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-detach">
            <h3>If yes <span class="tag">New</span> <i class="callout">2</i></h3>
            <p>The hook starts a detached background run and returns at once.</p>
            <details><summary>Details</summary><p>Actor: hook. Action: start the same agent's command-line tool (<code>claude</code> or <code>codex</code>) in headless mode with a small model. The main agent launches nothing. Result: your first reply is not delayed. If a headless run cannot start, the hook tells the main agent to start a background subagent instead.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the "yes" path continues, in the background</p>
        <div class="step flow-card" data-target-id="after-capture">
          <h3>The run captures past sessions <span class="tag">New</span> <i class="callout">3</i></h3>
          <p>At most 5 sessions idle for 1 hour or more, newest first, plus the spooled facts.</p>
          <details><summary>Details</summary><p>Actor: background run. Action: code strips each transcript and replaces known <code>.env</code> values. A session with <code>#private</code> in any of your messages is skipped completely. When the store has an R2 bucket, code uploads the raw transcript to it, and the model proposes facts from the stripped text. The run never reads its own sessions or subagent transcripts. The run also takes the facts from the local spool. Result: proposed facts for each session, and the spooled facts, all ready for the write gate.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-gate">
          <h3>The write gate decides each fact <span class="tag">New</span> <i class="callout">4</i></h3>
          <p>The model sees similar facts, then adds, supersedes, or drops.</p>
          <details><summary>Details</summary><p>Actor: script and model. Action: the script shows the live facts on the same slug and the top keyword matches. The model chooses <code>add</code>, <code>supersede &lt;id&gt;</code>, or <code>drop</code>. Result: only new facts are written, and a replaced fact points to its successor.</p></details>
        </div>
        <p class="flow-connector">↓ When 24 hours and 5 captured sessions have passed since the last consolidation</p>
        <div class="step flow-card" data-target-id="after-consolidate">
          <h3>The same run consolidates <span class="tag">New</span></h3>
          <p>It merges duplicates and supersedes contradicted facts, newest wins.</p>
          <details><summary>Details</summary><p>Actor: background run. Action: merge duplicate facts, supersede contradicted facts with the newest one, and record the counts in a <code>runs</code> row. The counts include duplicates that the write gate missed. Result: the live set stays small. Nothing is deleted, and no command runs by hand.</p></details>
        </div>
        <p class="flow-connector">↓ Writes to</p>
        <div class="step flow-card" data-target-id="after-store">
          <h3>The memory store <code>&lt;repo&gt;-memory</code> <span class="tag">New</span></h3>
          <p>D1 keeps facts, sessions, tags, and runs. An optional private R2 bucket keeps raw transcripts.</p>
          <details><summary>Details</summary><p>Actor: memory script. Action: call the Cloudflare REST API with the memory token. CI never receives this token. Result: rows in D1, and objects in R2 when the bucket exists. Without R2, no transcript is stored and everything else works. A private session gets only its session row, with no upload.</p></details>
        </div>
        <p class="flow-connector">↓ During the work, the verbs read and write the same store</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-explore">
            <h3><code>/explore</code> <span class="tag">Changed</span></h3>
            <p>Searches the store on the intent before it asks.</p>
            <details><summary>Details</summary><p>Actor: <code>/explore</code>, and <code>/plan</code> through it. Action: keyword search with tags. Result: the questions start from what the team already knows. Each printed fact shows its age, author, and source.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-save">
            <h3><code>/save</code> <span class="tag">Changed</span></h3>
            <p>Extracts facts through the write gate.</p>
            <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: propose facts from the session and pass each one through the write gate. Result: facts in the store. When the store cannot be reached, the facts wait in an ignored local spool. The next session start sees the spool and starts the background run, which passes the facts through the write gate and uploads them.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-continue">
            <h3><code>/continue</code> <span class="tag">Changed</span></h3>
            <p>Reads the slug's live facts and open threads.</p>
            <details><summary>Details</summary><p>Actor: <code>/continue</code>. Action: query the facts for the slug. Result: a cold resume on any machine gets every saved and captured fact.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-ship">
            <h3><code>/ship</code> <span class="tag">Changed</span> <i class="callout">5</i></h3>
            <p>Distills reusable facts into wiki pages, inside the ship PR.</p>
            <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: read the change's facts and edit the owning wiki pages with reusable process facts. Result: a person reviews the edits in the ship pull request, before the change archives.</p></details>
          </div>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-start">
          <h3>A session starts <span class="tag">Changed</span></h3>
          <p>No memory loads.</p>
          <details><summary>Details</summary><p>Actor: you. Action: start a session. Result: the agent knows nothing from past sessions until a verb reads a note.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-end">
          <h3>A session ends <span class="tag">Kept</span></h3>
          <p>What the session worked out is only in the transcript.</p>
          <details><summary>Details</summary><p>Actor: you. Action: close the session. Result: nothing is captured automatically.</p></details>
        </div>
        <p class="flow-connector">↓ Did you run <code>/save</code>?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="today-saved">
            <h3>If yes <span class="tag">Removed</span></h3>
            <p>A note goes to <code>notes/&lt;slug&gt;.md</code> in git.</p>
            <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: write the note and commit it. Result: the note is public in a public repo, and a protected <code>main</code> turns each capture into a pull request.</p></details>
          </div>
          <div class="flow-branch" data-target-id="today-lost">
            <h3>If no <span class="tag">Removed</span></h3>
            <p>The context is lost.</p>
            <details><summary>Details</summary><p>Actor: none. Result: the transcript stays on one machine, and nothing reads it again.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Later</p>
        <div class="step flow-card" data-target-id="today-continue">
          <h3>Only <code>/continue</code> reads the note file <span class="tag">Changed</span></h3>
          <p>Nothing revisits a note. Search is grep.</p>
          <details><summary>Details</summary><p>Actor: <code>/continue</code>. Action: read <code>notes/&lt;slug&gt;.md</code>. Result: the saved context, with no index. No step removes a stale or duplicate note.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The digest stays frozen for the whole session, so prompt caching holds. Facts written during the session show in the next digest. Code builds the digest with no model, so a session start costs no tokens for memory.</li>
      <li>A detached run adds no cost to your first reply, because the main agent launches nothing. The run spends your own model quota without a visible turn. The next digest header reports what it did.</li>
      <li>One <code>#private</code> in any of your messages skips the whole session. The session row records the skip, so the session is not read again, and nothing from it is uploaded.</li>
      <li>The write gate uses the model to catch paraphrases, so embeddings are not necessary yet. Consolidation is the backstop. Its counts show when the gate misses duplicates, and that signal triggers embeddings.</li>
      <li><code>/ship</code> is the only automatic path from facts into the wiki, and a person reviews it in the ship pull request.</li>
    </ol>
  </div>
</section>

<section class="visual diff-visual" id="memory-schema" data-kind="diff">
  <p class="caption">Where memory lives: a Markdown file in git today, rows and objects in the <code>&lt;repo&gt;-memory</code> store after this change.</p>
  <div class="frame">
    <div class="diff">
      <div><div class="label">Before · <code>notes/&lt;slug&gt;.md</code> in git</div><pre><span class="line del">---</span><span class="line del">slug: add-po-search</span><span class="line del">started: 2026-07-28</span><span class="line del">updated: 2026-07-29</span><span class="line del">---</span><span class="line del"></span><span class="line del"># Add PO search</span><span class="line del"></span><span class="line del">Decisions, constraints, and dead ends,</span><span class="line del">revised in place on each /save.</span><span class="line del"></span><span class="line del">## Open threads</span><span class="line del"></span><span class="line del">- …</span></pre></div>
      <div><div class="label">After · D1 and R2 <code>&lt;repo&gt;-memory</code></div><pre><span class="line add">sessions        one row per transcript</span><span class="line add">  id            TEXT PK   'claude:&lt;uuid&gt;' | 'codex:&lt;uuid&gt;'</span><span class="line add">                          | 'migration:&lt;slug&gt;'</span><span class="line add">  agent         TEXT      claude | codex | migration</span><span class="line add">  author        TEXT</span><span class="line add">  machine       TEXT</span><span class="line add">  branch, cwd   TEXT</span><span class="line add">  started_at    TEXT</span><span class="line add">  ended_at      TEXT</span><span class="line add">  status        TEXT      captured | skipped | private</span><span class="line add">  read_through  TEXT      last message processed</span><span class="line add">  raw_key       TEXT      R2 object key</span><span class="line add">  raw_bytes     INTEGER</span><span class="line"></span><span class="line add">facts           append-only <i class="callout">1</i></span><span class="line add">  id            INTEGER PK</span><span class="line add">  slug          TEXT      OpenSpec change name or topic</span><span class="line add">  type          TEXT      user | feedback | project</span><span class="line add">                          | reference | thread</span><span class="line add">  body          TEXT      at most 400 characters</span><span class="line add">  session_id    TEXT      -&gt; sessions.id</span><span class="line add">  source        TEXT      save | backfill | migration</span><span class="line add">                          | consolidation</span><span class="line add">  created_at    TEXT</span><span class="line add">  author        TEXT</span><span class="line add">  superseded_by INTEGER   -&gt; facts.id, NULL while live</span><span class="line"></span><span class="line add">tags            name TEXT PK, definition TEXT NOT NULL, <i class="callout">2</i></span><span class="line add">                alias_of, created_by, created_at</span><span class="line add">fact_tags       fact_id, tag</span><span class="line add">facts_fts       FTS5 over facts.body</span><span class="line"></span><span class="line add">runs            one row per background run <i class="callout">4</i></span><span class="line add">  id, kind      capture | consolidation</span><span class="line add">  host, started_at, finished_at</span><span class="line add">  counts        JSON</span><span class="line"></span><span class="line add">R2 &lt;repo&gt;-memory <i class="callout">3</i></span><span class="line add">  sessions/&lt;agent&gt;/&lt;session-id&gt;.jsonl</span><span class="line add">                  raw transcript, kept forever</span><span class="line add">  migration/&lt;slug&gt;.md</span><span class="line add">                  the migrated note's text</span></pre></div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>A fact is never edited. A later fact supersedes it through <code>superseded_by</code>. A <code>thread</code> fact is an open question, and it closes when a fact supersedes it.</li>
      <li>A tag cannot exist without a definition. <code>alias_of</code> folds a near-duplicate tag into its canonical tag.</li>
      <li>The bucket is private, but the files are plain. Everyone with the memory token can read every teammate's raw transcripts. The raw transcript lets a later run extract facts again.</li>
      <li><code>runs.counts</code> records the duplicates that consolidation merged. This count is the measured trigger to add embeddings.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 64335 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-25-add-memory-store</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-25-add-memory-store</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

A session's context enters the repo only when someone runs `/save`, and many sessions end without one, so what they worked out is lost. When context is saved, nothing reads it again: the start of a session loads no memory, only `/continue` reads a note, and no step removes a stale or duplicate note. Notes in git also do not suit a team: every note is public in a public repo, a protected `main` turns each capture into a pull request, and grep is the only search.

## What Changes

- **BREAKING:** Every WongStack repo gets a **memory store** on Cloudflare: one D1 database named `<repo>-memory`, plus a private R2 bucket of the same name when the account has R2 enabled. The store is reached through the Cloudflare REST API with a dedicated memory token that CI never receives. Setup and sync provision it, and Cloudflare becomes a required account. R2 is optional because it needs a payment method on file. Without R2, raw transcripts are not stored, and everything else works the same.
- **Facts replace notes.** The unit of memory is a short typed fact (`user`, `feedback`, `project`, `reference`, or `thread`) of at most 400 characters, with its slug, author, time, and source session. A fact is never edited. A later fact supersedes it, and a `thread` fact is an open question that stays open until a fact supersedes it. When R2 is enabled, it keeps each full raw transcript forever, so facts can be extracted again. (review.html#/memory-schema)
- **A write gate stops duplicates.** Before a fact is stored, the script shows the model the live facts on the same slug and the closest keyword matches. The model adds the fact, supersedes an older one, or drops it. Search is keyword search (FTS5) with tags. Embeddings are deferred until a measured signal shows keyword search misses duplicates.
- **A digest loads at session start.** The `SessionStart` hook prints a bounded digest of live facts, plus the open threads of the current branch's change. Code builds the digest with no model, from one query, with a local cache as the fallback. It stays frozen for the session. (review.html#/memory-flow/digest)
- **Capture runs in a detached background process.** When past sessions of this repo have no facts, the hook starts a background run of the same agent's command-line tool with a small model, and returns at once. The main agent launches nothing, so your first reply carries no memory cost. The run reads Claude and Codex transcripts idle for 1 hour or more, at most 5 per run. It never reads its own sessions or subagent transcripts. A `#private` tag in any of your messages skips the whole session.
- **The same background run consolidates.** When 24 hours and 5 captured sessions have passed since the last consolidation, it merges duplicate facts, supersedes contradicted ones newest-wins, and records what it merged. No command needs to be run by hand.
- **The verbs read memory.** `/explore`, and `/plan` through it, search the store on the intent before they ask a question. `/continue` reads the slug's live facts and open threads. Every printed fact shows its age, author, and source. `/save` extracts facts through the write gate. A fact that cannot reach the store waits in an ignored local spool.
- `/ship` distills reusable process facts from the change's facts into the owning wiki pages, inside the ship pull request. Nothing else writes the wiki automatically.
- **BREAKING:** `notes/` leaves the repo. One migration pass extracts facts from WongStack's 44 notes and keeps each note's text in R2 as its source when R2 is enabled. `/wong-sync` gives installed repos the same migration task. The prose allowlist becomes `wiki/**` only, and the `notes.md` path rule is removed.
- Release as WongStack 17.0.0.

**Non-goals:** No embeddings or vector index in this release, and no Worker in front of the store. No backfill of sessions that no current checkout of the repo can claim. No rewrite of historical archives or changelog entries, and no attempt to remove old notes from git history.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="memory-flow" data-kind="flow" data-states="after today">
  <p class="caption">What memory does in a session: after this change, and today.</p>
  <div class="frame">
    <div class="state state-after">
      <h2>After</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="after-start">
          <h3>A session starts <span class="tag">Kept</span></h3>
          <p>You open Claude or Codex in a checkout of the repo.</p>
          <details><summary>Details</summary><p>Actor: you. Action: start a session. Result: the agent's <code>SessionStart</code> hook fires. Agents without a start hook follow an <code>AGENTS.md</code> instruction.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-hook">
          <h3>The start hook runs a script with no model <span class="tag">New</span></h3>
          <p>All network work fits in a 1.5 s budget.</p>
          <details><summary>Details</summary><p>Actor: <code>SessionStart</code> hook. Action: append this checkout to the registry, count the pending sessions, check the local spool for facts, and check if consolidation is due. The hook does not upload spooled facts, because each fact must pass the write gate, and the gate needs a model. Result: the facts for the digest and one yes or no answer about background work.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-digest" data-mark="digest">
          <h3>The hook prints the digest <span class="tag">New</span> <i class="callout">1</i></h3>
          <p>Code builds it from one SQL query of live facts. It stays frozen for the whole session.</p>
          <details><summary>Details</summary><p>Actor: script. Action: read the facts that no later fact supersedes, ordered by type and then by recency, and add the open <code>thread</code> facts of the current branch's change. The digest stops at 150 lines or 25 KB. Each line shows the type, the body, the slug, the age in days, the author, and the fact id. Its header reports the result of the last background run. Result: the agent starts with the team's memory. When the store cannot be reached, the script prints the last digest from a local cache in the git common directory.</p></details>
        </div>
        <p class="flow-connector">↓ Are sessions pending, are facts in the spool, or is consolidation due?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-none">
            <h3>If no <span class="tag">New</span></h3>
            <p>Nothing else runs.</p>
            <details><summary>Details</summary><p>Actor: script. Action: exit. Result: the session starts with only the digest added.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-detach">
            <h3>If yes <span class="tag">New</span> <i class="callout">2</i></h3>
            <p>The hook starts a detached background run and returns at once.</p>
            <details><summary>Details</summary><p>Actor: hook. Action: start the same agent's command-line tool (<code>claude</code> or <code>codex</code>) in headless mode with a small model. The main agent launches nothing. Result: your first reply is not delayed. If a headless run cannot start, the hook tells the main agent to start a background subagent instead.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Only the "yes" path continues, in the background</p>
        <div class="step flow-card" data-target-id="after-capture">
          <h3>The run captures past sessions <span class="tag">New</span> <i class="callout">3</i></h3>
          <p>At most 5 sessions idle for 1 hour or more, newest first, plus the spooled facts.</p>
          <details><summary>Details</summary><p>Actor: background run. Action: code strips each transcript and replaces known <code>.env</code> values. A session with <code>#private</code> in any of your messages is skipped completely. When the store has an R2 bucket, code uploads the raw transcript to it, and the model proposes facts from the stripped text. The run never reads its own sessions or subagent transcripts. The run also takes the facts from the local spool. Result: proposed facts for each session, and the spooled facts, all ready for the write gate.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="after-gate">
          <h3>The write gate decides each fact <span class="tag">New</span> <i class="callout">4</i></h3>
          <p>The model sees similar facts, then adds, supersedes, or drops.</p>
          <details><summary>Details</summary><p>Actor: script and model. Action: the script shows the live facts on the same slug and the top keyword matches. The model chooses <code>add</code>, <code>supersede &lt;id&gt;</code>, or <code>drop</code>. Result: only new facts are written, and a replaced fact points to its successor.</p></details>
        </div>
        <p class="flow-connector">↓ When 24 hours and 5 captured sessions have passed since the last consolidation</p>
        <div class="step flow-card" data-target-id="after-consolidate">
          <h3>The same run consolidates <span class="tag">New</span></h3>
          <p>It merges duplicates and supersedes contradicted facts, newest wins.</p>
          <details><summary>Details</summary><p>Actor: background run. Action: merge duplicate facts, supersede contradicted facts with the newest one, and record the counts in a <code>runs</code> row. The counts include duplicates that the write gate missed. Result: the live set stays small. Nothing is deleted, and no command runs by hand.</p></details>
        </div>
        <p class="flow-connector">↓ Writes to</p>
        <div class="step flow-card" data-target-id="after-store">
          <h3>The memory store <code>&lt;repo&gt;-memory</code> <span class="tag">New</span></h3>
          <p>D1 keeps facts, sessions, tags, and runs. An optional private R2 bucket keeps raw transcripts.</p>
          <details><summary>Details</summary><p>Actor: memory script. Action: call the Cloudflare REST API with the memory token. CI never receives this token. Result: rows in D1, and objects in R2 when the bucket exists. Without R2, no transcript is stored and everything else works. A private session gets only its session row, with no upload.</p></details>
        </div>
        <p class="flow-connector">↓ During the work, the verbs read and write the same store</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="after-explore">
            <h3><code>/explore</code> <span class="tag">Changed</span></h3>
            <p>Searches the store on the intent before it asks.</p>
            <details><summary>Details</summary><p>Actor: <code>/explore</code>, and <code>/plan</code> through it. Action: keyword search with tags. Result: the questions start from what the team already knows. Each printed fact shows its age, author, and source.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-save">
            <h3><code>/save</code> <span class="tag">Changed</span></h3>
            <p>Extracts facts through the write gate.</p>
            <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: propose facts from the session and pass each one through the write gate. Result: facts in the store. When the store cannot be reached, the facts wait in an ignored local spool. The next session start sees the spool and starts the background run, which passes the facts through the write gate and uploads them.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-continue">
            <h3><code>/continue</code> <span class="tag">Changed</span></h3>
            <p>Reads the slug's live facts and open threads.</p>
            <details><summary>Details</summary><p>Actor: <code>/continue</code>. Action: query the facts for the slug. Result: a cold resume on any machine gets every saved and captured fact.</p></details>
          </div>
          <div class="flow-branch" data-target-id="after-ship">
            <h3><code>/ship</code> <span class="tag">Changed</span> <i class="callout">5</i></h3>
            <p>Distills reusable facts into wiki pages, inside the ship PR.</p>
            <details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: read the change's facts and edit the owning wiki pages with reusable process facts. Result: a person reviews the edits in the ship pull request, before the change archives.</p></details>
          </div>
        </div>
      </div>
    </div>
    <div class="state state-today">
      <h2>Today</h2>
      <div class="flow-sequence">
        <div class="step flow-card" data-target-id="today-start">
          <h3>A session starts <span class="tag">Changed</span></h3>
          <p>No memory loads.</p>
          <details><summary>Details</summary><p>Actor: you. Action: start a session. Result: the agent knows nothing from past sessions until a verb reads a note.</p></details>
        </div>
        <p class="flow-connector">↓</p>
        <div class="step flow-card" data-target-id="today-end">
          <h3>A session ends <span class="tag">Kept</span></h3>
          <p>What the session worked out is only in the transcript.</p>
          <details><summary>Details</summary><p>Actor: you. Action: close the session. Result: nothing is captured automatically.</p></details>
        </div>
        <p class="flow-connector">↓ Did you run <code>/save</code>?</p>
        <div class="flow-branches">
          <div class="flow-branch" data-target-id="today-saved">
            <h3>If yes <span class="tag">Removed</span></h3>
            <p>A note goes to <code>notes/&lt;slug&gt;.md</code> in git.</p>
            <details><summary>Details</summary><p>Actor: <code>/save</code>. Action: write the note and commit it. Result: the note is public in a public repo, and a protected <code>main</code> turns each capture into a pull request.</p></details>
          </div>
          <div class="flow-branch" data-target-id="today-lost">
            <h3>If no <span class="tag">Removed</span></h3>
            <p>The context is lost.</p>
            <details><summary>Details</summary><p>Actor: none. Result: the transcript stays on one machine, and nothing reads it again.</p></details>
          </div>
        </div>
        <p class="flow-connector">↓ Later</p>
        <div class="step flow-card" data-target-id="today-continue">
          <h3>Only <code>/continue</code> reads the note file <span class="tag">Changed</span></h3>
          <p>Nothing revisits a note. Search is grep.</p>
          <details><summary>Details</summary><p>Actor: <code>/continue</code>. Action: read <code>notes/&lt;slug&gt;.md</code>. Result: the saved context, with no index. No step removes a stale or duplicate note.</p></details>
        </div>
      </div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>The digest stays frozen for the whole session, so prompt caching holds. Facts written during the session show in the next digest. Code builds the digest with no model, so a session start costs no tokens for memory.</li>
      <li>A detached run adds no cost to your first reply, because the main agent launches nothing. The run spends your own model quota without a visible turn. The next digest header reports what it did.</li>
      <li>One <code>#private</code> in any of your messages skips the whole session. The session row records the skip, so the session is not read again, and nothing from it is uploaded.</li>
      <li>The write gate uses the model to catch paraphrases, so embeddings are not necessary yet. Consolidation is the backstop. Its counts show when the gate misses duplicates, and that signal triggers embeddings.</li>
      <li><code>/ship</code> is the only automatic path from facts into the wiki, and a person reviews it in the ship pull request.</li>
    </ol>
  </div>
</section>

<section class="visual diff-visual" id="memory-schema" data-kind="diff">
  <p class="caption">Where memory lives: a Markdown file in git today, rows and objects in the <code>&lt;repo&gt;-memory</code> store after this change.</p>
  <div class="frame">
    <div class="diff">
      <div><div class="label">Before · <code>notes/&lt;slug&gt;.md</code> in git</div><pre><span class="line del">---</span><span class="line del">slug: add-po-search</span><span class="line del">started: 2026-07-28</span><span class="line del">updated: 2026-07-29</span><span class="line del">---</span><span class="line del"></span><span class="line del"># Add PO search</span><span class="line del"></span><span class="line del">Decisions, constraints, and dead ends,</span><span class="line del">revised in place on each /save.</span><span class="line del"></span><span class="line del">## Open threads</span><span class="line del"></span><span class="line del">- …</span></pre></div>
      <div><div class="label">After · D1 and R2 <code>&lt;repo&gt;-memory</code></div><pre><span class="line add">sessions        one row per transcript</span><span class="line add">  id            TEXT PK   'claude:&lt;uuid&gt;' | 'codex:&lt;uuid&gt;'</span><span class="line add">                          | 'migration:&lt;slug&gt;'</span><span class="line add">  agent         TEXT      claude | codex | migration</span><span class="line add">  author        TEXT</span><span class="line add">  machine       TEXT</span><span class="line add">  branch, cwd   TEXT</span><span class="line add">  started_at    TEXT</span><span class="line add">  ended_at      TEXT</span><span class="line add">  status        TEXT      captured | skipped | private</span><span class="line add">  read_through  TEXT      last message processed</span><span class="line add">  raw_key       TEXT      R2 object key</span><span class="line add">  raw_bytes     INTEGER</span><span class="line"></span><span class="line add">facts           append-only <i class="callout">1</i></span><span class="line add">  id            INTEGER PK</span><span class="line add">  slug          TEXT      OpenSpec change name or topic</span><span class="line add">  type          TEXT      user | feedback | project</span><span class="line add">                          | reference | thread</span><span class="line add">  body          TEXT      at most 400 characters</span><span class="line add">  session_id    TEXT      -&gt; sessions.id</span><span class="line add">  source        TEXT      save | backfill | migration</span><span class="line add">                          | consolidation</span><span class="line add">  created_at    TEXT</span><span class="line add">  author        TEXT</span><span class="line add">  superseded_by INTEGER   -&gt; facts.id, NULL while live</span><span class="line"></span><span class="line add">tags            name TEXT PK, definition TEXT NOT NULL, <i class="callout">2</i></span><span class="line add">                alias_of, created_by, created_at</span><span class="line add">fact_tags       fact_id, tag</span><span class="line add">facts_fts       FTS5 over facts.body</span><span class="line"></span><span class="line add">runs            one row per background run <i class="callout">4</i></span><span class="line add">  id, kind      capture | consolidation</span><span class="line add">  host, started_at, finished_at</span><span class="line add">  counts        JSON</span><span class="line"></span><span class="line add">R2 &lt;repo&gt;-memory <i class="callout">3</i></span><span class="line add">  sessions/&lt;agent&gt;/&lt;session-id&gt;.jsonl</span><span class="line add">                  raw transcript, kept forever</span><span class="line add">  migration/&lt;slug&gt;.md</span><span class="line add">                  the migrated note's text</span></pre></div>
    </div>
  </div>
  <div class="notes">
    <ol>
      <li>A fact is never edited. A later fact supersedes it through <code>superseded_by</code>. A <code>thread</code> fact is an open question, and it closes when a fact supersedes it.</li>
      <li>A tag cannot exist without a definition. <code>alias_of</code> folds a near-duplicate tag into its canonical tag.</li>
      <li>The bucket is private, but the files are plain. Everyone with the memory token can read every teammate's raw transcripts. The raw transcript lets a later run extract facts again.</li>
      <li><code>runs.counts</code> records the duplicates that consolidation merged. This count is the measured trigger to add embeddings.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
