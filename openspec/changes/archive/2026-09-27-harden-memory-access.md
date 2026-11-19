<!-- openspec-archive v1 2026-09-27-harden-memory-access -->
<!-- file proposal.md utf8 10518 -->
# Close the first memory security gaps

**Status:** ready-to-ship
**Branch:** explore-worker-memory-security
**Open questions:** none

## Why

A security review of session memory found that the checks inside the memory route hold, but four gaps sit around them. A branch can redirect your memory key and GitHub token to someone else. Mini-app code can reach the memory store past its wall. Saved transcripts keep tokens that weren't in this repo's `.env`. And read-only access to a private repo is enough to write facts that load into everyone's sessions. You want the first three closed, every teammate limited to their own notes, and read-only collaborators kept in memory without reaching anyone else.

## What Changes

- **Your key only goes to the address on your main checkout.** Today, memory reads its address from the branch you have open, so a branch that changes one line gets your key at start-up. Now the address comes from your main checkout, the one that holds `.env`. A branch that names a different address is ignored, and the start-up notes say so.
  ```text
  Before
  branch's address ──▶ key sent there

  After
  main checkout's address ──▶ key
  branch's address differs
     └─▶ ignored, with a warning
  ```
- **Mini apps lose the side door to memory.** A mini app was only handed the app database, but it could still import the Worker's full settings and reach memory directly. That import is now switched off for the whole app, in this repo and for new installs. The wiki stops promising a wall it can't keep: a mini app shares the Worker with memory, so review its code before you publish.
- **Transcripts hide token-shaped text before upload.** Today only this repo's `.env` values are blanked. Now anything shaped like a GitHub, `sk-`, AWS, JWT, Bearer, or memory key is blanked too, in the stored transcript and in what the capture reads.
- **Only you can replace your notes.** Today any teammate can replace anyone's note with a credited one of their own. Now a teammate replaces only notes they wrote; the admin can still replace any. The automatic tidy-up on a teammate's machine merges only their own notes.
- **Read-only collaborators keep memory, but their notes stay theirs.** On a private repo, someone you gave read access still joins on their own. What they write shows only in their own start-up notes and searches, never a teammate's. A public repo still needs push access to join, so nobody on the web gets in. The server marks their notes when they are saved, so they can't undo it. You run a one-time memory update after this ships; until then, read-only people can't join.
  ```text
  Can push?   Joins?   Teammates see
              notes?
  ─────────   ──────   ─────────────
  yes         yes      yes
  read only   yes      no, only them
  ```

Non-goals: showing full author emails in the digest, tying admin to a GitHub account instead of an email, expiry for the admin and `member add` keys, and caps on keys or transcript size.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: *No credential value reaches memory* also blanks token shapes in transcripts; *Memory is reached through the production Worker with a memory key* takes the Worker address from the primary checkout only; *A person with GitHub access joins memory* gives a private repo's read-only person a reader key; new *A read-only teammate's facts stay their own*; *A team keeps personal facts personal* hides readers' facts from everyone else; *Teammates cannot change or hide each other's facts* limits every member's supersede to its own facts.
- `mini-apps`: *A mini app reaches only the app database* — the Worker also turns off importing its bindings, and the promise is scoped to what the runtime enforces.
- `stack-pack`: *A created wrangler config deploys* — the fragment's compatibility settings turn off importable bindings.

## Impact

- `.agents/skills/memory/scripts/lib/store.mjs` (`loadConfig`): reads `components.memory.worker` from the primary checkout; `session-start.mjs` digest notes a differing branch address.
- `.agents/skills/memory/scripts/lib/scan.mjs`: `redact` also replaces `TOKEN_PATTERNS` matches; a memory-key pattern joins the list. `memory.mjs` strip already calls `redact` for the upload and the model's text.
- `.agents/skills/memory/migrations/0004_readers.sql` (new): `memory_keys.reader` and `facts.shared`.
- `.agents/skills/memory/worker/memory-worker.mjs`: `join` makes a reader key for pull-without-push on a private repo; `findGrant` reads `reader`; `query` rewrites a reader's fact insert to `shared = 0` and limits every non-admin supersede to the key's own facts; the save and tidy reports name a fact left live. `lib/digest.mjs` `personalFilter` hides other people's unshared facts; `lib/members.mjs` `member list` shows readers.
- `app/wrangler.jsonc` and the `wrangler.jsonc` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`: `disallow_importable_env`; `app/worker-configuration.d.ts` regenerated.
- `mini-apps/router.mjs` comment, `wiki/stack/mini-apps.md`, `wiki/development/memory.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-capture.test.mjs`, `memory-store.test.mjs`, `wrangler-config.test.mjs`.
- `CHANGELOG.md` `## Next (minor)` entry; installed repos add the flag to their own `app/wrangler.jsonc`, planned by `/wong-sync`.

