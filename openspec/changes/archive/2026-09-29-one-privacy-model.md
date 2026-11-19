<!-- openspec-archive v1 2026-09-29-one-privacy-model -->
<!-- file proposal.md utf8 7681 -->
# Memory stays in its own repo, with one rule for who sees it

**Status:** ready-to-ship
**Branch:** team-memory-segmentation
**Open questions:** none

## Why

"Private" in memory means four different things today: personal facts hidden only by your own computer, a read-only teammate's facts, private life sent to a special home repo, and a `#private` word that stops a chat being saved. Repos already keep memory apart, so a special home on top of that adds a second system without a second need. And the "hidden" part isn't really hidden: any teammate can show your preferences with one flag.

## What Changes

- **Each repo's memory is its own.** Nothing is sent from one repo to another, and nothing loads from another repo when a chat starts. Home becomes an ordinary repo you happen to use alone: setup no longer asks whether a repo is your home, and nothing records one on your computer.
  ```text
  before                      after
  ┌───────────┐   ┌──────┐    ┌───────────┐ ┌──────┐
  │ work repo │──▶│ home │    │ work repo │ │ home │
  │           │◀──│      │    │  memory   │ │memory│
  └───────────┘   └──────┘    └───────────┘ └──────┘
  private life goes home,     nothing crosses
  your likes come back
  ```
- **Inside a repo, two levels: the team, or only you.** The memory page gets one table of what each person can see. Every other page links to it instead of restating it.
  ```text
  ┌─────────────────────┬─────┬───────────┬───────┐
  │ what                │ you │ teammates │ admin │
  ├─────────────────────┼─────┼───────────┼───────┤
  │ decisions, open     │ yes │ yes       │ yes   │
  │ questions, links    │     │           │       │
  │ about you: likes,   │ yes │ no        │ yes   │
  │ habits, your life   │     │           │       │
  │ a read-only         │ yes │ no        │ yes   │
  │ teammate's facts    │     │           │       │
  │ your chats          │ yes │ no        │ yes   │
  └─────────────────────┴─────┴───────────┴───────┘
  ```
- **"Only you" becomes a real lock.** Today your computer hides a teammate's personal facts, and one flag shows them. After this, the server itself keeps them back, however a teammate asks. The admin still sees everything, as before. In a repo only you use, you are the admin.
- **`#private` goes away.** Typing it no longer stops a chat being saved. Chats already marked private stay unsaved.
- **What this costs you.** Your preferences no longer follow you from one repo to another: each repo learns them on its own. Something personal you say in a work chat stays in that work repo, where the admin can read it. For anything you want no one else to see, use a repo only you use.
- **The browser pages move.** Saved logins, pictures of the browser, and handing the browser over lived on the home page. They move to their own page, unchanged.

Non-goals: no change to who reads chats, no new kind of fact, and nothing already in a home store is moved or deleted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: the Worker enforces the team's personal-fact and reader-fact filters for member and reader keys; `--everyone` widens only the admin's view; the home digest part, private-life routing to home, and the `#private` marker are removed.
- `install-onboarding`: setup no longer asks for or records a home.
- `knowledge-center`: private life goes only in a repo no one else reads, with no named home.
- `workspace-cleanup`: `/close` skips uploading only a session an earlier version recorded as private; no word in a message keeps it out.

## Impact

- `.agents/skills/memory/worker/memory-worker.mjs`, `worker/statements.mjs`: member and reader reads see only facts they may see; a role header.
- `.agents/skills/memory/scripts/memory.mjs`, `scripts/lib/digest.mjs`, `scripts/lib/store.mjs`, `scripts/lib/transcripts.mjs`: drop `--home`, the machine record, the From home digest part, `isPrivate`, and the `private` run count.
- `.agents/skills/memory/SKILL.md`, `references/writing-facts.md`, `.agents/skills/wong-setup/SKILL.md`, `.agents/skills/wong-sync/references/payload-manifest.md`.
- Wiki: `wiki/development/memory.md` (the table), `wiki/development/home.md` removed and its browser sections moved to `wiki/development/browsing.md`, links updated in `AGENTS.md`, `README.md`, `wiki/wiki-style.md`, and the rest.
- Tests in `scripts/tests/memory-*.test.mjs` and the memory test harness.
- A payload release: a `CHANGELOG.md` entry, and retired names in `scripts/retired-names.json`.

