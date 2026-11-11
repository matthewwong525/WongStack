# Memory becomes a web of linked topics that tidies itself each day

**Status:** ready-to-ship
**Branch:** redesign-memory-linked-threads
**Open questions:** none

## Why

Memory holds 1,470 live facts, but a chat sees them as a flat list: the nine newest at the start, and the twenty newest when it asks about a topic. Nothing shows how one topic connects to the next, so the AI can't follow an idea from one place to another. Memory also has four clean-up jobs with three different starts, and the biggest one runs only when you type it. Relay Everything showed a better shape: one daily build, and topic pages that link where ideas connect. This change brings that shape here and goes one step further: every thing in memory becomes a point you can pull, and a helper does the reading.

## What Changes

- **One daily tidy, started by your first chat of the day.** Today four jobs keep memory clean. Now there is one. Your first chat each day starts it in the background, and the chat never waits. It saves what your chats learned, merges facts that say the same thing, puts lasting facts on their topic's page, links topics that connect, and checks three old pages and one spec. Nothing is left to run by hand. It uses your own AI plan and stops its own work after 30 minutes; a wait for the project's checks can add up to an hour, as the Wiki tidy does today. With two computers, only one tidies each day. You stop it by asking any chat, for each computer. This removes the *Wiki tidy* schedule and its run list from your Schedules: it can't be undone.
  ```mermaid
  flowchart TD
    A["First chat today"] --> B["Tidy starts in the background"]
    B --> C["Save what chats learned"]
    C --> D["Merge facts that say the same"]
    D --> E["Put lasting facts on topic pages"]
    E --> F["Link topics that connect"]
    F --> G["Check 3 old pages, 1 spec"]
    G --> H["Publish through the checks"]
  ```

- **Topics link to each other.** Today a topic knows its own page and its own facts. Now plain code finds the topics that share facts or changes, and ranks them. The daily tidy writes a link on the page only where two topics are truly related, with a few words that say how. A fact gets every topic it touches, not only the main one: a shared fact is how two topics find each other. When the tidy makes a new topic, it looks back: older facts that fit get the new topic too.
  ```mermaid
  flowchart TD
    P["people/matthew-wong"] -- "asked for topics" --> M["memory"]
    M -- "the tidy fills its pages" --> D["dream"]
    M -- "facts are stored in" --> C["cloudflare"]
    D -- "writes" --> W["wiki"]
  ```

- **One way to pull a thread.** Today the AI has four commands to look at a topic, a change, a file, or a fact's chat, and each shows a different list. Now one pull works on all of them, and its answer is a small map: what this is, then every thing it connects to, each with a name to pull next. The AI goes deeper on the one line that fits the task and leaves the rest.
  ```text
  pull memory

  memory (topic)
    Facts, capture, the chat start.
  Page     wiki/development/memory.md
           Topics · Who sees what · 10 more
  Links    wiki-dream · memory-search
           document-retrieval · 4 more
  Related  dream (38 shared facts)
           plan (21) · cloudflare (17)
           people/matthew-wong (12)
  Changes  modular-memory-plugin
             (live, 14 facts)
           topics-in-memory
             (talk only, 4) · 9 more
  Open     #2695 the end-of-chat save
             in a headless chat · 2 more
  Likes    #2685 ask once before
             memory setup · 1 more
  Decided  #2682 modules install by
             a pasted message · 4 more
  141 live facts. Pull a name or a
  number above to go deeper.
  ```

- **A helper reads memory, and the chat gets a short brief.** Today the main chat reads memory itself, and every fact it reads stays in the chat. Now, for a task that needs more than one pull, the chat gives the task to a helper. The helper pulls the topics, follows the links that matter, reads the pages and the old chats behind a fact, and answers in about 300 words: what applies, each with its source, the open questions, your preferences, and the threads it did not follow. The main chat decides what to do with it, and can ask the helper to follow one more. In an AI tool with no helpers, the chat follows the same steps itself, with the same limits.
  ```mermaid
  sequenceDiagram
    participant C as Main chat
    participant H as Helper
    participant M as Memory
    C->>H: Task: change sign-in
    H->>M: pull 2 topics, 2 changes
    M-->>H: 40 facts, 3 pages
    H-->>C: 300 words, with sources
  ```