## Decision log

- **2026-09-27** — Asked which review findings to fix → chose the key following the branch, the mini-app wall, and transcript scrubbing.
- **2026-09-27** — Asked how to fix the mini-app gap → chose turn off importable env and correct the wiki, not a separate memory Worker.
- **2026-09-27** — Asked who may join memory on a private repo → chose push access only.
- **2026-09-27** — Asked at review whether read-only people could still join but only affect their own memory → chose yes, replacing push-only: a reader key whose facts only its owner sees and which supersedes only its own facts.
- **2026-09-27** — Asked at review whether every teammate, not only readers, should replace only their own notes → chose yes; the admin keeps replacing any.
- **2026-09-27** — Asked how read-only collaborators on a public repo get in → chose keep push only; the user will not run `member add`, so the plan points no one at it.
- **2026-09-27** — Asked whether readers' notes stay hidden now that no one can replace a teammate's → chose keep them hidden.
- **2026-09-27** — Assumed: memory adds no way for a reader to share a note, because the user said knowledge meant for teammates goes in the wiki, which is how this repo shares.
- **2026-09-27** — Assumed: a teammate's supersede of someone else's fact leaves it live and the script names it, rather than refusing the whole save, because the new fact is still worth keeping.
- **2026-09-27** — Assumed: the reader rule ships in this change even though finding #4 was not ticked, because the join-rule answers asked for it; full author emails and admin by GitHub id stay out.
- **2026-09-27** — Assumed: one change for all four fixes, because they all touch memory and ship as one release.
- **2026-09-27** — Assumed: only the Worker address comes from the primary checkout, and the store ids stay with this checkout, because the address alone decides where a key or GitHub token is sent; the ids reach the fixed Cloudflare API or are ignored by the Worker, and a store an update adds on a branch keeps working before it merges.
- **2026-09-27** — Assumed: when Git cannot confirm the primary checkout, memory keeps reading this checkout's record, because that layout has no other checkout to trust and reads already fall back that way.
- **2026-09-27** — Assumed: a differing branch address earns one line in the start-up notes, because a silent ignore would hide an attempt.
- **2026-09-27** — Assumed: a memory-key shape (`wongm_…`) joins the token patterns, because another repo's key is exactly what a transcript can leak, and facts benefit from the same check.
- **2026-09-27** — Assumed: the reader mark lives in new columns (`memory_keys.reader`, `facts.shared`) rather than a third role, because the role's check constraint cannot change without rebuilding the keys table.
- **2026-09-27** — Assumed: teammates' clients hide readers' facts through the one team filter, and the Worker forces the mark on write, because member reads are free SQL the Worker cannot filter, and teammates' own scripts are the ones that load the digest.
- **2026-09-27** — Assumed: live and show take the team filter too, because the tidy reads live and would otherwise restate a reader's note as shared.
- **2026-09-27** — Assumed: the admin and `--everyone` searches still show readers' facts, because the admin reads everything today.
- **2026-09-27** — Assumed: readers may still add tags and run records, because their own fact tags need tags to exist and a run line carries no fact; both are listed as leftovers.
- **2026-09-27** — Assumed: `member add` keeps making full member keys, because the admin chose that person on purpose.
- **2026-09-27** — Assumed: a read-only person's current member key keeps sharing until its next renewal makes it a reader key, and their earlier facts stay shared, because facts are never edited.
- **2026-09-27** — Assumed: a minor release, because no route is removed and every current member keeps memory.
- **2026-09-27** — Assumed: the post-deploy check (migrate, then a read-only account joins as a reader) becomes a memory thread instead of a task, because `/ship` archives before production deploys.
- **2026-09-27** — Built inside `/ship`: the memory address comes from the primary checkout, `disallow_importable_env` is set, transcripts lose token shapes, every member supersedes only its own facts, and a private repo's read-only person joins as a reader whose facts only they see (digest, search, show, live, and the write gate). Local memory suites, link, retired-name and config checks, and strict validation pass; CI (task 5.3) is next.
- **2026-09-27** — CI passed on PR #164 after merging main's 26.3.0–26.5.0 (changelog resolved as a union); every task is done.
- **2026-09-27** — Distilled: `wiki/development/memory.md` (the *Reader* role says team knowledge goes in the wiki through a pull request).
- **2026-09-27** — Archived and checkpointed for merge by `/ship` as 26.6.0.

