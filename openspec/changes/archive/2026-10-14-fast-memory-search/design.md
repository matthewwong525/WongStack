# Design

## Context

Every full-text read joins `FTS_HITS` (`.agents/skills/memory/worker/statements.mjs:91`):

```sql
(SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts))
```

For a member, reader or schedule, `facts` there is the shadow CTE from `shadowCtes`, so the `IN` is the privacy filter. `readRefusal` strips `FTS_HITS` by exact text and refuses any other mention of `facts_fts`.

SQLite offers the `rowid IN (…)` term to FTS5 as a usable constraint. The planner takes it: `EXPLAIN QUERY PLAN` shows `SCAN facts_fts VIRTUAL TABLE INDEX 32:=M1` plus `USING ROWID SEARCH ON TABLE facts FOR IN-OPERATOR`. FTS5 is then filtered once per id in the list, and each filter re-evaluates the whole MATCH. The cost grows with facts × terms, and rank can no longer come in index order (`USE TEMP B-TREE FOR ORDER BY`).

Measured locally on SQLite 3.51 (`node:sqlite`), 1,700 facts, 24-term OR MATCH, the `gateFacts` neighbour query:

| Fragment | Admin | Member (shadow) | Same rows |
|---|---|---|---|
| `rowid IN (…)` today | 4,446 ms | 3,880 ms | yes |
| `+rowid IN (…)` | 11 ms | 12 ms | yes |
| no filter | 11 ms | 11 ms | yes |

## Goals / Non-Goals

**Goals:** one MATCH per query; the privacy filter stays inside `FTS_HITS`; old clients keep working.

**Non-Goals:** changing `ftsQuery`, ranking, limits, or the client timeout.

## Decisions

1. **Use `SELECT +rowid AS rowid, … AND +rowid IN (SELECT id FROM facts)`.** A unary `+` makes each term an expression the planner can't hand to the virtual table, so FTS5 runs MATCH once (`INDEX 32:M1`) and the `IN` is checked per hit against a list built once (a bloom-filtered list subquery for the shadow). The filter keeps its place and its meaning, so the privacy argument is unchanged. The `+` on the selected `rowid` matters too: with the live schema's `facts_live` index the planner otherwise drives from `facts f` and pushes the join's `hits.rowid = f.id` into FTS5 as `:=M1`, 2.7 s on the 1,700-fact copy; with both it is 11 ms. Alternatives: an `EXISTS` or outer-query filter would move privacy out of the one shared fragment the Worker trusts; dropping the filter relies on every caller's join, which `readRefusal` can't check.
2. **Accept the previous fragment for now.** `readRefusal` strips both the new `FTS_HITS` and a `LEGACY_FTS_HITS` constant holding the old text. The Worker ships with the app, while branches and worktrees still send the old text; refusing it would break their search and their save gate. The old text is equally private, only slow. Retire it in a later major change.
3. **Guard with the plan, not the clock.** A test runs `EXPLAIN QUERY PLAN` on a `FTS_HITS` join in the test database and asserts a `facts_fts` line runs MATCH alone (`:M`) and none carries a `=` rowid constraint (`:=M`). `FOR IN-OPERATOR` is not a signal: the fast admin plan keeps it, checking the list once per hit. A timing test would be flaky.

## Risks / Trade-offs

- [D1's SQLite plans differently from local] → Cloudflare D1 runs a recent SQLite with the same FTS5 `xBestIndex`; the `+` rule is core SQLite. The acceptance task checks the live store after shipping.
- [A future edit drops the `+`] → the plan test fails.

## Migration Plan

Ship as a patch. The Worker deploys with the app; clients update by `/wong-sync` or a branch update. Rollback is reverting the one line; no data changes.

After the live deploy, time one long `memory.mjs search`, then send the waiting spooled facts (`memory.mjs put-facts --spooled <file>`): the search answers in under a second and a 3-fact save fits the 15-second wait. Memory is live-only, so this runs after publishing, not on the preview.
