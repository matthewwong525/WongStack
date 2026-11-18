<!-- openspec-archive v1 2026-10-21-tighten-memory-guards -->
<!-- file proposal.md utf8 9571 -->
# Proposal

**Status:** ready-to-ship
**Branch:** youthful-gopher
**Open questions:** none

## Why

The Cloudflare security check found four gaps in the team memory's guards, each reproduced with dummy data. A teammate with the lowest access can work out the words in someone else's private notes. They can also put fake text into everyone's start-of-chat summary. An old setup key keeps full memory access after the app goes private. And a teammate can backdate the record that tells the next wiki tidy-up where to start, so it skips new notes. Each is a small, local fix.

## What Changes

- **A search can't reach notes you aren't allowed to see.** Memory search only ever looks through the notes you may read: shared team notes and your own. Today a hand-written search can swap that list for one it makes up, then probe word by word what another person's private notes say. After this change, the list the search checks can't be replaced, however the search is written.
  ```mermaid
  flowchart TD
    q[a search] --> f["notes you may see"]
    f --> s[word search]
    q -. "can't swap" .-> f
  ```

- **Your start-of-chat summary shows only your own background run.** Its line about the last background save now comes only from your own sign-in's runs. It is always one short line inside the summary's size limit. A broken run record is skipped instead of blanking the summary. When your next tidy-up of memory is due is counted from your own runs too, so someone else's record can't put it off.
  | | Today | After |
  |-|-|-|
  | Whose run shows | the newest from anyone | yours |
  | A long or multi-line reason | printed as is | one line, cut short |
  | A broken run record | the summary fails | that run line is left out |

- **The setup key stops working once the app has a sign-in.** An app set up before its card was added gets a memory key with full access, saved on the setup computer. Once the app goes private, the memory store refuses that key, and memory uses each person's company sign-in instead. Rerunning setup after adding the card also turns the key off and removes it from the setup computer. Turning the key off can't be undone: a new one is only made for an app that is open again.
  ```mermaid
  flowchart TD
    open["open app: key works"] --> card[card added, setup rerun]
    card --> off["key off and removed"]
    off --> signin["company sign-in"]
  ```

- **A note's date is the date it was saved.** A teammate or a cloud schedule can no longer give a note a future date. A date ahead of the store's clock becomes the time it was saved. A re-tagged note keeps its original, earlier date. The wiki tidy-up also ignores a record of its last run that is dated in the future, or that claims to have read notes written after it.

**Non-goals:** the per-machine memory rework in the "installation-owned-memory-devices" workspace, which retires hand-written memory reads entirely; this change fixes today's code so the gaps close now. The author name a teammate puts on a note stays theirs to set: it only labels the note and never decides who owns it. The other parts of the security check each have their own workspace.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a non-admin read's full-text filter binds to a reserved shadow the caller can't redefine; runs rows carry their writer and the digest and consolidation state read only the caller's own; the run line is bounded, budgeted, and never throws; an open-site admin key is refused once the Worker has Access ids, and an unparsable expiry counts as expired; a non-admin fact's future `created_at` becomes the Worker's time.
- `cloudflare-provisioning`: the rerun that makes an open install private expires the open-site memory key and removes `CLOUDFLARE_MEMORY_TOKEN` from `.env`.
- `wiki-dream`: `lastDream` and `dreamChecks` ignore a dream fact dated in the future or claiming a fact id at or above its own.

## Impact

- `.agents/skills/memory/worker/statements.mjs` (reserved shadow names, fragment rewrite, `__mem_` refusal, run insert pinned to its writer, non-admin fact time), `memory-worker.mjs` (`keyCaller` takes `env`, refuses keys with Access ids; unparsable expiry; fact time passed to `memberStatements`).
- New migration `.agents/skills/memory/migrations/0009_run_owner.sql` (`runs.owner_subject`, index). Additive: the admin runs `memory.mjs migrate` before publishing, and old code ignores the column.
- `.agents/skills/memory/scripts/lib/digest.mjs` (`formatRun` hardening, run line inside the budget, runs and `CONSOLIDATION_STATE` scoped to `store.owner`).
- `.agents/skills/dream-memory/scripts/dream.mjs` (`isDreamFact` future and id checks).
- `.agents/skills/wong-setup/scripts/provision.mjs` (turn the key off when private), `.agents/skills/wong-setup/references/cloudflare.md` (card-later runbook), `wiki/development/memory.md`.
- Tests: `scripts/tests/memory-worker.test.mjs`, `memory-store.test.mjs` (digest), `dream.test.mjs`, `provision.test.mjs`.
- `CHANGELOG.md` minor entry with an Updating note.
- Overlap: the "installation-owned-memory-devices" branch replaces `statements.mjs` and the Worker's raw-SQL path and renumbers migrations; its rebase folds `0009_run_owner.sql` in. Its per-machine run scoping matches this change's per-person scoping, and it keeps today's `formatRun`, so the hardening carries over.

## Decision log