<!-- end proposal.md -->
<!-- file design.md utf8 9362 -->
# Design

## Context

The memory route in the production Worker (`.agents/skills/memory/worker/memory-worker.mjs`) holds up: keys are SHA-256 hashes of 256-bit random values, a member runs only the script's own write shapes plus single plain reads, and transcripts are filed under the author's email. The gaps are around it:

- `loadConfig` in `lib/store.mjs` reads `.claude/.wong-stack.json` from `ctx.root`, the checkout the session runs in. `openStore` sends the memory key as a Bearer header to `components.memory.worker`, and `lib/join.mjs` posts `gh auth token` to `<worker>/join`. The SessionStart hook does both before the person types, so a branch that edits the address gets the key, or the GitHub token on a machine with no key yet. `.env` already comes from the primary checkout (`loadEnv`), so the key and the address it goes to come from different checkouts.
- `mini-apps/router.mjs` passes `{ DB: env.DB }` to a handler, but the handler runs in the same isolate. With `compatibility_date` 2026-07-28, `import { env } from "cloudflare:workers"` returns every binding, `MEMORY_DB` and `MEMORY_BUCKET` included; with the D1 binding in hand, the `memory_keys` guard does not apply. The Cloudflare flag `disallow_importable_env` turns that import off and keeps bindings out of `process.env`. Nothing in `app/worker`, `app/src`, or `mini-apps/` imports `cloudflare:workers` env or reads `process.env`.
- `memory.mjs strip` runs `redact(raw, secretValues(store.env))` before `putObject`, which replaces only `.env` values. `scan.mjs` already has `TOKEN_PATTERNS`, but only `findCredential` (facts) uses them.
- `join` accepts `info.private ? permissions.pull : permissions.push`, and every member's `project`, `reference`, and `thread` facts load into every teammate's digest; the team filter is `personalFilter` in `lib/digest.mjs`, used by the digest and `search`. Member reads are free `SELECT`s, so the Worker cannot filter what a teammate's client reads; it can only control what a key writes.

## Goals / Non-Goals

**Goals:** a teammate supersedes only their own facts; a key or GitHub token goes only to the primary checkout's recorded address; mini-app code cannot import bindings; transcripts lose token-shaped strings before upload; a private repo's read-only person joins as a reader whose facts reach no teammate.

**Non-Goals:** a separate memory Worker; full author emails in the digest; admin tied to a GitHub id; expiry for admin and `member add` keys; key or size caps. A handler that monkeypatches globals in the shared isolate is out of reach of any flag; the wiki names that limit instead.

## Decisions

**1. The address comes from the primary checkout.** `loadConfig(ctx)` reads `components.memory` from `ctx.root` as today, then takes `worker` from `join(ctx.primaryRoot, '.claude', '.wong-stack.json')` when `ctx.primaryRoot` is set and differs from `ctx.root`. When the primary's record has no `worker`, the result has none, and the existing "no memory Worker URL" error applies; the branch's address is never a fallback. It also returns `branchWorker` when this checkout names a different address. `session-start.mjs` adds one line to the hook output when `branchWorker` is set: `Memory: this branch names another memory address (<url>); memory uses the main checkout's.` `WONG_MEMORY_API` still overrides, because the process environment is not repo-controlled and the tests use it. With `ctx.primaryRoot` null (Git cannot confirm the primary), the checkout's own record is used, as reads already do. Home stores go through `repoContext(home)`, so home gets the same rule.

*Alternative:* pin the address inside `key.json` at join. Rejected: setup-provisioned and `member add` keys have no `key.json`, and it would still trust the branch on first join.

