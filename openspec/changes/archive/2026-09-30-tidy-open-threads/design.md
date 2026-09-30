# Design

## Context

See proposal.md, Why. `digestPlan` in `.agents/skills/memory/scripts/lib/digest.mjs` fetches one ranked list: live facts ordered threads first, then feedback, project, reference, user, `LIMIT 60`. With 80-plus live threads, all 60 rows are threads, so no other type is even fetched, and `buildDigest` fills its 40 lines with them. The current change's threads come from their own statement and go first.

`gateFacts` in `memory.mjs` runs two reads per candidate: live facts on the same slug, and the 5 closest FTS hits on other slugs, of any type. A thread on another slug shows only when it outranks every other type, so a session rarely sees the thread it just answered.

Reads from a member or reader key pass the Worker's `readRefusal`, which allows full-text search only through the shared `FTS_HITS` fragment. Both new reads are plain `facts` reads or use that fragment, so the Worker and its statements do not change.

## Goals / Non-Goals

**Goals:** the digest always leaves room for non-thread facts; the gate puts matching open threads in front of the writer; consolidation closes answered threads. All three hold for every role through the existing personal filter.

**Non-Goals:** a schema change, a migration, a new fact type or status, a Worker change, a model call in the digest.

## Decisions

- **Split the digest's fact query in two.** One statement for other-slug threads: `type = 'thread' AND slug != ? AND created_at >= ?` (cutoff = now − 30 days, as ISO text), newest first, `LIMIT 8`. One for everything else: `type != 'thread'`, same type order, `LIMIT 60`. A count of all live other-slug threads gives the held-back number (count − shown). The current-slug thread statement stays as is. Alternative: keep one query and filter in JS with a bigger `LIMIT` — rejected, because the limit would have to grow with the thread count.
- **Constants `THREAD_CAP = 8` and `THREAD_MAX_AGE_DAYS = 30`**, exported beside `MAX_LINES` for tests.
- **One held-back line** right after the threads section, when any are held back: `N more open threads are not shown. Search them: \`<script> search --type thread\`.` The existing last line still counts every live fact left out. The byte reserve covers both lines.
- **Age by the thread's own `created_at`.** A thread restated by a superseding thread gets a fresh date, which is right: someone re-raised it.
- **Gate: a third read per candidate**, open threads on other slugs matching the candidate's FTS query, `LIMIT 3`, through the personal filter. Print them under `Open threads this may answer:`, skipping any already listed under closest matches. The closing instruction adds: supersede a thread the session answered, with a fact saying what was found. Alternative: have the writer run `search --type thread` for every session — rejected: 80-plus lines per session, and the model has to spot the match itself.
- **Closing stays a supersede.** A member supersedes only their own threads; the script already names the author of any other, which stays live until the author or the admin closes it.
- **Consolidation gets one more clause** in the memory skill's background-run step: supersede an open thread a later live fact shows was answered, from a fact that says so. No code: `live` already lists threads beside the facts that answer them.

## Risks / Trade-offs

- [A long-lived thread falls out of view after 30 days] → it stays live, `search --type thread` and `/continue`'s thread list still show it, and the held-back line points there.
- [Keyword matching misses a paraphrased answer] → consolidation catches it later from `live`; a miss only leaves a thread open, which is today's behaviour.
- [A wrong match closes a thread early] → the writer decides each supersede, and a superseded fact stays searchable with `--all`.
- [Skill text grows] → `measure-context.mjs --check` fails at its baseline; offset any added words by trimming the same files.

## Migration Plan

None: no schema or Worker change. The next session start after the update uses the new digest. Rollback is reverting the release.
