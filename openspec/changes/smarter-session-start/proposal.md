# Load what matters at session start, and look up the rest

**Status:** in-progress

**Branch:** check-memory-org

**Open questions:** none

## Why

Whatever the briefing loads at the start of a chat stays in the assistant's view for the whole chat. It can't forget it. Today most of that space goes to unrelated "check this next time" notes from other work. On 2026-10-01 the briefing held 8 of them (about 60% of its room), 5 of your 65 preferences, and no decisions at all, while the question was about memory. The assistant can't know the task before you type it, so the start should hold only what is always true, and the assistant should look the rest up once it knows what you want.

## What Changes

- **The briefing loads only what always applies.** Open questions on other work leave the briefing. One line says how many wait on each step, such as plan 3 or save 5. Open questions on the work you're on still come first. Your own wiki page comes next, then your newest preferences, then decisions.
  ```text
     BEFORE                   AFTER
  ┌──────────────────┐   ┌──────────────────┐
  │ Memory digest    │   │ Memory digest    │
  │ thread (yours)   │   │ thread (yours)   │
  │ 8 other threads  │   │ threads by step: │
  │ 79 more threads  │   │  plan 3, save 5… │
  │ feedback (5)     │   │ your people page │
  │                  │   │ feedback (~12)   │
  │                  │   │ project          │
  │ 397 more facts   │   │ N more facts     │
  └──────────────────┘   └──────────────────┘
  ```
- **The assistant looks memory up once it knows the task.** The briefing's first line now tells it to search memory for the task's key terms, in its own words, before acting on anything more than a quick question. It picks the terms and can skip the search for a small request. A search on your raw first message is avoided: on this chat's real messages it loaded unrelated notes.
- **Open questions come back when their moment comes.** Almost every open question already says when to check it: "check the next real /plan", "check the next sync". Each one is now tagged with that step. The briefing lists how many wait on each step. When a step starts, the assistant loads just that step's questions, so `/plan` sees its 3 notes, not all 87.
  ```text
  open question ──tag──▶ plan
                         │
     you run /plan ──────┘
         │
         ▼
     its 3 notes load, the
     other 84 stay put
  ```
- **Open questions still get closed.** A note on other work still closes when a later save answers it, because the save check already lists the open questions it matches.

Non-goals: loading memory automatically from your first message; a model picking the briefing; backlinks between facts; a graph database; any change to how facts are stored.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: the session-start digest drops other changes' threads for per-verb counts, adds the current person's `wiki/people/` page, and its header tells the agent to search memory once it knows the task and to load a verb's threads when the verb starts; a thread carries the tag of the verb whose next run should check it.

## Impact

- `.agents/skills/memory/scripts/lib/digest.mjs`: drop the other-slug thread statement and `THREAD_CAP` / `THREAD_MAX_AGE_DAYS`; count other-slug threads per verb tag for one pointer line; add the people page section with its own byte cap; reword the header.
- `.agents/skills/memory/references/writing-facts.md`, `.agents/skills/memory/SKILL.md`: a thread takes its verb's tag; consolidation restates an untagged thread with one.
- `scripts/tests/memory-store.test.mjs`, `scripts/tests/memory-capture.test.mjs`: digest coverage.
- `wiki/development/memory.md`: *When memory loads*, *Consolidation*.
- `CHANGELOG.md`: a `## Next (minor)` entry. No migration, schema, Worker, or hook change; `AGENTS.md` is unchanged.

## Decision log

- **2026-10-01** — Asked which approach to selecting memory to explore → load after the first message, over usage tracking or backlinks.
- **2026-10-01** — Asked which version to plan after a test showed keyword search on raw first messages loads unrelated facts → a search rule the agent follows with its own terms, plus a smaller start.
- **2026-10-01** — Asked whether to stop showing other changes' open threads at session start → drop them, reversing the cap of 8 shipped on 2026-09-30 in tidy-open-threads.
- **2026-10-01** — Asked whether to load the person's wiki people page at start → yes, followed by the newest feedback facts.
- **2026-10-01** — Assumed: the search rule lives in the digest's header line, not in `AGENTS.md`, because the always-loaded instructions sit at their 2,200-word ceiling, the digest is outside that count, and it loads in every Claude and Codex session anyway.
- **2026-10-01** — Assumed: a one-line count of other changes' open threads stays, so they remain one search away.
- **2026-10-01** — Asked, after researching graph engineering, which fix to take next → add trigger links to this plan: each open thread is tagged with the verb whose next run should check it, and that verb loads its threads. Ruled out from the research: a graph database (a second store, as Memanto was on 2026-09-30) and running the verbs as code-driven agent graphs (written procedures are the recommended default).
- **2026-10-01** — Assumed: the trigger is the existing topic tag named after the verb (`plan`, `save`, `ship`, `sync`, `setup`…), not a new `on:` namespace, because most already exist and writers use them (`plan` 13 facts, `ship` 15, `verify` 16); a thread about a verb is checked on its next run.
- **2026-10-01** — Assumed: the verb loads its threads by a digest line telling the agent to run `search --type thread --tag <verb>` when the verb starts, not by a line in each skill, because skill text is at its measured baseline and the digest reaches Claude and Codex alike.
- **2026-10-01** — Assumed: existing untagged threads get a tag when consolidation restates them, not through a new tag-only write, because a new write needs a Worker change and members can rewrite only their own facts.
- **2026-10-01** — Assumed: the people page gets at most 1.5 KB of the digest's 6 KB, with a line pointing to the full page when cut, so preferences and decisions keep room as the page grows.
- **2026-10-01** — Assumed: checkpoint for gate task 1.2: the digest code (1.1) and its tests are written and pass locally; this save runs CI. `personalFilter` now takes the already-read people page, and the left-out count includes other changes' unlisted threads.
