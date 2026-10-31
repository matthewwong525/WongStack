---
name: paste-this-into-your-ai
description: Write a paste-ready X post about one WongStack area (memory, the change loop, mini apps, browsing), or write or rewrite a site attachment with `attachment <slug>`; only when a person types it. Posts nothing.
user-invocable: true
disable-model-invocation: true
---

# Paste this into your AI

Explain one WongStack area well enough for a stranger to build it with their own AI. Two outputs share one style:

- **A post** (the default): one X post, printed in chat. Matthew posts it himself: never post to X.
- **An attachment** (`attachment <slug>`): the file `site/attachments/<slug>.md` behind one card on the site's Attachments page. [Attachments](../../../wiki/maintaining/attachments.md) owns its shape, its rules and its check.

[The memory post](references/memory-example.md) is the model. Copy its shape and line style for both.

## 1. Read the area

Read this repo: it is WongStack's source, so it is the newest copy.

The area is the argument, such as `memory`, `change loop`, `mini apps`, or `browsing`. No argument: ask which area, with three or four areas as choices. For an attachment, the area is the file's `sources:`; a new slug has none yet, so pick them as below and list them.

1. Start at `wiki/README.md`. Follow its links down to the area's pages. If no link name matches, search `wiki/` for the area's words.
2. Read each of those pages in full.
3. Open each skill, script, hook, and rule those pages link, and read enough to know what each part does and when it runs.

## 2. Write it

Rules, all from the model:

- One opener line, then one empty line. A post opens like `How my Claude Code <does the thing>:`; an attachment opens by [its page's rule](../../../wiki/maintaining/attachments.md#the-text).
- Then one flat list. Every line starts with `> ` and says one short clause.
- A post has about 30 to 35 lines; an attachment about 15 to 30.
- No section titles, no numbering, no emoji, no thread split.

Cover, in this order where it fits: the parts and the job of each; how the parts link; when each step runs (session start, first edit, plan, build, ship, close, a schedule); how it stays clean; what wins when sources disagree.

**Make it generic.** A stranger must build it with their own tools: swap names by [the generic-words table](../../../wiki/maintaining/attachments.md#the-text). Cut WongStack's name and any private repo's or person's name too.

**Check it.** Read each line back: does it start with `>` and hold one clause? Can a stranger follow it with no proper noun they lack? Do the lines together name each part, how the parts link, and when each step runs? Fix a line that fails, then count again.

## 3. Finish

### A post

Print exactly these three things, in this order:

1. The post in one fenced code block, so the `>` marks copy as is.
2. One line: count the characters inside the block. 280 or fewer: `Fits a regular tweet (<n> characters).` More: `Needs a long post (<n> characters).`
3. The reply in a second code block, word for word:

```
Or steal the source code here: https://github.com/matthewwong525/WongStack
```

The reply box is the last thing you print. A post writes nothing in this repo.

### An attachment

Write `site/attachments/<slug>.md` with its frontmatter and the body, the last bullet pointing to this repo at the area's main page. Set `checked:` to today. Keep the `order:` an existing file has. Then run `node scripts/check-attachments.mjs` and fix what it names. Show the person the body in a code block, and end as [the change loop](../../../wiki/development/the-change-loop.md#just-ask) does for a repo edit.