- **2026-10-21** — Assumed: fix the search with reserved shadow names the caller can't define, and rewrite the shared search fragment onto them at the Worker, not by widening the text guard, because the security check showed text guards miss comments and quoting, while a name the caller can't write can't be rebound.
- **2026-10-21** — Assumed: keep the existing guard against a read's own `facts` table as an extra refusal, because its tests pass and the other workspace deletes the file anyway.
- **2026-10-21** — Assumed: keep the client's search fragment text unchanged and rewrite it at the Worker, because computers that haven't updated still send today's text, and the admin's unshadowed reads need the plain names.
- **2026-10-21** — Assumed: scope the run line and the consolidation clock to the caller's own runs, not "own or the admin's", because the client can't tell which subject is an admin's, and the other workspace scopes both per machine.
- **2026-10-21** — Assumed: add a `runs.owner_subject` column with a migration, because no existing column can say who wrote a run; it is additive, so the admin applies it before publishing and no chat loses its summary in between.
- **2026-10-21** — Assumed: skip route-side length and format checks on run rows, because once a run reaches only its writer and the digest never throws, a bad row only affects the person who wrote it.
- **2026-10-21** — Assumed: refuse every memory key at the Worker while it has Access ids, not only those without an expiry, because the spec already says no key is accepted after the move to people, and this repo's live store turned its keys off on 2026-10-14.
- **2026-10-21** — Assumed: the rerun runs `migrate-people` to turn keys off, not a new command, because it already expires every key once the install record has a sign-in and reports notes waiting for an owner.
- **2026-10-21** — Assumed: replace a future fact date with the Worker's time and keep past dates, because re-tagging restates a note with its original date and a clock a few seconds ahead shouldn't fail a save.
- **2026-10-21** — Assumed: leave the author label caller-set, because the request named only the date, the label grants no ownership by spec, and pinning it would change how teammates' git emails show.
- **2026-10-21** — Assumed: drop the check's suggestion that a dream's body date equal its saved day, because the dream writes its own date, which can differ from the store's UTC day near midnight and would hide an honest dream.
- **2026-10-21** — Assumed: the full-text rank's corpus-wide statistics stay out of scope, because they predate this finding, give no note's words, and go away with the other workspace's fixed reads.
- **2026-10-21** — Asked whether a teammate's hand-written lookups should also see only their own background-run records, now that each record names its writer → chose to hide others' records from those lookups too.
- **2026-10-21** — Assumed: the after-publishing live check (admin search and digest, an old key refused, a teammate search on the live store) runs after `/ship` merges and is reported there, not kept as a task, because the archive takes only finished tasks and the check needs the published Worker. `migrate` was run on the live store before merging and recorded `0009`.
- **2026-10-21** — Archive checkpoint: built; the second look found three fixes (the dream accepted non-UTC or unreadable dates, old unowned runs reached every schedule, and a teammate could read everyone's run records), all fixed with tests, the last by the person's choice; 228 tests and the local checks pass; `0009` applied to the live store before merging; archived for ship as 43.20.0.
- **2026-10-21** — Renumbered 43.21.0: two other releases reached main first (43.19.1, 43.20.0).
- **2026-10-21** — Renumbered 44.1.0 after main's deploy recovered at 44.0.2; merged main's split of preview sign-in (both cloudflare-provisioning requirements and both provision test changes kept).
- **2026-10-21** — Renumbered 44.2.0 after main's deploy-key fix (44.1.0) landed; the preview build's staging auth failure was that change's to fix.

<!-- end proposal.md -->
<!-- file design.md utf8 12301 -->
# Design

## Context

The four findings come from the Cloudflare security check, run 1, at commit `08f9788e`; `main` has changed only a wiki page since. Their traces are in `/root/security-audit-skill/WongStack/run-1/FINDINGS-DETAIL.md` (the low one in `findings.json`), by fingerprint:

| Fingerprint | Severity | Where it lands |
|-|-|-|
| `memory-statements-OWN_SHADOW-comment-quote-cte-bypass` | high | `statements.mjs` |
| `agents/skills/memory/worker/memory-worker.mjs:keyCaller:open-site-admin-key-outlives-sign-in` | medium | `memory-worker.mjs`, `provision.mjs` |
| `memory-digest:runs-row-unscoped-unsanitized` | medium | `statements.mjs`, `digest.mjs`, migration |
| `dream-memory/dream.mjs:lastDream:dream-fact-provenance-by-body-and-caller-created_at` | low | `statements.mjs`, `dream.mjs` |

How things work today:

- A non-admin read runs behind shadow CTEs named `facts`, `fact_tags` and `sessions` (`shadowCtes`, `shadowRead`). The only word search a non-admin may send is the literal `FTS_HITS` fragment, whose filter is `+rowid IN (SELECT id FROM facts)`. That name binds to the nearest `facts` in scope. So a caller's own nested `facts` CTE rebinds it, and the `OWN_SHADOW` regex is all that stops one. It misses `/**/`, single quotes, and a column list followed by a comment.
- `WRITES.run` has no owner parameter, so `memberRefusal` passes it for every role. `digestPlan` reads the newest `runs` row from anyone, and `LAST_CONSOLIDATION` takes the newest consolidation from anyone. `formatRun` prints `host` and `reason` raw and calls `JSON.parse(run.counts)` with no guard.
- `callerOf` sends any `Bearer wongm_…` header to `keyCaller`, which never looks at `env`. A NULL or unparsable `expires_at` passes. `provision.mjs` closes an open config (`closeOpenConfig`) but leaves the key row and the `.env` line alone.
- A fact insert's `created_at` (param 5) and `author` (param 6) come from the caller. `memberRefusal` checks only the owner (param 7). `lastDream` sorts dream facts by the `created_at` string and takes the highest `#N` among same-day parts.

The "installation-owned-memory-devices" branch (based on an older `main`) replaces `statements.mjs` with fixed operations, scopes runs and consolidation per machine, and retires memory keys. It still uses today's `formatRun`. This change therefore stays inside today's files, with no new module, so its rebase meets small, local edits.

## Goals / Non-Goals

**Goals:** close each finding at the Worker or in code that already owns the behavior, with a regression test that reproduces the finding's payload. Keep every client that hasn't updated working.

**Non-Goals:**

- No route-side length or format checks on run rows; scoping makes a bad row self-harm only.
- No change to the author label.
- No defense against the full-text rank's corpus-wide statistics.
- No new memory-key lifecycle. Setup keeps issuing the key on an open site exactly as now.

## Decisions

### 1. The search filter binds to a name no caller can write

`shadowCtes(subject)` becomes:

```sql
__mem_facts AS (SELECT * FROM main.facts WHERE <today's filter>),
facts AS (SELECT * FROM __mem_facts),
fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM __mem_facts)),
sessions AS (SELECT * FROM main.sessions WHERE owner_subject = <owner>)
```

`shadowRead` first replaces every exact occurrence of `FTS_HITS` and `LEGACY_FTS_HITS` in the caller's text with `SHADOW_FTS_HITS`, the same fragment with `SELECT id FROM __mem_facts`. Then it prepends the CTEs as now. `readRefusal` refuses any read containing `__mem_` (case-insensitive) anywhere. SQLite has no dynamic identifiers or escapes besides doubled quotes, so a read can't name `__mem_facts` without that substring. With the name out of reach, a caller's own nested `facts` holds only ids it made up and never reaches the index.

- **Why not a wider text guard, as the check also suggested?** A guard on the text must model every way SQLite tokenizes a name, and this one already missed three. A reserved name needs one substring test.
- **Why rewrite at the Worker and not change `FTS_HITS`?** Clients that haven't updated send today's literal. The admin's reads aren't shadowed, so they need `facts` to mean the table. The client constant stays as it is.
- `OWN_SHADOW` and the `facts_fts` check stay as they are, as extra refusals. Their comment changes to say they're no longer what keeps the search safe.

### 2. A run row carries its writer, and each person reads their own

- Migration `0009_run_owner.sql`: `ALTER TABLE runs ADD COLUMN owner_subject TEXT;`, then `UPDATE runs SET owner_subject = 'legacy:unowned' WHERE owner_subject IS NULL;`, then `CREATE INDEX runs_owner ON runs (owner_subject, id);`. A run saved before it came from anyone, so it gets an owner no sign-in has. Left NULL, every old run would read as a schedule's own: a reader's forged `ok` consolidation dated `2999-12-31` would keep every schedule's consolidation not due, and its reason would show in each schedule's digest. Old code names its columns explicitly, so it ignores the new one.
- The route rewrites every caller's `WRITES.run` into `RUN_WITH_OWNER`, the same insert plus `owner_subject`, bound to `caller.subject`. Admins are included, because the admin path skips `memberStatements` today. A schedule or an old admin key binds NULL. The request can't name the owner because the shape has no such parameter.
- The Worker's shadow CTEs gain `runs AS (SELECT * FROM main.runs WHERE owner_subject IS <subject>)`, quoted like the others, NULL as `IS NULL`. A non-admin's hand-written read then sees only their own runs (the user's decision); a schedule sees only other unowned runs, never the `legacy:unowned` ones. `OWN_SHADOW` names `runs` too, as one more extra refusal.
- `digestPlan`'s run read becomes `… FROM runs WHERE owner_subject IS ? ORDER BY id DESC LIMIT 1`, with `store.owner`. `CONSOLIDATION_STATE` becomes `consolidationState(owner)`, scoping `LAST_CONSOLIDATION` the same way. The consolidation-counts read in `memory.mjs` (`SELECT counts FROM runs WHERE kind = 'consolidation' …`) is scoped too, and `stats` parses each row's `counts` inside `try`: one that isn't JSON, or whose `merged` isn't a number, counts as 0.
- `formatRun` follows the check's proposed shape:
  - it collapses whitespace and caps `host` at 64 characters and `reason` at 300;
  - it allows only `capture` or `consolidation` as the kind;
  - it parses `counts` inside `try` and keeps only short lowercase keys with finite numbers;
  - it returns `null` on anything it can't read.
  The run line is part of the initial `lines`, and `bytes` already counts it. Capped, it can no longer crowd out the facts.
- **Why own runs only, not "own or the admin's"?** The client can't tell which subject is an admin's. The run line describes your own machine's background run, and the other branch scopes it per machine anyway.
- **Why add `runs` to the Worker's shadow CTEs, not only scope the client?** The client's scope holds only for clients that updated; a hand-written read could still name `runs` and see everyone's. The admin runs `migrate` before publishing (task 5.3, and the Updating note), so the shadow meets the column. A copy that skips `migrate` still runs every non-admin read that never names `runs`: SQLite compiles only the CTEs a read names (tested on `node:sqlite`; see Risks).

### 3. The Worker refuses memory keys once it has a sign-in

- `keyCaller(db, bearer, env)` returns `null` before any lookup when `env.CF_ACCESS_TEAM_DOMAIN || env.CF_ACCESS_AUD`. These are the same ids `app/worker/index.ts` uses to decide the app is private. The expiry check becomes `grant.expires_at != null && !(Date.parse(grant.expires_at) > Date.now())` → refused.
- `provision()`, after the config block, checks `!open && hasKey(readEnv(envFile), machineId(...))`. When that holds, it runs `memory.mjs migrate-people` with the admin env, removes the `CLOUDFLARE_MEMORY_TOKEN` line from `envFile`, and notes `updated: memory key turned off; memory uses the company sign-in`. `migrate-people` expires every key only when the install record has an audience. Provision writes that record earlier in the same run, except under `--keep-config`. In that case provision adds a `todo` instead of claiming the key is off.
- The card-later runbook in `wong-setup/references/cloudflare.md` gains one sentence: the rerun turns the memory key off, and after publishing, the owner signs in to the company app for memory. `wiki/development/memory.md`'s open-app bullet says the same.

### 4. A non-admin fact's time is the Worker's

`memberStatements(statements, { subject, reader, now })` receives `now = new Date().toISOString()` from `query()`. For `WRITES.fact` (and the reader rewrite) it keeps param 5 only when it matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$` and is `<= now`. Otherwise it uses `now`. Requiring the format matters: `Date.parse` accepts strings like `Tue Oct 20 2026` that parse as past dates but sort after every ISO date. The admin path is unchanged. A re-tag sends a past ISO date, so it keeps it.

`isDreamFact` stays a one-argument function, because `facts.filter` passes the index as a second argument. It returns false unless `created_at` matches the Worker's `PLAIN_UTC` (exported from `statements.mjs`) and `Date.parse(created_at) <= Date.now()`, or when the body's `#N` is at or above `fact.id` (when `fact.id` is known). The format comes first because rows saved before the clamp deploys can hold `Tue Oct 20 2026`, which parses as past but sorts after every ISO date in `newestFirst`, or `zzzz`, which never parses. `<=` rather than a string compare also refuses an impossible day such as `2025-13-45T00:00:00Z`. With the clamp, `lastDream`'s `since` can't move into the future. The `#N` check stops a fresh record from claiming to have read later facts. The check's suggestion that the body date must equal `day(created_at)` is dropped: the dream writes its own date, which can differ from the UTC day near midnight.

## Risks / Trade-offs

- [The reserved-name CTE has only been tested on `node:sqlite`, not real D1 (memory thread #475 already notes this for today's shadow).] → After deploy, run a non-admin word search on the live store. If no non-admin sign-in is at hand, record a thread.
- [Migration 0009 marks every old run `legacy:unowned`, so everyone's run line, the admin's and a schedule's included, is empty until their next background run, and each consolidation clock counts from the first fact, so the next one may come due early.] → Accepted: no old row says who wrote it, and a NULL left in place would give them all to every schedule. The line comes back after one run.
- [Members who relied on an admin's consolidation now consolidate on their own clock.] → A member's consolidation already touches only their own facts. The other branch makes the same per-machine choice.
- [An install that never ran `migrate-people` loses its old key as soon as this deploys.] → The client already tries the company sign-in first. The Updating note tells the admin to run `migrate-people` for notes still waiting for an owner.
- [Run reads and writes fail if the deploy lands before `migrate`.] → On such a store, a non-admin read that never names `runs` still works: SQLite compiles only the CTEs a read names, so the `runs` shadow's missing column never surfaces (tested on `node:sqlite` 3.51; real D1 is SQLite too, unverified). Searches and fact saves keep working. The digest, which reads runs, fails, so a chat starts with no summary, and a background run's record is refused. Both come back once the admin runs `migrate`. Old code ignores the column, so it is safe to run first, and the Updating note says to run it before publishing.

## Migration Plan

1. Before merging, the admin runs `node .claude/skills/memory/scripts/memory.mjs migrate` from this branch. That applies `0009_run_owner.sql`, which today's live code ignores.
2. Merge. The Worker deploys with the new guards.
3. Check the live store: the admin's digest shows a run line after their next background run, and a non-admin search works (or a thread records that it's unverified).

Rollback: revert the release. The extra column is harmless to old code.

<!-- end design.md -->
<!-- file tasks.md utf8 7724 -->
# Tasks

## 1. The memory Worker's guards

- [x] 1.1 In `.agents/skills/memory/worker/statements.mjs`, make `shadowCtes` define `__mem_facts` with today's filter and `facts`, `fact_tags` read from it. Add `SHADOW_FTS_HITS`, and have `shadowRead` replace each exact `FTS_HITS`/`LEGACY_FTS_HITS` with it before prepending. Make `readRefusal` refuse any read containing `__mem_` (any case). Reword the `OWN_SHADOW` comment as an extra refusal. Done when source review shows no non-admin search fragment still reads `facts` (design §1).
- [x] 1.2 In `statements.mjs`, add `RUN_WITH_OWNER` and a helper that rewrites every caller's `WRITES.run` to it with `caller.subject` (NULL for a schedule or an old key). Give `memberStatements` a `now`: a fact insert keeps param 5 only when it is a plain UTC ISO timestamp no later than `now`, otherwise `now` (design §2, §4).
- [x] 1.3 In `.agents/skills/memory/worker/memory-worker.mjs`, pass `env` to `keyCaller` and refuse a key when `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` is set. Treat a set but unparsable `expires_at` as expired. In `query()`, pass `now` and apply the run-owner rewrite for admins too (design §2, §3).
- [x] 1.4 Add `.agents/skills/memory/migrations/0009_run_owner.sql` (`runs.owner_subject`, `runs_owner` index), in the style of `0008`. Done when `memory.mjs migrate` on the test fixture applies it once and a rerun applies nothing.
- [x] 1.5 In `scripts/tests/memory-worker.test.mjs`, reproduce each finding's payload as a regression test:
  - all four bypass reads from the search finding (comment after the name, comment after `AS`, single-quoted name, column list with a comment), each probing for a teammate's private `user` fact by a whole word and an `FTS5` prefix. Each is refused or returns no id of that fact.
  - a read naming `__mem_facts` gets 403; a member's ordinary and legacy-fragment searches still find a shared fact.
  - a reader's run row is stored under the reader's subject, whatever its params say.
  - a wongm_ key with Access ids set gets 401 on `/caller`, a facts read and a transcript GET; the same key with no Access ids answers as admin; a key whose `expires_at` is `not-a-date` gets 401.
  - a member's and a schedule's fact dated `2999-12-31T00:00:00Z` or `Tue Oct 20 2026` is stored at Worker time; a past ISO date is kept; an admin's future date is kept.
- [x] 1.6 In `0009_run_owner.sql`, mark every run saved before it `legacy:unowned`, an owner no sign-in has, so no schedule (NULL) reads them (review fix; design §2).
- [x] 1.7 In `statements.mjs`, add `runs AS (SELECT * FROM main.runs WHERE owner_subject IS <subject>)` to `shadowCtes`, NULL bound as `IS NULL`, and add `runs` to `OWN_SHADOW`'s names (review fix, user's decision; design §2).
- [x] 1.8 In `memory-worker.test.mjs`: a reader's, a member's and a schedule's `SELECT host, reason, owner_subject FROM runs` returns only their own rows (no `legacy:unowned` one), the admin's returns all. On a store without 0009, a member read that never names `runs` still works and one that does gets 400.

## 2. The digest and the dream

- [x] 2.1 In `.agents/skills/memory/scripts/lib/digest.mjs`, harden `formatRun` by design §2. Scope the run read to `owner_subject IS ?` with `store.owner`, and replace `CONSOLIDATION_STATE` with `consolidationState(owner)`. Update its callers in `memory.mjs` (`due`, and the consolidation-counts read) to the same scope.
- [x] 2.2 In `.agents/skills/dream-memory/scripts/dream.mjs`, make `isDreamFact` (still one argument) reject a future `created_at` and a `#N` at or above the fact's own id.
- [x] 2.3 Add digest regression tests in `scripts/tests/memory-store.test.mjs`:
  - a reader's run row, with the finding's multi-line reason and fake `## You` and `## Live facts` lines, never appears in a member's digest built through the Worker.
  - the reader's own digest shows it as one line of at most 300 reason characters.
  - a 20,000-character reason keeps the digest within `MAX_BYTES` with the team fact still shown.
  - `counts` of `not-json` gives no run line and no throw.
  - a reader's future `ok` consolidation row doesn't make a member's consolidation not due.
  - `counts` of `not-json` on a consolidation row: `stats` counts it as 0 merged and doesn't throw.
  - a run saved before 0009 (a forged `2999-12-31` consolidation and a failed capture) is marked `legacy:unowned` by `migrate`, and never reaches a schedule's digest, `stats` or consolidation clock, nor a member's digest.
- [x] 2.4 Add dream regression tests in `scripts/tests/dream.test.mjs`. Feed the finding's forged facts (dated `2999-12-31`, claiming `#999999999`, and a same-day one claiming an id above its own) beside an honest dream. `lastDream`, `dreamChecks` and `pageList` keep the honest cursor and page dates. `facts.filter(isDreamFact)` doesn't throw.
- [x] 2.5 In `dream.mjs`, `isDreamFact` keeps a record only when its `created_at` is a plain UTC timestamp (the Worker's `PLAIN_UTC`, now exported from `statements.mjs`) and `Date.parse` puts it at or before now. In `memory.mjs` `stats`, a consolidation's `counts` that isn't JSON, or whose `merged` isn't a number, counts as 0 (review fixes; design §2, §4).
- [x] 2.6 Extend 2.3 and 2.4's tests: forged dream records dated `Tue Oct 20 2026` and `zzzz` leave `lastDream`, `dreamChecks` and `pageList` on the honest cursor, and a fact without a date is no dream; the `stats` and pre-0009 digest cases above.

## 3. Setup turns the key off when the app goes private

- [x] 3.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, after the config block, when the run leaves the install private and `.env` holds this machine's memory key: run `memory.mjs migrate-people`, remove the `CLOUDFLARE_MEMORY_TOKEN` line, and note it. Under `--keep-config`, add a `todo` instead (design §3).
- [x] 3.2 In `scripts/tests/provision.test.mjs`, run open until the card, then the card-later rerun. `.env` has no `CLOUDFLARE_MEMORY_TOKEN`, every `memory_keys` row has an expiry, and the report names the key turned off. A rerun that stays open keeps the key.
- [x] 3.3 Add the sentence to `.agents/skills/wong-setup/references/cloudflare.md#adding-the-card-later`. Update `wiki/development/memory.md`: the open-app key bullet (refused once the app has a sign-in, removed by the rerun) and the background-run line (your own runs only).

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Memory guards hold against crafted searches, old keys and future dates` entry to `CHANGELOG.md`. Its **Updating.** note, in plain words, says: before publishing, the admin runs `memory.mjs migrate` once, which records who wrote each background run; if memory still used an old key on a private app, it now asks for the company sign-in, and `memory.mjs migrate-people` gives waiting notes to their people.
- [x] 4.2 Make the **Updating.** note match the review fixes: runs saved before the update reach no one, so everyone's run line, a schedule's too, is empty until their next run; a copy that skips `migrate` keeps searching and saving, but its start-of-chat summary and background-run records fail until the admin runs it.

## 5. Verification

- [x] 5.1 Run `node --test scripts/tests/memory-worker.test.mjs scripts/tests/memory-store.test.mjs scripts/tests/dream.test.mjs scripts/tests/provision.test.mjs` and fix what fails.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, context measure, retired names) and fix what fails.
- [x] 5.3 As the admin, run `node .claude/skills/memory/scripts/memory.mjs migrate` from this branch against the live store before `/ship` merges (staging serves no memory, so the preview can't show it), and confirm `0009` is recorded.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 893 -->
## ADDED Requirements

### Requirement: Going private turns the open-site memory key off

When a provisioning run leaves an install private and the setup computer still holds the open-site memory key, it SHALL turn every memory key off and remove the key from `.env`, and its report SHALL say memory now uses the company sign-in. A run that leaves the install open SHALL keep the key.

#### Scenario: The card is added later

- **WHEN** an install set up open until the card is provisioned again after the card is added, and the private login comes on
- **THEN** `.env` holds no memory key, the store holds no working key, and the report says memory uses the company sign-in

#### Scenario: Still waiting for the card

- **WHEN** provisioning runs again while Zero Trust still wants a payment method and the install stays open
- **THEN** the admin memory key stays in `.env` and keeps working

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/memory/spec.md utf8 4087 -->
## ADDED Requirements

### Requirement: A hand-written read cannot widen the word search

The Worker SHALL check every member, reader, or schedule word search against only the facts that caller may see, however the read is written. No comment, quoting, column list, or nested table of the caller's own SHALL replace that list, and a read SHALL NOT learn whether, where, or in what words a hidden fact matches.

#### Scenario: A read wraps the search in a table of its own

- **WHEN** a member sends a word search for `salary` inside a read that defines its own `facts` table, with a comment or quotes around its name, and a teammate's private `user` fact holds that word
- **THEN** the Worker either refuses the read or returns no id of that fact

#### Scenario: An ordinary search

- **WHEN** a member searches for a word in a shared project fact
- **THEN** the search returns that fact, as before

### Requirement: A background run's record reaches only its own person

The Worker SHALL store each background-run record with the person who sent it, taken from the sign-in, never from the request. The digest's run line, when consolidation is next due, and a non-admin's hand-written reads of run records SHALL come only from the current person's own runs. A run record saved before records carried their writer SHALL reach no one's digest or consolidation clock, a cloud schedule's included. The run line SHALL be one line, bounded in length, and counted within the digest's line and byte caps. A malformed run record SHALL leave out the run line, never fail the digest.

#### Scenario: A reader writes a run record with fake headings

- **WHEN** a reader records a run whose reason holds several lines, including a `## Live facts` heading, and a member then starts a chat
- **THEN** the member's digest shows none of that text, and the reader's own digest shows it as one shortened line

#### Scenario: A teammate reads the run records

- **WHEN** a reader sends a hand-written read of every run record's host and reason
- **THEN** only the reader's own records come back

#### Scenario: A run record from before the update

- **WHEN** memory holds a run record saved before records carried their writer, dated 2999-12-31, and a cloud schedule starts a chat
- **THEN** the schedule's digest shows none of it, and the record doesn't put the schedule's consolidation off

#### Scenario: A run record that cannot be read

- **WHEN** the person's newest run record has counts that are not valid JSON
- **THEN** the digest builds with no run line, the background run still starts, and the memory stats count that run as merging nothing

### Requirement: An open-site memory key stops once the app has a sign-in

The Worker SHALL refuse every memory key while it has a company sign-in configured, whatever the key's stored expiry. It SHALL treat a key whose expiry is set but cannot be read as expired. While the app is open with no sign-in, the setup computer's admin key SHALL keep working with no renewal.

#### Scenario: A copied key after the app went private

- **WHEN** someone sends the old open-site key to the memory route of an app that now has a sign-in
- **THEN** the Worker answers 401 and returns no fact, session, or transcript

#### Scenario: An app still open

- **WHEN** the admin key is used on an app with no sign-in yet
- **THEN** memory answers as the admin, as before

### Requirement: A fact's time is the store's time

For a member, reader, or schedule, the Worker SHALL store a fact dated later than its own clock, or not written as a plain UTC timestamp, with its own time instead. An earlier plain UTC timestamp SHALL be kept, so a restated fact keeps its original date. A memory admin's dates SHALL be stored as sent.

#### Scenario: A teammate dates a fact in the future

- **WHEN** a member saves a fact dated 2999-12-31, or dated `Tue Oct 20 2026`
- **THEN** it is stored with the time the Worker received it

#### Scenario: A re-tag keeps the date

- **WHEN** a member re-tags their own fact from last month
- **THEN** the new fact keeps last month's date

<!-- end specs/memory/spec.md -->
<!-- file specs/wiki-dream/spec.md utf8 1024 -->
## ADDED Requirements

### Requirement: A dream's record cannot be dated ahead

When it finds the last dream and each page's last check, a dream SHALL ignore a dream record dated in the future or not dated as a plain UTC time, and one that claims to have read a fact written after the record itself. A teammate's honest dream record SHALL still count.

#### Scenario: A forged record from the future

- **WHEN** memory holds a dream record dated 2999-12-31 that claims to have read up to fact #999999999, beside a real dream from 2026-10-01
- **THEN** the next dream starts from the 2026-10-01 dream and reads the facts added since it

#### Scenario: A record with a date in another form

- **WHEN** memory holds a dream record dated `Tue Oct 20 2026`, or `zzzz`, beside a real dream from 2026-10-01
- **THEN** the next dream starts from the 2026-10-01 dream

#### Scenario: A teammate's dream

- **WHEN** a teammate ran a dream yesterday and the owner runs one today
- **THEN** the owner's dream starts from the teammate's

<!-- end specs/wiki-dream/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-21

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 72840 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-21-tighten-memory-guards</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-10-21-tighten-memory-guards">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-21-tighten-memory-guards</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The Cloudflare security check found four gaps in the team memory's guards, each reproduced with dummy data. A teammate with the lowest access can work out the words in someone else's private notes. They can also put fake text into everyone's start-of-chat summary. An old setup key keeps full memory access after the app goes private. And a teammate can backdate the record that tells the next wiki tidy-up where to start, so it skips new notes. Each is a small, local fix.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A search can't reach notes you aren't allowed to see.</b> Memory search only ever looks through the notes you may read: shared team notes and your own. Today a hand-written search can swap that list for one it makes up, then probe word by word what another person's private notes say. After this change, the list the search checks can't be replaced, however the search is written.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-1-picture-1" tabindex="0" style="width:14.385em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 187 281" width="187" height="281" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_q_f_0"><path d="M73.72,56L73.72,122"/><path class="pele-marker" d="M73.72,129L70.36,121L77.08,121Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_f_s_0"><path d="M93.14,177L93.14,218"/><path class="pele-marker" d="M93.14,225L89.78,217L96.5,217Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_q_f_2"><path d="M120.57,56L120.57,122" stroke-dasharray="3 4"/><path class="pele-marker" d="M120.57,129L117.21,121L123.93,121Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_q_f_2"><rect x="83.72" y="78.5" width="73.7" height="21" rx="3" fill="var(--_bg)"/><text x="120.57" y="93.9" text-anchor="middle">can't swap</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="q" transform="translate(93.14,32)"><rect x="-48.68" y="-24" width="97.36" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">a search</text></g><g class="pele-node pele-shape-rect" data-id="f" transform="translate(93.14,153)"><rect x="-85.14" y="-24" width="170.29" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">notes you may see</text></g><g class="pele-node pele-shape-rect" data-id="s" transform="translate(93.14,249)"><rect x="-61.57" y="-24" width="123.14" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">word search</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Your start-of-chat summary shows only your own background run.</b> Its line about the last background save now comes only from your own sign-in's runs. It is always one short line inside the summary's size limit. A broken run record is skipped instead of blanking the summary. When your next tidy-up of memory is due is counted from your own runs too, so someone else's record can't put it off.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>Today</th><th>After</th></tr></thead><tbody><tr data-note="item-2-row-1" tabindex="0"><td>Whose run shows</td><td>the newest from anyone</td><td>yours</td></tr><tr data-note="item-2-row-2" tabindex="0"><td>A long or multi-line reason</td><td>printed as is</td><td>one line, cut short</td></tr><tr data-note="item-2-row-3" tabindex="0"><td>A broken run record</td><td>the summary fails</td><td>that run line is left out</td></tr></tbody></table></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The setup key stops working once the app has a sign-in.</b> An app set up before its card was added gets a memory key with full access, saved on the setup computer. Once the app goes private, the memory store refuses that key, and memory uses each person's company sign-in instead. Rerunning setup after adding the card also turns the key off and removes it from the setup computer. Turning the key off can't be undone: a new one is only made for an app that is open again.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:17.077em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 222 352" width="222" height="352" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_open_card_0"><path d="M110.94,56L110.94,97"/><path class="pele-marker" d="M110.94,104L107.58,96L114.3,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_card_off_0"><path d="M110.94,152L110.94,193"/><path class="pele-marker" d="M110.94,200L107.58,192L114.3,192Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_off_signin_0"><path d="M110.94,248L110.94,289"/><path class="pele-marker" d="M110.94,296L107.58,288L114.3,288Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="open" transform="translate(110.94,32)"><rect x="-91.37" y="-24" width="182.74" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">open app: key works</text></g><g class="pele-node pele-shape-rect" data-id="card" transform="translate(110.94,128)"><rect x="-102.94" y="-24" width="205.87" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">card added, setup rerun</text></g><g class="pele-node pele-shape-rect" data-id="off" transform="translate(110.94,224)"><rect x="-90.48" y="-24" width="180.96" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">key off and removed</text></g><g class="pele-node pele-shape-rect" data-id="signin" transform="translate(110.94,320)"><rect x="-76.24" y="-24" width="152.48" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">company sign-in</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A note's date is the date it was saved.</b> A teammate or a cloud schedule can no longer give a note a future date. A date ahead of the store's clock becomes the time it was saved. A re-tagged note keeps its original, earlier date. The wiki tidy-up also ignores a record of its last run that is dated in the future, or that claims to have read notes written after it.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> the per-machine memory rework in the &quot;installation-owned-memory-devices&quot; workspace, which retires hand-written memory reads entirely; this change fixes today's code so the gaps close now. The author name a teammate puts on a note stays theirs to set: it only labels the note and never decides who owns it. The other parts of the security check each have their own workspace.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: fix the search with reserved shadow names the caller can't define, and rewrite the shared search fragment onto them at the Worker, not by widening the text guard, because the security check showed text guards miss comments and quoting, while a name the caller can't write can't be rebound.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: keep the existing guard against a read's own <code>facts</code> table as an extra refusal, because its tests pass and the other workspace deletes the file anyway.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: keep the client's search fragment text unchanged and rewrite it at the Worker, because computers that haven't updated still send today's text, and the admin's unshadowed reads need the plain names.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: scope the run line and the consolidation clock to the caller's own runs, not &quot;own or the admin's&quot;, because the client can't tell which subject is an admin's, and the other workspace scopes both per machine.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: add a <code>runs.owner_subject</code> column with a migration, because no existing column can say who wrote a run; it is additive, so the admin applies it before publishing and no chat loses its summary in between.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: skip route-side length and format checks on run rows, because once a run reaches only its writer and the digest never throws, a bad row only affects the person who wrote it.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: refuse every memory key at the Worker while it has Access ids, not only those without an expiry, because the spec already says no key is accepted after the move to people, and this repo's live store turned its keys off on 2026-10-14.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the rerun runs <code>migrate-people</code> to turn keys off, not a new command, because it already expires every key once the install record has a sign-in and reports notes waiting for an owner.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: replace a future fact date with the Worker's time and keep past dates, because re-tagging restates a note with its original date and a clock a few seconds ahead shouldn't fail a save.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: leave the author label caller-set, because the request named only the date, the label grants no ownership by spec, and pinning it would change how teammates' git emails show.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: drop the check's suggestion that a dream's body date equal its saved day, because the dream writes its own date, which can differ from the store's UTC day near midnight and would hide an honest dream.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the full-text rank's corpus-wide statistics stay out of scope, because they predate this finding, give no note's words, and go away with the other workspace's fixed reads.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-21</p>Asked whether a teammate's hand-written lookups should also see only their own background-run records, now that each record names its writer → chose to hide others' records from those lookups too.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-21</p>Assumed: the after-publishing live check (admin search and digest, an old key refused, a teammate search on the live store) runs after <code>/ship</code> merges and is reported there, not kept as a task, because the archive takes only finished tasks and the check needs the published Worker. <code>migrate</code> was run on the live store before merging and recorded <code>0009</code>.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Archive checkpoint: built; the second look found three fixes (the dream accepted non-UTC or unreadable dates, old unowned runs reached every schedule, and a teammate could read everyone's run records), all fixed with tests, the last by the person's choice; 228 tests and the local checks pass; <code>0009</code> applied to the live store before merging; archived for ship as 43.20.0.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Renumbered 43.21.0: two other releases reached main first (43.19.1, 43.20.0).</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Renumbered 44.1.0 after main's deploy recovered at 44.0.2; merged main's split of preview sign-in (both cloudflare-provisioning requirements and both provision test changes kept).</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-21</p>Renumbered 44.2.0 after main's deploy-key fix (44.1.0) landed; the preview build's staging auth failure was that change's to fix.</li>
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
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line or picture to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: 'Change #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    const row = el.tagName === 'TR', cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c)
      : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); }).join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
