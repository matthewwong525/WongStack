---
name: dream
description: Tidy memory, then bring the wiki up to date from it; only when a person types it. Takes --dry-run.
user-invocable: true
disable-model-invocation: true
---

# /dream

`/dream` authorizes every step, `/ship` included. `D` is `node "$(git rev-parse --show-toplevel)/.claude/skills/dream/scripts/dream.mjs"`; `M` is [memory](../memory/SKILL.md)'s `memory.mjs`. [Wiki dream](../../../wiki/development/wiki-dream.md) owns the why.

1. **Stop** on uncommitted edits, a branch holding a change, or an unreachable store: edit nothing, say why.
2. **Tidy memory** by [consolidation](../memory/SKILL.md#background-run), step 3, skipping `due`.
3. **Gather.** `D since`, then `M search --since <date> --limit 200 --type <type>` for `project`, `reference`, `feedback`. Skip ids up to `after fact`; say when a search hit 200.
4. **Add.** Place each by [placing a fact](../../../wiki/development/wiki-dream.md#placing-a-fact-on-a-page): edit its page, or make the page and its hub line.
5. **Clean.** Take the first twenty `own` pages of `D pages`. Compare each with `M areas <page>`, its linked files, and the other own pages; fix by [keeping it tidy](../../../wiki/wiki-style.md#keeping-it-tidy).
6. **Check sources.** Before replacing or removing a line, read the contradicting fact's `M source <fact-id>`.
7. **Never edit a `shipped` page.** List what belongs on or contradicts one: page and fact.
8. **Publish** an edit: `git fetch origin main`, `git switch -c dream-<date> origin/main`, then `/ship` minus its closing question.
9. **Record** by the write gate on slug `wiki-dream`: a `project` fact tagged `dream`, `Dream <date>: read facts up to #<id>. Checked: <pages>.`, even with no edit; and one `thread` tagged `improve` with step 7's list.
10. **Report** in [plain words](../explore/references/asking-the-user.md#write-in-plain-words): each page changed with its fact, step 7's list, the skipped count.

`/dream --dry-run` runs steps 3 to 7 anywhere, prints each edit with its fact, and writes nothing: no file, no memory.