**2. Turn off importable env.** Add `"disallow_importable_env"` to `compatibility_flags` in `app/wrangler.jsonc` and in the `wrangler.jsonc` fragment in `stack-pack-fragments.md`. Extend the `run_worker_first` test in `scripts/tests/wrangler-config.test.mjs` pattern: a test asserts both configs carry the flag. Regenerate `app/worker-configuration.d.ts` with `npm run cf-typegen` in `app/` so its header names the flag. Rewrite the comment in `router.mjs`, the *Data is shared on purpose* bullet in `wiki/stack/mini-apps.md`, and the *Two costs come with one Worker* paragraph in `wiki/development/memory.md`: a handler gets only `DB`, the flag closes the import, and a handler still shares the Worker with memory, so its code is reviewed before it publishes like any Worker code.

**3. Redact token shapes.** In `scan.mjs`, add a `Memory key` pattern (`\bwongm_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}`) to `TOKEN_PATTERNS`, and make `redact(text, values)` also replace every `TOKEN_PATTERNS` match with `[redacted:token]`, using global copies of the patterns. For the Bearer pattern, the word `Bearer` stays and only the token is replaced. The placeholder holds no quote or backslash, so a JSONL line stays valid JSON. `strip` already calls `redact` for both the upload and the text capture reads, so no call site changes. `findCredential` keeps rejecting facts, now including memory keys.

**4. Reader keys.** Migration `0004_readers.sql` adds `memory_keys.reader INTEGER NOT NULL DEFAULT 0` and `facts.shared INTEGER NOT NULL DEFAULT 1`. Columns, not a third role, because `role`'s check constraint would need the keys table rebuilt.

- *Join.* Push gives a member key, as today. On a private repo, pull without push gives a reader key (`role = 'member'`, `reader = 1`); the response names the role `reader`. A public repo still needs push: GitHub's collaborator check needs push access, so a read-only collaborator cannot be told from a stranger with their own token, and the user chose no Worker-side GitHub token. The refusal names push access, not `member add`. A store without the column refuses a reader's join with `not_migrated`; members and admins join as before. The admin email check still wins: an admin is never a reader.
- *Grant.* `findGrant` also selects `reader`, falling back through the existing `no such column` path with `0 AS reader`.
- *Writes.* After `batchRefusal` passes, `query` swaps statements by grant: for every non-admin key, the supersede gains `AND lower(author) = ?` with the key's email, so a teammate's fact simply stays live; for a reader, the fact insert also becomes the same insert with `shared` set to `0`. The swapped SQL lives beside `WRITES` in `statements.mjs` (`MEMBER_WRITES`), so the shapes stay in one file, and the client sends the same statements for every role. The supersede already returns the ids it changed; the write gate in `memory.mjs` compares them with the ids it asked for and reports each one left live with its author. The capture skill's tidy step (`memory/SKILL.md`) says a teammate's machine merges only its own facts; the admin's tidies all.
- *Reads.* `personalFilter` adds `f.shared = 1 OR lower(f.author) IN (<own emails>)` to its clause, so the digest and `search` hide other people's unshared facts; `--everyone` skips the filter, so the admin still sees them. The write gate's candidate queries in `memory.mjs` take the same clause, so a reader's fact never surfaces as a teammate's candidate. Until the admin migrates, the column is missing: the filter is built only when the store reports the reader schema, read once per run from `schema_migrations`, so an unmigrated store keeps today's queries.
- *Admin view.* `member list` shows `reader` beside the role.
- *Leftovers.* A reader may still add tags (its own fact tags need them) and run records; neither carries a fact. A read-only person's current member key keeps sharing until its next renewal makes it a reader key, and their earlier facts stay shared, because facts are never edited.

**5. Release.** A `## Next (minor)` entry. Its *Updating* note tells installed repos to add `disallow_importable_env` to their own `app/wrangler.jsonc` (never synced, because it holds database ids), and `/wong-sync` plans it as the 24.0.1 `run_worker_first` fix was planned. It also tells the admin to run `memory.mjs migrate` once, and that read-only teammates renew as readers.

## Risks / Trade-offs

