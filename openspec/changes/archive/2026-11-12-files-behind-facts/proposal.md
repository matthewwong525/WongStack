# Memory shows the files behind each fact

**Status:** ready-to-ship
**Branch:** memory-link-repo-files
**Open questions:** none

## Why

When the AI asks memory about a task, it gets facts and wiki passages, but no files. A fact says what was learned; it rarely says where the code is. Only 173 of 1,361 facts name a file that exists. The AI must then guess where to look, and a wrong first guess costs time. Memory already knows more: most facts belong to a past change, and the repo records each file that change touched.

## What Changes

- **A memory answer ends with a short list of files.** After the facts and passages, the answer lists up to 8 files and docs that those facts are about, each by its full path in the repo, so the AI can open it at once. Each file shows the facts that led to it. The label says it is a place to start, not a full list.
  ```text
  Files (a place to start, not a full list):
  - .agents/plugins/memory/scripts/memory.mjs (#1798)
  - .agents/plugins/memory/scripts/lib/areas.mjs (#1798)
  - scripts/tests/memory-areas.test.mjs (#1798)
  - wiki/development/memory.md (#1798, #597)
  ```
- **The list comes from three places.** One: the files that each fact's change touched. Two: a file the fact names in its own words. Three: when a fact has neither, the docs and code folders of its topic. A file that a fact names, or that several facts share, comes first.
  ```mermaid
  flowchart TD
    F[Facts found] --> C[Each fact's change]
    C --> T[Files it touched]
    F --> N[Files a fact names]
    F --> P[Its topic's docs]
    T --> L[Files list]
    N --> L
    P --> L
  ```
- **A look at one fact or one change shows its files too.** When the AI opens one fact or one past change, it sees the same kind of list for that item. Each file name is a thing the AI can open next, the same way.
- **Nothing is stored, so nothing goes stale.** Memory works the list out on each read, from the repo as it is now. A file that moved since its change shows at its new path. A file that was deleted does not show. No fact changes, and no fact goes to a search engine.
- **It was measured before this plan.** For 56 past changes, memory was asked each change's title, with only older facts. The table shows how often the answer named a file that the change later touched.
  | What the AI sees | Named a right file | Right files per answer |
  |---|---|---|
  | Today: files the facts name | 3 of 39 | 0.1 |
  | A search of file names by the question | 15 of 39 | 1.0 |
  | The Files list | 38 of 56 | 2.5 of 8 |
- **It is a good first place to look, not a full answer.** About 7 of 10 files on it were not touched by the later change, and 1 answer in 3 had no right file. It adds about 0.2 seconds to a read, and up to 0.4 seconds more when it must find files that moved.

**Non-goals:** a search of code by the words of the question; a file link saved on each fact; a change to which facts memory saves; a files list on a topic (a topic lists its changes, and each change lists its files).

## What the build needs

- **Nothing from you.** The build tests with sample facts and a sample repo history. It then repeats the measurement above with the real code.

## Capabilities

### New Capabilities

### Modified Capabilities

- `memory`: a new requirement, *Recall and pull name the files behind facts*: the recall answer, a fact's pull, and a change's pull list the files behind their facts, read fresh, inside the existing size and time limits.

## Impact

- `.agents/plugins/memory/scripts/lib/files.mjs` (new): paths a fact names, the merge of the three sources, the ranking, and the cap.
- `.agents/plugins/memory/scripts/lib/documents/commands.mjs`, `packet.mjs`: recall builds the list from the facts it admits and prints it inside the 6,144-byte packet; JSON gains `files` and `sources.files`, still version 1.
- `.agents/plugins/memory/scripts/lib/pull.mjs`: a `files` group on a change's answer and a fact's answer.
- `.agents/memory/lookup.mjs`, `.agents/memory/profile.mjs`: a new profile part `lookup.files`, which reads the files a shipped change touched from git history, and the paths an active change's plan names.
- `scripts/tests/document-recall.test.mjs`, `scripts/tests/memory-pull.test.mjs`, and a new `scripts/tests/memory-files.test.mjs`; `scripts/tests/manual/files-line-replay.mjs` (new) repeats the measurement.
- `wiki/development/document-retrieval.md`: a section on the list. `wiki/development/memory.md`: the profile table's `lookup` row and the *one lookup* bullet, with an equal cut (the page is at 2,990 of 3,000 words).
- `openspec/specs/memory/spec.md`: the new requirement.
- `CHANGELOG.md`: a `## Next (minor)` entry.
- No new skill text, so the start-up word count stays the same.
- Overlap: the workspaces *Daily becomes a module* and *Access becomes a module* edit `.agents/memory/areas.json`, `session-start.mjs`, and `d1/connect.mjs`; this change touches none of those three files. The `installation-owned-memory-devices` workspace edits memory at its old place. Whichever publishes second catches up.

