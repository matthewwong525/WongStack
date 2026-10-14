# Memory search is fast again

**Status:** ready-to-ship
**Branch:** fix/memory-search-match-once
**Open questions:** none

## Why

Each word search in memory takes about 6 seconds on the live store, when it should take a fraction of one. Saving facts runs two such searches per fact to show their nearest neighbours, so saving 3 facts takes longer than the 15 seconds the assistant waits. The save then reports *memory store unreachable (timeout)*, and the facts stay waiting on the computer instead of reaching memory. It got slower as memory grew: the search repeats its work once for every fact stored.

## What Changes

- **A search does its work once, not once per fact.** The step that hides other people's private facts stays, and still runs on every search; it just checks the results instead of driving the search. Measured on a copy the size of the live store, a 24-word search drops from about 4 seconds to about 0.01, for the owner and for teammates alike.
  ```text
    BEFORE                    AFTER
  for each of 1,700 facts   search once
      │                         │
      ▼                         ▼
  search everything again   keep only facts
      │                     you may see
      ▼                         │
  keep it if it matches         ▼
      │                     about 0.01 s
      ▼
  about 4–6 s
  ```
- **Saving 3 facts finishes well inside the wait**, so the facts waiting on this computer send on the next save or session start.
- **Teammates still never see each other's private facts.** The same privacy check runs; a test proves it, as before.
- **A computer still on the old version keeps searching**, at the old speed, until it updates, rather than being refused.
- **A check stops this coming back.** It fails if a search ever again repeats its work per fact.
- **One refused past chat no longer stops background memory.** When the store refuses to save one old chat (another person's, or history no one owns), it is skipped and counted, not offered again, and the run carries on.
- **A locked-down assistant can still read this computer's identity file.** Some background runs may not reset the file's permissions; the file is already private, so memory reads on.

Non-goals: changing what a search finds or how results are ordered; making the assistant wait longer; the waiting-notes hand-over, which stays in the original chat.

## Decision log

- **2026-10-14** — Assumed: the cause is how the database runs the privacy filter, not the filter itself, because a local copy of 1,700 facts reproduces it (4.4 s owner, 3.9 s teammate) and its query plan shows the search re-run once per stored fact; marking the filter so it only checks results gives 11 ms with identical results.
- **2026-10-14** — Assumed: teammates are hit too, because the same copy with the teammate privacy view took 3.9 s.
- **2026-10-14** — Assumed: keep the filter inside the shared search piece rather than move it out, because the privacy check rests on that one piece, and a one-character change keeps it whole.
- **2026-10-14** — Assumed: the memory service accepts the old search piece too, because otherwise every working copy not yet updated would have its searches and saves refused once this ships; the old piece is just as private, only slower.
- **2026-10-14** — Assumed: guard it with a check on the query plan, not a timing test, because a timing test fails at random on a busy machine.
- **2026-10-14** — Assumed: mark the returned row number too, not only the filter, because with the live store's index the database otherwise runs the search once per stored fact from the other side (2.7 s on the 1,700-fact copy); with both marks it takes 11 ms and finds the same facts.
- **2026-10-14** — Assumed: the plan check looks only for the search re-run per fact, not for a per-result list check, because the fast plan keeps that cheap check.

- **2026-10-14** — Asked which fix should go live, after finding open pull request #380 with the same search fix plus two more → chose updating #380 instead of publishing this chat's build.
- **2026-10-14** — Assumed: #380's test for a single remaining computer key is dropped, because 43.0.0 removed computer keys; its refused-session check now looks for the sign-in's refusal text instead of the old key's name.
- **2026-10-14** — Assumed: the live timing and the send of the waiting facts run after publishing, not as a build step, because memory is live-only and the faster Worker reaches it only then.
- **2026-10-14** — Archive checkpoint: pull request #380 brought up to date with 43.0.0, every build task ticked, the three memory test files (142) and the local checks passing; numbered 43.0.1 and saved for the check before publishing. The live timing is still to do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: adds *A word search answers quickly*, so a save's neighbour checks fit in the client's wait.

## Impact

- `.agents/skills/memory/worker/statements.mjs`: `FTS_HITS` selects `+rowid AS rowid` and filters with `+rowid IN (SELECT id FROM facts)`; `readRefusal` also strips the previous fragment text.
- `scripts/tests/memory-worker.test.mjs`: the privacy test runs both fragments; a new plan test.
- `.agents/skills/memory/scripts/memory.mjs`, `lib/store.mjs`, `SKILL.md`: `strip` catches a `member_write` refusal, marks the session seen, counts it skipped, and prints `refused:`.
- `.agents/skills/memory/scripts/lib/machine-id.mjs`: a refused `chmod` (`EPERM`, `EACCES`, `EROFS`) no longer throws.
- `scripts/tests/memory-capture.test.mjs`, `scripts/tests/memory-store.test.mjs`: the refused-session and sandbox tests.
- `CHANGELOG.md`: a `patch` entry. No schema, data, or dependency change.