- **The flag is not a sandbox.** Top-level code in a handler module can still wrap globals such as `crypto.subtle.digest` or `fetch` and see what the memory route handles. Only a separate Worker closes that; the user chose the flag, and the wiki says so plainly.
- **Pattern redaction can blank harmless text.** A long identifier starting `sk-` or a JWT-shaped string in a doc gets replaced in the stored transcript. Losing text in an archive is the safe side.
- **A stale primary checkout blocks memory.** A primary on an old branch with no `worker` stops memory in every worktree until it pulls. The existing error already says to pull the latest main.
- **Readers are hidden by teammates' scripts, not the Worker.** A teammate who deliberately runs raw SQL can still read a reader's facts; nothing loads them automatically. That is the promise: a reader cannot reach a teammate's sessions.
- **Duplicates across authors stay.** A teammate's tidy can no longer merge someone else's copy of the same fact; the admin's tidy still can.
- **Unmigrated stores.** Until the admin runs `migrate`, read-only people cannot join, and nothing else changes.

<!-- end design.md -->
<!-- file tasks.md utf8 6140 -->
# Tasks

## 1. Memory address from the primary checkout

- [x] 1.1 In `.agents/skills/memory/scripts/lib/store.mjs`, make `loadConfig` take `worker` from the primary checkout's `.claude/.wong-stack.json` when `ctx.primaryRoot` is set and differs from `ctx.root`, never falling back to this checkout's address, and return `branchWorker` when this checkout names a different one; with no primary, keep this checkout's record. Verify: a new test in `scripts/tests/memory-worker.test.mjs` with a linked worktree whose record names another address shows the digest's request and a join reach only the primary's Worker
- [x] 1.2 In `.agents/skills/memory/scripts/session-start.mjs`, print one line when `branchWorker` is set, saying the branch's address was ignored. Verify: the same test asserts the line, and a worktree with a matching address prints none
- [x] 1.3 Update the store comment at the top of `store.mjs` and the *The memory key* section of `wiki/development/memory.md`: the address comes from the main checkout, like `.env`. Verify: `node scripts/check-payload-links.mjs` passes

## 2. Mini apps cannot import bindings

- [x] 2.1 Add `"disallow_importable_env"` to `compatibility_flags` in `app/wrangler.jsonc` and in the `wrangler.jsonc` fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md`. Verify: a new test in `scripts/tests/wrangler-config.test.mjs` asserts both carry it
- [x] 2.2 Regenerate `app/worker-configuration.d.ts` with `npm run cf-typegen` in `app/`. Verify: its header lists the flag, and CI's app tests pass at 5.3
- [x] 2.3 Rewrite the handler comment in `mini-apps/router.mjs`, the *Data is shared on purpose* bullet in `wiki/stack/mini-apps.md`, and the *Two costs come with one Worker* paragraph in `wiki/development/memory.md`: a handler gets only `DB`, the flag closes the import, and a handler still shares the Worker with memory, so review its code before it publishes. Verify: no page still says a mini app "can not read anyone's sessions"

## 3. Transcripts lose token shapes

- [x] 3.1 In `.agents/skills/memory/scripts/lib/scan.mjs`, add a memory-key pattern to `TOKEN_PATTERNS` and make `redact` also replace every pattern match with `[redacted:token]`, keeping the word `Bearer`. Verify: the helpers test in `scripts/tests/memory-store.test.mjs` covers each pattern, a JSONL line staying valid JSON, and `findCredential` rejecting a memory key
- [x] 3.2 Extend the strip test in `scripts/tests/memory-capture.test.mjs`: a transcript holding a GitHub token and another repo's memory key, neither in `.env`, uploads and prints only placeholders
- [x] 3.3 In `wiki/development/memory.md`, change *Known `.env` values are replaced before upload* and *A secret that was never in `.env` stays in the raw transcript* to say token-shaped strings are replaced too, and a secret with no known shape still needs `#private`

## 4. Own notes only, and reader keys

