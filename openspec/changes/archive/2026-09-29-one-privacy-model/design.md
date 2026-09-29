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
