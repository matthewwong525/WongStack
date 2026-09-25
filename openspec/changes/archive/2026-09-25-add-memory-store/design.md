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