## Decision log

- **2026-11-12** — Asked whether to plan the Files list alone or with a search of code by the question → chose the Files list alone; the code search waits until the list proves not enough.
- **2026-11-12** — Asked (by Matthew, during planning) whether this helps enough to build → answered with a replay of past changes: the list named a right file for 38 of 56 changes, against 3 of 39 today; planning went on.
- **2026-11-12** — Assumed: the list shows on recall, on a fact's pull, and on a change's pull, not on a topic's pull, because a topic can have 60 changes, and its pull already lists them one step away.
- **2026-11-12** — Assumed: nothing is stored and the list is read fresh each time, because Matthew accepted fresh reads for code links on 2026-10-20 (fact #1787), and a full read here costs 93 ms plus 14 ms a change.
- **2026-11-12** — Assumed: up to 8 files a recall, up to 10 a change, a file named in a fact's words ranked above a file only touched, because that ranking scored best of seven tried (38 of 56, 2.5 right per answer) and the seven differed little.
- **2026-11-12** — Asked whether a file that moved since its change shows at its new path or drops off → chose its new path. Measured: of 8,420 files touched by past changes, 1,638 are gone today and following moves finds 416 of them, for 95–391 ms a read here.
- **2026-11-12** — Asked whether each fact also saves the commit it was written on → chose no: publishing squashes the branch into a new commit, so a saved hash points at a commit main never gets, and the fact's change name already leads to the published commit.
- **2026-11-12** — Assumed: test files stay on the list, because dropping them cut the right files per answer from 2.3 to 2.0.
- **2026-11-12** — Assumed: the list takes at most 600 bytes of the answer's fixed size, given back when unused, because facts and passages are the main evidence and must keep their room.
- **2026-11-12** — Assumed: when the repo history can not be read, the list falls back to the files a change's plan names, then to the fact's own words and its topic, and the read never fails for it, because a repo copied without history must still get an answer.
- **2026-11-12** — Measured after the build with `node scripts/tests/manual/files-line-replay.mjs 60` and the real code: a right file for 42 of 56 changes (75%, the bar is 60%), 2.8 right files per answer of 8, and a median of 306 ms added to a recall (the bar is 700 ms).
- **2026-11-12** — Assumed: `filesBehind` returns the list with a state (`ok`, `empty`, `unavailable`), so recall can say when the history read timed out while it still shows named paths and topic docs.
- **2026-11-12** — Assumed: recall asks for 16 ranked files and shows the first 8 whose facts made it into the answer, so a fact cut for space does not leave the list short.
- **2026-11-12** — Assumed: when holding back room for the list would cost a fact or a passage, recall fills facts and passages first and the list gets what is left, because the spec says the list never pushes one out.
- **2026-11-12** — Assumed: recall now reads its facts with their topic tags, for the topic fallback; the tags do not print.
- **2026-11-12** — Assumed: the `memory.recall` action's output description gains the optional `files` and `sources.files`, and `documents` carries neither, because that description refuses unknown fields.
- **2026-11-12** — Assumed: the memory plugin's version goes from 2.0.1 to 2.1.0, and the two site attachments that cite `wiki/development/memory.md` get today's check date, because their fix is unchanged; the local checks asked for both.
- **2026-11-12** — Assumed: a path through a linked folder shows at its real place (`.claude/skills/memory/…` as `.agents/plugins/memory/…`), so one file never shows twice; it lifted the replay from 39 to 42 of 56.
- **2026-11-12** — Archive checkpoint at `/ship` as 55.1.0: every task done, the second look's two findings fixed and reread clean, local pre-check passed, and the spec delta synced into `openspec/specs/memory/spec.md`; CI decides.