## Decision log

- **2026-09-29** — Asked where facts about you should live → chose keep today's split: work preferences stay in the team store.
- **2026-09-29** — Asked what happens for someone with no home → chose fall back to the team store, hidden from teammates; superseded by per-repo memory below, where no one has a home.
- **2026-09-29** — Asked whether a work preference shows in your other repos → chose only where it came from.
- **2026-09-29** — Asked what the plan covers → chose the table, the real lock, and removing `#private`.
- **2026-09-29** — Asked how strictly memory stays in its own repo → chose fully separate: nothing sent to home, nothing loaded from home.
- **2026-09-29** — Assumed: sessions already recorded as private stay unsaved and keep their status, because un-marking them would upload chats someone asked to keep out.
- **2026-09-29** — Assumed: the server matches "your own" facts on the key's email only, because it can't trust a people page from a branch; since keys exist, every member fact is written under the key's email anyway.
- **2026-09-29** — Assumed: `--everyone` stays and widens only the admin's view, because a member's flag would now do nothing.
- **2026-09-29** — Assumed: no store migration, because the lock uses columns every store already has, and a store before the reader schema has no reader facts to hide.
- **2026-09-29** — Assumed: the browser sections move to a new `browsing.md` page, not stay on a page named Home, because home no longer means anything special.
- **2026-09-29** — Assumed: the wiki's private-life rule becomes "only in a repo no one else reads", because a shared repo's wiki is readable by the team through git.
- **2026-09-29** — Assumed during the build: the `workspace-cleanup` spec's `/close` transcript rule also drops `#private`, because it restated the marker this change removes, and a stale spec would keep naming a retired word.
- **2026-09-29** — Assumed during the build: a member read may not name `sqlite_dbpage` either, because raw database pages would get round the lock as a schema-qualified name does.
- **2026-09-29** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: a member read that defines its own `facts` or `fact_tags` CTE, at any depth, is refused, because a nested one would replace the filtered facts inside the search fragment.
- **2026-09-29** — Archive checkpoint: all tasks done and archived by `/ship`; released as 27.0.0.

<!-- end proposal.md -->
<!-- file design.md utf8 5746 -->
# Design

## Context

See proposal.md for why. Today a member or reader key may run any plain read (`memberRefusal` in `worker/statements.mjs` passes every `SELECT`/`WITH` with no write word), so the team filter lives only in the client's `personalFilter` (`scripts/lib/digest.mjs`), and `--everyone` drops it. Writes are already locked by shape. Home is reached through `~/.wong-stack/machine.json` (`machineFile` in `scripts/lib/store.mjs`), the `--home` flag on `search`, `show`, `gate`, and `put-facts`, and the digest's From home part. `#private` is `isPrivate` in `scripts/lib/transcripts.mjs`, checked in capture and `keep-transcript`.

## Goals / Non-Goals

**Goals:**
- A member or reader key cannot read a teammate's `user`/`feedback` fact or unshared fact through any read it can write.
- No code path reads or writes another repo's store.

**Non-Goals:**
- Locking the `sessions` table's metadata (branch, machine) from teammates; transcripts are already locked per author.
- A per-person store, or moving existing facts.

## Decisions

### The Worker shadows `facts` for member and reader keys

For a non-admin key in a team, the Worker prefixes each read with CTEs named like the tables, which SQLite resolves before the real tables:

```sql
WITH facts AS (SELECT * FROM main.facts WHERE (type NOT IN ('user','feedback') AND shared = 1) OR lower(author) = ?),
     fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM facts))
```