- [x] 4.1 Add `.agents/skills/memory/migrations/0004_readers.sql` with `memory_keys.reader` and `facts.shared`. Verify: `memory.mjs migrate` in the test harness applies it once and a second run does nothing
- [x] 4.2 In `.agents/skills/memory/worker/memory-worker.mjs`, make `join` give a reader key for pull without push on a private repo, refuse it with `not_migrated` on an unmigrated store, keep push for public repos, and read `reader` in `findGrant`. Verify: in `scripts/tests/memory-worker.test.mjs`, `tok-ana` gets a reader key, `tok-dev` a member key, the owner an admin key, the public reader and the fork are still refused, and an unmigrated store refuses only the reader
- [x] 4.3 Add `MEMBER_WRITES` to `statements.mjs`: in `query`, every non-admin supersede gains the own-author condition, and a reader's fact insert sets `shared = 0`. Verify: a member's and a reader's supersede of a teammate's fact leaves it live, the admin's supersedes it, and a reader's saved fact has `shared = 0` even when it asks otherwise
- [x] 4.4 In `memory.mjs`'s write gate, report each asked-for supersede the store left live, with its author. Verify: a test save by Ana superseding Bo's fact prints that it was left because Bo wrote it
- [x] 4.5 In `lib/digest.mjs`, make `personalFilter` hide other people's unshared facts when the store has the reader schema, and use the clause in the write gate's candidate queries in `memory.mjs`. Verify: a reader's `thread` shows in its own digest and search, not a teammate's, and shows with `--everyone`; an unmigrated store's queries are unchanged
- [x] 4.6 Show `reader` in `member list` (`lib/members.mjs`) and in `memory.mjs join`'s message. Verify: the member-list test lists a reader key
- [x] 4.7 Update `wiki/development/memory.md`: *Joining through GitHub* (push makes a member, read access on a private repo makes a reader whose facts only they see, a public repo needs push, the admin runs `migrate` once), the *Member* role line (supersedes only their own facts), and the tidy paragraph (a teammate's tidy merges only their own facts); update the tidy step in `.agents/skills/memory/SKILL.md` the same way. Verify: `node scripts/check-payload-links.mjs` passes
- [x] 4.8 In `memory.mjs`, give `live` and `show <slug>` the team filter, lifted by `--everyone`. Verify: in `scripts/tests/memory-worker.test.mjs`, a reader's fact is absent from a teammate's `live` and `show`, and present with `--everyone` and for the reader

## 5. Release and checks

- [x] 5.1 Add a `## Next (minor) — Memory keys stay home, and read-only teammates keep their notes to themselves` entry at the top of `CHANGELOG.md`, with an *Updating* note: add `disallow_importable_env` to your own `app/wrangler.jsonc` (`/wong-sync` plans it), run `memory.mjs migrate` once, and read-only teammates renew as readers
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `openspec validate harden-memory-access --strict --no-interactive`, and the touched suites with `TMPDIR=/var/tmp node --test scripts/tests/memory-*.test.mjs scripts/tests/wrangler-config.test.mjs`
- [x] 5.3 `/save`, and confirm CI passes on this branch

<!-- end tasks.md -->
<!-- file specs/memory/spec.md utf8 5368 -->
## MODIFIED Requirements

### Requirement: No credential value reaches memory

A fact SHALL be rejected when its body matches a non-empty `.env` value or a known token pattern, and the report SHALL name the pattern but never the value. Before a transcript is uploaded or read by capture, every non-empty `.env` value and every string matching a known token pattern SHALL be replaced with a placeholder, and capture SHALL keep a secret's name and purpose but never its value.

#### Scenario: A pasted token reaches a fact

- **WHEN** a fact draft holds a string shaped like a GitHub token
- **THEN** the store rejects it and the report names the pattern, not the value

#### Scenario: A session prints a token that is not in `.env`

- **WHEN** a captured session printed another repo's memory key or a GitHub token
- **THEN** the stored transcript and the text capture reads hold a placeholder in its place

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key or a GitHub token. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any join go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: A person with GitHub access joins memory

A person SHALL get a key for their machine without the admin, by proving through GitHub that they can push to the repo, or, for a private repo, read it. Push access SHALL give a member key; read access alone on a private repo SHALL give a reader key, and only once the store carries the reader schema. The Worker SHALL check only its own repository, key a GitHub-verified email, never store the GitHub token, and write the key only to `.env`; a joined key SHALL expire after 30 days, renewed in the background at session start.

#### Scenario: A fork owner asks

- **WHEN** someone who cannot read the original repo sends a join naming their fork
- **THEN** the Worker refuses with 403 and makes no key

#### Scenario: A read-only collaborator asks

- **WHEN** someone who can read a private repo but not push to it sends a join
- **THEN** the Worker makes a reader key, or refuses with the migration fix when the store lacks the reader schema

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the digest and search SHALL show only the current person's `user` and `feedback` facts, matched on every email on their `wiki/people/` page, plus everyone's shared `project` and `thread` facts, unless asked for everyone. A fact a reader key wrote SHALL show only to its author, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a plain search for `deploy` hides it and a search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

### Requirement: Teammates cannot change or hide each other's facts

A `member` key SHALL write facts only under its own email, and SHALL supersede only facts written under its own email, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, writes under another name, overwrites another person's session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403 and no fact is stored

## ADDED Requirements

### Requirement: A read-only teammate's facts stay their own

A reader key SHALL read and write memory like a member key, except that the Worker SHALL mark every fact it writes as unshared, whatever the request says. A reader SHALL NOT be able to share its facts.

#### Scenario: A reader asks to share a fact

- **WHEN** a reader's save sends a fact as shared
- **THEN** the fact is stored unshared, and only the reader sees it

<!-- end specs/memory/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 864 -->
## MODIFIED Requirements

### Requirement: A mini app reaches only the app database

A handler SHALL receive the repo's app database and no other binding, and the Worker SHALL turn off every other runtime route to its bindings, such as importing them or reading them from the process environment. The docs SHALL say a handler shares the Worker with the memory store, so the limit stops mistakes, not code written to get around it. A preview SHALL use staging data, never production.

#### Scenario: Production binds memory

- **WHEN** a handler runs on the production Worker, which binds the memory store
- **THEN** the handler gets the app database and no memory binding

#### Scenario: A handler imports the Worker's bindings

- **WHEN** a handler imports the environment from the Workers runtime
- **THEN** the runtime refuses, and no memory binding reaches it

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 863 -->
## MODIFIED Requirements

### Requirement: A created wrangler config deploys

A wrangler config made from the fragment SHALL declare a deployable Worker, with entry point, assets, and compatibility settings beside the bindings, and every config-relative path SHALL be right for both the repo-root and `app/` layouts. Its compatibility settings SHALL turn off importable bindings, so code the Worker serves reaches a binding only when a route hands it one.

#### Scenario: The app layout

- **WHEN** provisioning creates `app/wrangler.jsonc`
- **THEN** `wrangler deploy` has an entry point, and migrations are found at `../schema/migrations`

#### Scenario: An installed repo updates

- **WHEN** `/wong-sync` plans an update from a release before this one
- **THEN** the plan adds the flag that turns off importable bindings to the repo's own `app/wrangler.jsonc`

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 42347 fence=~~~ -->
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
<title>Review · 2026-09-27-harden-memory-access</title>
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
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-harden-memory-access">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-harden-memory-access</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A security review of session memory found that the checks inside the memory route hold, but four gaps sit around them. A branch can redirect your memory key and GitHub token to someone else. Mini-app code can reach the memory store past its wall. Saved transcripts keep tokens that weren't in this repo's <code>.env</code>. And read-only access to a private repo is enough to write facts that load into everyone's sessions. You want the first three closed, every teammate limited to their own notes, and read-only collaborators kept in memory without reaching anyone else.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Your key only goes to the address on your main checkout.</b> Today, memory reads its address from the branch you have open, so a branch that changes one line gets your key at start-up. Now the address comes from your main checkout, the one that holds <code>.env</code>. A branch that names a different address is ignored, and the start-up notes say so.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">Before</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">branch's address ──▶ key sent there</span>

<span class="ln" data-note="item-1-line-4" tabindex="0">After</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">main checkout's address ──▶ key</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">branch's address differs</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">   └─▶ ignored, with a warning</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Mini apps lose the side door to memory.</b> A mini app was only handed the app database, but it could still import the Worker's full settings and reach memory directly. That import is now switched off for the whole app, in this repo and for new installs. The wiki stops promising a wall it can't keep: a mini app shares the Worker with memory, so review its code before you publish.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Transcripts hide token-shaped text before upload.</b> Today only this repo's <code>.env</code> values are blanked. Now anything shaped like a GitHub, <code>sk-</code>, AWS, JWT, Bearer, or memory key is blanked too, in the stored transcript and in what the capture reads.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Only you can replace your notes.</b> Today any teammate can replace anyone's note with a credited one of their own. Now a teammate replaces only notes they wrote; the admin can still replace any. The automatic tidy-up on a teammate's machine merges only their own notes.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Read-only collaborators keep memory, but their notes stay theirs.</b> On a private repo, someone you gave read access still joins on their own. What they write shows only in their own start-up notes and searches, never a teammate's. A public repo still needs push access to join, so nobody on the web gets in. The server marks their notes when they are saved, so they can't undo it. You run a one-time memory update after this ships; until then, read-only people can't join.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">Can push?   Joins?   Teammates see</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">            notes?</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">─────────   ──────   ─────────────</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">yes         yes      yes</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">read only   yes      no, only them</span></pre></div></details></li>
</ol>
<p class="aside">Non-goals: showing full author emails in the digest, tying admin to a GitHub account instead of an email, expiry for the admin and <code>member add</code> keys, and caps on keys or transcript size.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which review findings to fix → chose the key following the branch, the mini-app wall, and transcript scrubbing.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how to fix the mini-app gap → chose turn off importable env and correct the wiki, not a separate memory Worker.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked who may join memory on a private repo → chose push access only.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked at review whether read-only people could still join but only affect their own memory → chose yes, replacing push-only: a reader key whose facts only its owner sees and which supersedes only its own facts.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked at review whether every teammate, not only readers, should replace only their own notes → chose yes; the admin keeps replacing any.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how read-only collaborators on a public repo get in → chose keep push only; the user will not run <code>member add</code>, so the plan points no one at it.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether readers' notes stay hidden now that no one can replace a teammate's → chose keep them hidden.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: memory adds no way for a reader to share a note, because the user said knowledge meant for teammates goes in the wiki, which is how this repo shares.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a teammate's supersede of someone else's fact leaves it live and the script names it, rather than refusing the whole save, because the new fact is still worth keeping.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the reader rule ships in this change even though finding #4 was not ticked, because the join-rule answers asked for it; full author emails and admin by GitHub id stay out.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: one change for all four fixes, because they all touch memory and ship as one release.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: only the Worker address comes from the primary checkout, and the store ids stay with this checkout, because the address alone decides where a key or GitHub token is sent; the ids reach the fixed Cloudflare API or are ignored by the Worker, and a store an update adds on a branch keeps working before it merges.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: when Git cannot confirm the primary checkout, memory keeps reading this checkout's record, because that layout has no other checkout to trust and reads already fall back that way.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a differing branch address earns one line in the start-up notes, because a silent ignore would hide an attempt.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a memory-key shape (<code>wongm_…</code>) joins the token patterns, because another repo's key is exactly what a transcript can leak, and facts benefit from the same check.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the reader mark lives in new columns (<code>memory_keys.reader</code>, <code>facts.shared</code>) rather than a third role, because the role's check constraint cannot change without rebuilding the keys table.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: teammates' clients hide readers' facts through the one team filter, and the Worker forces the mark on write, because member reads are free SQL the Worker cannot filter, and teammates' own scripts are the ones that load the digest.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: live and show take the team filter too, because the tidy reads live and would otherwise restate a reader's note as shared.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the admin and <code>--everyone</code> searches still show readers' facts, because the admin reads everything today.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: readers may still add tags and run records, because their own fact tags need tags to exist and a run line carries no fact; both are listed as leftovers.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>member add</code> keeps making full member keys, because the admin chose that person on purpose.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a read-only person's current member key keeps sharing until its next renewal makes it a reader key, and their earlier facts stay shared, because facts are never edited.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, because no route is removed and every current member keeps memory.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the post-deploy check (migrate, then a read-only account joins as a reader) becomes a memory thread instead of a task, because <code>/ship</code> archives before production deploys.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built inside <code>/ship</code>: the memory address comes from the primary checkout, <code>disallow_importable_env</code> is set, transcripts lose token shapes, every member supersedes only its own facts, and a private repo's read-only person joins as a reader whose facts only they see (digest, search, show, live, and the write gate). Local memory suites, link, retired-name and config checks, and strict validation pass; CI (task 5.3) is next.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>CI passed on PR #164 after merging main's 26.3.0–26.5.0 (changelog resolved as a union); every task is done.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: <code>wiki/development/memory.md</code> (the <i>Reader</i> role says team knowledge goes in the wiki through a pull request).</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived and checkpointed for merge by <code>/ship</code> as 26.6.0.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
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
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
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
