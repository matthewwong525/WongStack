# Add a fact memory for every session

**Status:** in-progress
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
- **BREAKING:** `notes/` leaves the repo. One migration pass extracts facts from WongStack's 43 notes and keeps each note's text in R2 as its source when R2 is enabled. `/wong-sync` gives installed repos the same migration task. The prose allowlist becomes `wiki/**` only, and the `notes.md` path rule is removed.
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