A read that starts with `WITH` (or `WITH RECURSIVE`) gets these CTEs merged into its own list. On a store before the reader schema (the grant query's fallback shape), the `shared = 1` term is left out, since no fact is unshared there. In a repo that is not a team, nothing is shadowed.

Alternatives: an allowlist of read shapes like the write allowlist, rejected because `search` builds its `WHERE` from a dozen optional filters, so the allowlist would need either a query language or a second copy of the builder. Filtering result rows after the query, rejected because aggregates (`count(*)`) would still leak.

### Only the main schema can bypass a CTE, so a member read may not name it

A schema-qualified name (`main.facts`, `temp.facts`, quoted or not) skips the CTE. The Worker refuses a member read that qualifies any name with `main` or `temp`, before it adds its own prefix. A CTE of the read's own named `facts` or `fact_tags`, at any depth, would stand in for the shadow inside a nested subquery, so the Worker refuses that too. `ATTACH` is already refused as a write word.

### Full-text search goes through one safe fragment

`facts_fts` is an external-content FTS5 table; reading it directly would test words against hidden facts. Both text searches (`search` and the gate's closest matches) change, for every role, to join one exact subquery:

```sql
JOIN (SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts)) hits ON hits.rowid = f.id
... ORDER BY hits.rank
```

`facts` inside it resolves to the shadow, so it matches only facts the key may see, however the outer query uses it. The Worker refuses a member read whose `facts_fts` mentions are not all inside that exact fragment. The fragment lives in `statements.mjs` as a constant the client imports, so the two cannot drift. FTS5's `rank` is `bm25` by default, so ranking is unchanged.

### The Worker names the key's role

The Worker adds `Wong-Memory-Role: admin|member|reader` beside `Wong-Memory-Team`. The client records it with the team flag and shows the digest's "See everyone's" line only to the admin. The client keeps `personalFilter` for every role: for the admin it narrows the default view to their own personal facts across their people-page emails; for a member it narrows nothing the Worker has not already.

### Home and `#private` are removed, not disabled

`machineFile`, `--home`, the From home digest part, home spool handling, and `isPrivate` are deleted, with their tests. The `sessions.status` value `private` and the upsert that keeps it stay, so sessions recorded as private before stay private, and capture and `keep-transcript` still skip a session whose ledger row says `private`. The `private` run count goes.

### The browser sections get their own page

`wiki/development/home.md` holds saved logins, browser pictures, and hand-over, which are machine-wide and never depended on home. They move verbatim to `wiki/development/browsing.md`, whose headings keep their text, so each link changes only its file name. `home.md` is deleted.

## Risks / Trade-offs

- [A teammate on a branch older than this release sends the old `JOIN facts_fts` search] → The Worker refuses it with "update this branch from main to search memory"; the digest, which uses no text search, still loads.
- [A CTE prefix changes a member query's meaning in a way tests miss] → Worker tests run every read the client sends under a member key against a real SQLite with teammates' personal, reader, and shared facts, and assert only visible rows return; plus the bypass reads (schema-qualified, direct `facts_fts`, a fake alias joined to the fragment, `count(*)`).
- [A private-life remark in a work chat now stays in the work store, readable by the admin] → Accepted by the person; the table on the memory page says so.
- [A repo that used home loses preferences in its digest] → Accepted; each repo relearns them.

## Migration Plan

The Worker ships with the app on the merge to `main`; no D1 migration. After `/wong-sync`, an install's machine record is ignored. The changelog's **Updating.** note says the file can be deleted, and that home's facts stay in home. Rollback is reverting the release: the old client and Worker work on the same schema.

<!-- end design.md -->
<!-- file tasks.md utf8 3792 -->
# Tasks

## 1. Memory Worker

- [x] 1.1 In `worker/statements.mjs`, add the shadow CTE builder (with and without the reader schema), the exact full-text fragment constant, and a member read check that refuses `main`/`temp`-qualified names and any `facts_fts` mention outside the fragment; verify with unit tests in `scripts/tests/memory-worker.test.mjs`.
- [x] 1.2 In `worker/memory-worker.mjs`, prefix every member and reader read in a team with the shadow CTEs (merging into a read's own `WITH`), and add the `Wong-Memory-Role` header; verify with worker tests that every read the client sends, under a member key, returns no teammate `user`/`feedback` fact and no reader's unshared fact, and that the admin still sees all.
- [x] 1.3 Add bypass tests: a schema-qualified read, a direct `facts_fts` read, a fake alias joined to the fragment, `count(*)` over the fragment, and an old-style `JOIN facts_fts` search; verify each is refused or returns only visible facts, and the old-style refusal names updating the branch.

## 2. Memory scripts

- [x] 2.1 Switch `search` and the gate's closest matches in `scripts/memory.mjs` to the shared full-text fragment and `hits.rank`; verify existing search and gate tests in `scripts/tests/memory-store.test.mjs` pass unchanged in their results.
- [x] 2.2 Record the role header in `scripts/lib/store.mjs` and show the digest's "See everyone's" line only to the admin in `scripts/lib/digest.mjs`; verify with a digest test for a member and for the admin.
- [x] 2.3 Remove `machineFile`, `--home`, the From home digest part, and home spool handling from `scripts/memory.mjs`, `scripts/lib/store.mjs`, `scripts/lib/digest.mjs`, and the test harness; verify `--home` is an unknown flag and the home tests are gone.
- [x] 2.4 Remove `isPrivate` and the `private` run count, keeping the ledger's `private` status skip; verify a test that a `#private` message is captured and uploaded, and one that a session already recorded private is still skipped.

## 3. Skills

- [x] 3.1 Update `.agents/skills/memory/SKILL.md` (no `--home`, no `private` count, `--everyone` is admin-only) and `references/writing-facts.md` (drop *Private life goes home*); verify `node scripts/measure-context.mjs --check` passes.
- [x] 3.2 Drop the home question and machine record from `.agents/skills/wong-setup/SKILL.md` and the home line from `.agents/skills/wong-sync/references/payload-manifest.md`; verify `grep -rn machine.json .agents` finds nothing.

## 4. Wiki

- [x] 4.1 Add a `## Who sees what` table to `wiki/development/memory.md`, and remove the `#private` lines and the home paragraphs; verify each other page that stated a visibility rule now links to the table.
- [x] 4.2 Move the browser sections of `wiki/development/home.md` to a new `wiki/development/browsing.md` with the same headings, delete `home.md`, and update every link (`AGENTS.md`, `README.md`, `wiki/wiki-style.md`, `wiki/development/README.md`, `wiki/people/`, and the rest); verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Rewrite the private-life rule in `wiki/wiki-style.md` as "only in a repo no one else reads", with no named home; verify it matches the `knowledge-center` delta.

## 5. Release

- [x] 5.1 Add a `## Next (major) — Memory stays in its own repo` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: `#private` no longer works, preferences stop following you from home, `~/.wong-stack/machine.json` can be deleted, and home's facts stay in home; verify the entry sits at the top of the entries.
- [x] 5.2 Retire `development/home.md`, `machine.json`, and `#private` in `scripts/retired-names.json` (allowing the memory spec's `#private` scenario); verify `node scripts/check-retired-names.mjs` and `node scripts/check-openspec-config.mjs` pass.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 320 -->
# Spec Delta

## REMOVED Requirements

### Requirement: Setup records the person's home once per machine

**Reason**: No repo reads or sends memory to another repo, so a recorded home has no use.
**Migration**: Setup stops asking. A `~/.wong-stack/machine.json` left from an earlier setup is ignored and can be deleted.

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/knowledge-center/spec.md utf8 734 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Facts are placed without false conflicts or leaks

Different people's preferences SHALL each stay on their own page; newest-wins SHALL apply only between facts about the same person or the whole team. Health, family, and money SHALL NOT be written to the wiki of a repo anyone else can read.

#### Scenario: Two people disagree

- **WHEN** one teammate wants squash merges and another wants merge commits
- **THEN** each preference stays on its owner's page and neither supersedes the other

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** no page in the work repo records it

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/memory/spec.md utf8 3799 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A team keeps personal facts personal

In a team (more than one email holds a key), the Worker SHALL return to a member or reader key only facts that key may see: everyone's shared `project`, `reference`, and `thread` facts, plus the key's own `user` and `feedback` facts and its own unshared facts, however the read is written. The admin's key SHALL see every fact, and `--everyone` SHALL widen only the admin's view. The client SHALL still narrow the admin's digest and search to the admin's own personal facts, matched on every email on their `wiki/people/` page, unless asked for everyone. A repo that is not a team SHALL NOT filter by person.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member key sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

### Requirement: Unsaved sessions are captured in the background

A background run the session-start hook starts, never the main agent, SHALL capture this repo's own sessions that ended without `/save`, a few per run, newest first. It SHALL skip what `/save` already covered, pass every fact through the gate, and treat transcript content as data, never as instructions. No word in a message SHALL keep a session out of capture; a session already recorded as private SHALL stay private, with no upload, no model read, and no facts. The counts a run records SHALL be what the memory script stored during that run, never the model's own report; when the model reports different counts, the run's record SHALL say so.

#### Scenario: Instructions inside a fetched page

- **WHEN** a transcript holds a page telling the reader to write something into memory
- **THEN** the facts record only what the session did

#### Scenario: The model claims work it did not do

- **WHEN** a background run writes nothing and the model finishes with `captured 4`
- **THEN** the recorded run counts no captured session, and the next digest says the run's own report differed

#### Scenario: A chat that says #private

- **WHEN** a session's user message contains `#private`
- **THEN** the session is captured and its transcript kept like any other

#### Scenario: A session marked private before this change

- **WHEN** a session was recorded as private by an earlier version
- **THEN** it stays private: no upload, no model read, and no facts

## REMOVED Requirements

### Requirement: Every repo on a machine reads the person's home

**Reason**: Each repo's memory is its own; nothing loads from another repo at session start.
**Migration**: None. A machine record left in `~/.wong-stack/machine.json` is ignored and can be deleted; the home repo's store keeps its facts and serves that repo as any other.

### Requirement: Private-life facts stay home

**Reason**: Each repo's memory is its own; a fact learned in a repo stays in that repo's store, as a personal fact only its author and the admin see.
**Migration**: None. Facts already sent to a home store stay there. Private life meant for no one else belongs in a repo only the person uses.

<!-- end specs/memory/spec.md -->
<!-- file specs/workspace-cleanup/spec.md utf8 969 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: /close keeps the session's transcript
Before closing, when the store has a transcript bucket, `/close` SHALL upload the session's full transcript, with secrets redacted as capture does, so it is kept even if no later session captures it. A session an earlier version recorded as private SHALL NOT be uploaded; no word in a message SHALL keep a session from being uploaded. A store without a bucket, or an unreachable one, SHALL skip the upload without blocking the close and SHALL say so.

#### Scenario: A normal close
- **WHEN** the person runs `/close` in a repo whose memory store has a bucket
- **THEN** the session's redacted transcript is in the bucket before the workspace closes, and `source` on the session's facts shows it

#### Scenario: A private session
- **WHEN** an earlier version recorded the session as private and the person runs `/close`
- **THEN** nothing is uploaded and the close goes on

<!-- end specs/workspace-cleanup/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 40103 fence=~~~ -->
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
<title>Review · 2026-09-29-one-privacy-model</title>
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
<body data-change="2026-09-29-one-privacy-model">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-one-privacy-model</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">&quot;Private&quot; in memory means four different things today: personal facts hidden only by your own computer, a read-only teammate's facts, private life sent to a special home repo, and a <code>#private</code> word that stops a chat being saved. Repos already keep memory apart, so a special home on top of that adds a second system without a second need. And the &quot;hidden&quot; part isn't really hidden: any teammate can show your preferences with one flag.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each repo's memory is its own.</b> Nothing is sent from one repo to another, and nothing loads from another repo when a chat starts. Home becomes an ordinary repo you happen to use alone: setup no longer asks whether a repo is your home, and nothing records one on your computer.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">before                      after</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌───────────┐   ┌──────┐    ┌───────────┐ ┌──────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ work repo │──▶│ home │    │ work repo │ │ home │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│           │◀──│      │    │  memory   │ │memory│</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">└───────────┘   └──────┘    └───────────┘ └──────┘</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">private life goes home,     nothing crosses</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">your likes come back</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Inside a repo, two levels: the team, or only you.</b> The memory page gets one table of what each person can see. Every other page links to it instead of restating it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌─────────────────────┬─────┬───────────┬───────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ what                │ you │ teammates │ admin │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">├─────────────────────┼─────┼───────────┼───────┤</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ decisions, open     │ yes │ yes       │ yes   │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ questions, links    │     │           │       │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ about you: likes,   │ yes │ no        │ yes   │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ habits, your life   │     │           │       │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ a read-only         │ yes │ no        │ yes   │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│ teammate's facts    │     │           │       │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ your chats          │ yes │ no        │ yes   │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">└─────────────────────┴─────┴───────────┴───────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>&quot;Only you&quot; becomes a real lock.</b> Today your computer hides a teammate's personal facts, and one flag shows them. After this, the server itself keeps them back, however a teammate asks. The admin still sees everything, as before. In a repo only you use, you are the admin.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b><code>#private</code> goes away.</b> Typing it no longer stops a chat being saved. Chats already marked private stay unsaved.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>What this costs you.</b> Your preferences no longer follow you from one repo to another: each repo learns them on its own. Something personal you say in a work chat stays in that work repo, where the admin can read it. For anything you want no one else to see, use a repo only you use.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The browser pages move.</b> Saved logins, pictures of the browser, and handing the browser over lived on the home page. They move to their own page, unchanged.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to who reads chats, no new kind of fact, and nothing already in a home store is moved or deleted.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked where facts about you should live → chose keep today's split: work preferences stay in the team store.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked what happens for someone with no home → chose fall back to the team store, hidden from teammates; superseded by per-repo memory below, where no one has a home.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether a work preference shows in your other repos → chose only where it came from.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked what the plan covers → chose the table, the real lock, and removing <code>#private</code>.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked how strictly memory stays in its own repo → chose fully separate: nothing sent to home, nothing loaded from home.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: sessions already recorded as private stay unsaved and keep their status, because un-marking them would upload chats someone asked to keep out.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the server matches &quot;your own&quot; facts on the key's email only, because it can't trust a people page from a branch; since keys exist, every member fact is written under the key's email anyway.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>--everyone</code> stays and widens only the admin's view, because a member's flag would now do nothing.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: no store migration, because the lock uses columns every store already has, and a store before the reader schema has no reader facts to hide.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the browser sections move to a new <code>browsing.md</code> page, not stay on a page named Home, because home no longer means anything special.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the wiki's private-life rule becomes &quot;only in a repo no one else reads&quot;, because a shared repo's wiki is readable by the team through git.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed during the build: the <code>workspace-cleanup</code> spec's <code>/close</code> transcript rule also drops <code>#private</code>, because it restated the marker this change removes, and a stale spec would keep naming a retired word.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed during the build: a member read may not name <code>sqlite_dbpage</code> either, because raw database pages would get round the lock as a schema-qualified name does.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the plan's &quot;run /save&quot; task is dropped, because <code>/ship</code>'s own checkpoint runs CI after the archive.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: a member read that defines its own <code>facts</code> or <code>fact_tags</code> CTE, at any depth, is refused, because a nested one would replace the filtered facts inside the search fragment.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-29</p>Archive checkpoint: all tasks done and archived by <code>/ship</code>; released as 27.0.0.</li>
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