- **A shorter chat start.** Today a chat starts with the nine newest facts, whatever the task is. Now it starts with threads, not facts: your open questions on this work, the topics with the ones that changed lately, your own page, and only the preferences you stated since the last tidy, which are not on your page yet. An older preference is on your page, or under its topic.
  | Today | After |
  |---|---|
  | Open questions on this work | Open questions on this work |
  | Topics | Topics |
  | Your page | Lately: memory 6 · plan 3 · review 2 |
  | Live facts: the 9 newest, on any subject | Your page |
  | 1,364 more not shown | New since the last tidy: 2 preferences |
  | Last run: captured 1, added 6 | Last tidy: 4 facts on 2 pages, 3 links |

- **Fewer parts to keep working.** The old parts that the new ones replace go away.
  | Today | After |
  |---|---|
  | A merge that starts after 24 hours and five chats | A step of the daily tidy |
  | The *Wiki tidy* schedule, checked every 30 minutes | A step of the daily tidy |
  | The big check, only when you type it | A small part each day; typing it still runs a bigger one |
  | Four commands to look at a topic, a change, a file, a fact | One pull |
  | A test-only helper that picks facts under fixed limits | The memory helper |

**Non-goals:** no meaning-based search, no new database table for links, no change to who sees which fact, no change to how a chat is saved when it ends, and no page in the app.

## What the build needs

- **Nothing.** At the end of the build the AI runs one daily tidy for real in this project, on your AI plan, and reads what it changed.

## Decision log

- **2026-11-11** — Asked what the one daily run does → chose all of it, in small parts: save what the chats learned, merge facts, put lasting facts on topic pages, link related topics, and check a few old pages, so nothing is left to run by hand.
- **2026-11-11** — Asked what starts the daily run → chose the first chat of the day; the *Wiki tidy* schedule goes away. This changes the 2026-11-07 choice (all timed work is a schedule in the app) for memory only.
- **2026-11-11** — Assumed: this is one change, not three, because the daily tidy writes the links, the pull shows them, and the helper walks them; one part alone gives the person nothing to see.
- **2026-11-11** — Assumed: the daily tidy stops its own work after 30 minutes, and a wait for the project's checks can add up to an hour (90 minutes in all), because the Wiki tidy schedule has that limit today and a publish can't be cut short safely.
- **2026-11-11** — Assumed: the small part of the big check is three own pages and one spec a day, longest unchecked first, because twenty pages and five specs is a full dream, and three a day covers this repo's own pages in about a month.
- **2026-11-11** — Assumed: one tidy a day for each person, held in the memory store, because each person's tidy changes only their own facts, and two computers of one person would add the same things twice.
- **2026-11-11** — Assumed: a chat end still saves that chat at once, as today, because `/continue` needs a chat's open questions before the next morning.
- **2026-11-11** — Assumed: links between topics are found fresh on each pull and never stored, because on 2026-10-20 Matthew chose fresh reads over a saved index: a saved copy goes stale.
- **2026-11-11** — Assumed: the helper is a page of steps that the chat gives to a helper of its own AI tool, not a named Claude Code agent, because WongStack must not need one chat app, and Codex and Claude Code start helpers in different ways.
- **2026-11-11** — Assumed: the main chat decides when to use the helper, and `/explore` uses it in its memory step, because a search on every message was rejected on 2026-11-05: it costs a second and 6 KB each time.
- **2026-11-11** — Assumed: the experimental extraction helper goes away, because the memory helper does its job with no handles and no fixed byte counts, and its use was never turned on.
- **2026-11-11** — Assumed: the old `areas` and `show` commands stay as other names for the pull, because an installed repo's own skills may call them.
- **2026-11-11** — Assumed: the chat start drops the newest-facts list and keeps only preferences stated since the last tidy, because the tidy puts a lasting preference on the person's page each day, and the page is in the chat start.
- **2026-11-11** — Assumed: the message topic match stays as it is, because it reads only files on this computer and the related topics need the store.
- **2026-11-11** — Assumed: Relay Everything's reader helpers, which read old chats in groups, are left out, because WongStack already reads each chat when it ends, so there is no past to fill in.
- **2026-11-11** — Check: `scripts/tests/memory-extract.test.mjs`, `scripts/tests/memory-extract-ownership.test.mjs` and `scripts/tests/memory-context-evaluation.test.mjs` are removed, because the extraction helper and the evaluation mode they test are removed; a new test checks that the two old commands exit 1 and name the helper page.
- **2026-11-11** — Check: `scripts/tests/memory-capture.test.mjs` loses the test that a consolidation leaves a marker the wiki tidy claims once, because the marker and `wiki-tidy-check.mjs` are removed; `scripts/tests/memory-daily.test.mjs` tests the daily claim in their place.
- **2026-11-11** — Assumed: consolidation runs only in the daily tidy's first part and in a full dream, not after every capture, because the daily tidy is now the one place it is due.
- **2026-11-11** — Assumed: the daily run waits up to 30 minutes for the capture lock before it claims the day, so a capture that holds the lock does not lose the day; a failed first part is logged and the tidy goes on.
- **2026-11-11** — Assumed: the tidy's agent writes its record to a file and the run sends it only after the edits publish, so a stopped tidy sends no record; with no `tidy.publish` line in the profile, the run commits the edits to `daily-tidy-<date>` itself. A new profile key, `tidy.deny`, holds the deny list.
- **2026-11-11** — Assumed: the digest's `daily` answer also carries `reason`, so a failed tidy can say why; a capture that ended well shows no line in the digest.
- **2026-11-11** — Assumed: a pull cuts a fact to 160 characters, and a fact node or `--more` shows it whole; `areas --limit` now caps each group, not all facts.
- **2026-11-11** — Assumed: the pull, related topics and the helper are written up in `wiki/development/memory-search.md`, because `memory.md` is close to its 3,000-word cap; *Link* and *Look back* are parts of the dream's step 5, so the steps keep their numbers.
- **2026-11-11** — Assumed: the retired *Wiki tidy* default keeps its reason in the `retired` list, and that reason is the journal line.
- **2026-11-11** — Assumed: the helper's stop rule counts only names that found a node, and a `--more` read counts as a pull, because the first real run stopped early on two guessed names that matched nothing.
- **2026-11-11** — Asked how to do the real run, because memory works only on the live app and previews have no memory → chose a real tidy on a test copy of memory first, with its edits kept on a local branch, then publish and run the first live tidy right after.
- **2026-11-11** — Assumed: the run sets the tidy record's source itself, as it already drops its session, because a real test tidy wrote a source the store refuses and its record was lost.
- **2026-11-11** — Assumed: the tidy record ends with what it linked, or none and why, because the first real test tidy linked no topics and its record did not say so.
- **2026-11-11** — Archive checkpoint: built, reviewed twice, one real test tidy run, and archived for release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: the pull replaces the area lookup and reads any node; related topics; a fact gets every topic it touches; the memory helper replaces the experimental extraction helper; the chat-start digest changes; consolidation becomes a step of the daily tidy.
- `wiki-dream`: a daily tidy starts on its own at the first chat of the day and replaces the small wiki tidy; it links related topics, looks back for a new topic, and checks a small part each day.
- `memory-plugin`: the plugin starts its own daily tidy from its chat-start hook, with one claim a day and an off switch.
- `daily-routine`: the *Wiki tidy* default schedule and the daily's wiki-tidy job go away.

