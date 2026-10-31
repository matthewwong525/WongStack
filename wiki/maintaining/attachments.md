# Attachments

An attachment is a short list a person pastes into their own AI chat, so their AI builds one WongStack fix into the setup they already have. Each one sits as a card on the [landing page](landing-page.md)'s Attachments page, at `wongstack.com/attachments#<slug>`, with a copy button. It is meta-only: no install receives it.

## The file

Each attachment is one file, [`site/attachments/<slug>.md`](../../site/attachments/). The slug is the card's anchor. The page reads every file when the site is built, so it sends no request.

```markdown
---
title: You explain your business again every day
problem: Each new chat starts from zero, so you explain your business again.
fix: Each chat saves what it learned, and the next one starts knowing it.
order: 1
checked: 2026-10-31
sources:
  - wiki/development/memory.md
  - .agents/skills/memory/SKILL.md
---
Add a memory system to my AI setup. Build it in this project and ask me before anything you can't undo:

> Keep short facts from each chat, one per line
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/memory.md)
```

- **`title`** is the problem in the reader's words: the card's heading.
- **`problem`** and **`fix`** are one sentence each, shown above the text.
- **`order`** sets the card's place on the page.
- **`checked`** is the date someone last read the attachment against its sources.
- **`sources`** lists the WongStack files the fix comes from, by the path git tracks: `.agents/`, not `.claude/` ([repo layout](repo-layout.md)).

[`site/attachments/parse.mjs`](../../site/attachments/parse.mjs) reads the file for the page and for the check, so the two never read it differently. Keep to this small shape: plain `key: value` lines and one list.

## The text

The body is what the reader copies.

1. **The opener** is one line: what to add, then *Build it in this project and ask me before anything you can't undo:*. A stranger's AI runs it in a real setup, so it asks before a step it can't take back.
2. **An empty line.**
3. **One flat list.** Every line starts with `> ` and says one short thing. About 15 to 30 lines: the parts and the job of each, how they link, when each step runs, how it stays clean, and what wins when two sources disagree.
4. **The last bullet points to this repo**, at the area's main page: `> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at <path>)`.

**Use generic words.** The reader has none of our tools, so name what a part does, not what we call it:

| Source says | The attachment says |
|---|---|
| OpenSpec, `openspec/changes/` | plans |
| `openspec/specs/`, the archive | specs |
| D1, SQLite, a named database | a database |
| An exact cap (40 lines, 3,000 words, 120 s) | a plain size word: short, small, long |
| WongStack, a person's or a repo's name | cut |
| A script or file name (`memory.mjs`, `AGENTS.md`) | what it does: one search, the instruction file |

Keep a number when it is part of the design a reader copies, such as *4 stores* or *30 days*. The page is public, so the [landing page's rules](landing-page.md#no-hosting-offer) hold here too: no price, no paid plan, no sign-up, no other product named.

## Write or rewrite one

Type `/paste-this-into-your-ai attachment <slug>`. [The skill](../../.agents/skills/paste-this-into-your-ai/SKILL.md) reads every source in full, writes the file by this page, and sets `checked:` to today. Read the result before you save it: a stranger builds from these words.

## The check

[`scripts/check-attachments.mjs`](../../scripts/check-attachments.mjs) runs with the release checks on every change, a wiki-only change too. It compares the branch with `origin/main`, uncommitted work included, and fails, naming the file and the fix, when:

- **A source changed and its attachment did not.** Rewrite the attachment. If the edit doesn't change the fix, such as a wording fix, set `checked:` to today: one line, and someone has looked.
- **A source does not exist.** Name the file it moved to, or remove it from `sources:`.
- **A field is missing**, `order:` is not a number, or `sources:` is empty.
- **The body is out of shape**: no single opener line and empty line, a line after them without `> `, or a last bullet without the repository link.

On the default branch after a merge, nothing differs from `origin/main`, so only the shape counts; with no `origin/main` to compare, it checks the shape alone. The page's own tests, in [`site/src/Attachments.test.tsx`](../../site/src/Attachments.test.tsx), check that each card shows and copies its full text.

Part of [Maintaining WongStack](README.md).
