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

## When to add embeddings

Search is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *Concise language please* misses a fact that says *The owner wants short replies in plain words*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three; a question that should have matched and didn't belongs there first. That is enough at a few thousand facts: the write gate asks a model about paraphrases, and consolidation merges what it missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.

In WongStack's source repo, the [evaluation runner](https://github.com/matthewwong525/WongStack/blob/main/scripts/evaluate-memory-search.mjs), `node scripts/evaluate-memory-search.mjs [--json]`, ranks the fixture questions against a temporary synthetic store, never a live one. A regression miss, a hidden result shown, or a broken run fails it.

Back to [session memory](memory.md).
