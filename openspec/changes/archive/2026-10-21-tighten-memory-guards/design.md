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
