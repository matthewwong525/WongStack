# Memory search

Memory search finds saved facts by their words and tags, with no model: this page says which read to use, and when keyword search stops being enough. [Session memory](memory.md) owns the store and who sees what.

## Pick a format

Choose one read format per query: `search` for routine recall, `brief` when dates and sources help, `search --json` (version 1: `filters` and `facts`) for scripts. Loading all three repeats the same facts. Each returns 30 facts by default, in the same order, and none reads a transcript.

`memory.mjs brief <terms>` groups current facts as open threads, feedback, decisions, user facts, and references; a filter can stand in for terms: `brief --slug release-window`. Each fact keeps its words, date, author, ID, and sources:

```text
Fact #7 · 2026-10-01T00:00:00Z · author: dev@example.com · session: claude:example
Session evidence stays traceable.
```

A brief takes eight live facts, or up to twenty with `--limit`, whole and in rank order, within 6,144 bytes; the footer counts the ones left out. An unavailable or denied read fails visibly. It calls no model and uses no cache.

A source grants no access: `source <id>` still checks the caller's permissions, and whether the transcript is kept ([without R2](memory.md#without-r2)). Fetch a source only to check a fact, never every citation: one can return 200,000 characters.

## Pull a thread

`memory.mjs pull <name>` reads one point in memory and names each point it connects to. The name is a topic, a repo path, a change, or a fact `#id`. Each group shows three items and counts the rest, and every item is a name you can pull next:

- **A topic**: its page and the page's parts, the pages one link away, [related topics](#related-topics), its changes, open threads, preferences, and decisions.
- **A path**: its areas, docs, the files that link to it, then the topic groups of its areas.
- **A change**: its state, its topics, open threads, newest facts, and its chats.
- **A fact**: its whole text, topics, change, the fact that replaced it and those it replaced, and the other facts from its chat.

An answer stays within 60 lines and 6 KB. `--more <group>` shows one group whole. A name that is no point names the nearest topics and shows no facts. When the store does not answer, the parts from the repo still show. `areas` and `show` are old names for the pull.

### Related topics

`memory.mjs related <topic>` lists the topics that share live facts with a topic, or have facts on the same changes, eight at most, most shared first. Each shows both counts, one sample fact, and whether either page already links the other. Plain code counts them fresh on each read, and nothing is stored, so a list never goes stale. Only a tag with a page counts. A fact that touches two topics carries both, so [write facts](../../.agents/skills/memory/references/writing-facts.md) with every topic they touch. The [daily tidy](wiki-dream.md#the-daily-tidy) reads this list to link topic pages.

### The memory helper

For a task that spans topics, give the task to a helper of your AI tool with [the helper's steps](../../.agents/skills/memory/references/recall-helper.md). It pulls up to three topics, follows only what bears on the task, within 12 pulls, and answers in at most 300 words: what applies with its source, open threads, your preferences, and what it did not follow. Its reads stay out of your chat. With no helper tool, the chat follows the same steps itself. One pull needs no helper.

## How use is counted

Each look-up a chat makes adds one line to a file on your computer, outside git and outside the shared store: a `pull`, `recall`, `search`, `brief`, `related`, or `source`, and each topic the prompt hook adds to a message. A line holds the time, the command, the topics and fact numbers that came back, and the workspace's folder name. It holds a question's words only when the question found nothing, cut to 200 characters. A question also found nothing when no one fact or passage that came back holds half of its main words: a search always returns something, and unrelated facts are not an answer. Lines older than 30 days are dropped.

- **Only a chat's look-ups count.** A background run and [the memory tidy](wiki-dream.md) add no line: only a chat's use says what people need.
- **A count never fails a read.** When the file can not be written, the look-up answers as before.
- **See the counts**: ask *how is memory used?*, or run `memory.mjs usage [--days <n>] [--json]`. It lists the most used topics, the facts returned most, and the questions that found nothing.
- **The tidy reads them** as part of [its map](wiki-dream.md#the-goal-and-the-map): it checks the most used pages first, puts a fact that chats get again and again on its topic's page, links two topics used together, and changes a topic or a page so a missed question finds its answer. A missed question's words never go on a page or in a fact.

The counts are one computer's. With two computers, each tidy sees the counts of the computer it runs on.

## When to add embeddings

Search is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *Concise language please* misses a fact that says *The owner wants short replies in plain words*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three; a question that should have matched and didn't belongs there first. That is enough at a few thousand facts: the write gate asks a model about paraphrases, and consolidation merges what it missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

In WongStack's source repo, the [evaluation runner](https://github.com/matthewwong525/WongStack/blob/main/scripts/evaluate-memory-search.mjs), `node scripts/evaluate-memory-search.mjs [--json]`, ranks the fixture questions against a temporary synthetic store, never a live one. A regression miss, a hidden result shown, or a broken run fails it.

Back to [session memory](memory.md).