## Impact

- `.agents/plugins/memory/scripts/`: `session-start.mjs` (the day's start), `run.mjs` (a daily mode in a copy of the repo), `memory.mjs` (`pull`, `related`, `daily`; `areas` and `show` as aliases; `due`, `extract`, `extract-task` removed), `lib/digest.mjs`, new `lib/pull.mjs` and `lib/daily.mjs`; `lib/extract*.mjs` removed.
- `.agents/plugins/memory/`: `SKILL.md`, `README.md`, `references/writing-facts.md`, new `references/recall-helper.md`, `skills/dream-memory/SKILL.md` and `scripts/dream.mjs` (`--daily` replaces `--small`), `store/interface.mjs` and `store/contract.mjs` (the digest answers the day's tidy and tags on its facts).
- `.agents/memory/d1/store.mjs` and the app's memory route: the digest's new fields; one migration if the runs table needs a kind.
- `.agents/skills/daily/`: `references/schedules.json`, `references/briefs/wiki-tidy.md`, `scripts/wiki-tidy-check.mjs` removed; `schedule.mjs defaults` ends a retired default.
- `.agents/skills/explore/SKILL.md`, `.agents/skills/continue/SKILL.md`, `.agents/skills/apply/references/build-helper.md`, `.agents/skills/close/SKILL.md`: name the pull and the helper.
- Wiki: `wiki/development/memory.md`, `wiki-dream.md`, `memory-search.md`, `document-retrieval.md`, `daily.md`, `the-change-loop.md`; `memory-extraction.md` removed; `wiki/stack/host-schedules.md`.
- Tests in `scripts/tests/`: memory topics, areas, capture, dream, schedules; new pull, related, daily and helper tests; the extraction tests and its evaluation mode removed.
- The payload manifest and `CHANGELOG.md`: a major version, because a schedule and two commands are removed.
