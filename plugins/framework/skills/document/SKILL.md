---
name: document
description: Write or update a process doc in a docs/ wiki following progressive-disclosure principles — atomic one-topic pages, strong stand-alone openers, topic titles (never "Step N"), generous inline linking up/down/sideways, folders only for deep branches. Use when you want to document a reusable process, add or restructure a docs page, or when /ship needs to capture a process. Carries the full rulebook in references/progressive-disclosure.md.
user-invocable: true
---

# /document

Write or update a page in a `docs/` wiki so the wiki stays a healthy **progressive-disclosure process tree**: one place to start, every node drilling into more detail, every page able to stand on its own.

**Read [`references/progressive-disclosure.md`](references/progressive-disclosure.md) first** — it's the full rulebook (and `${CLAUDE_PLUGIN_ROOT}/skills/document/references/progressive-disclosure.md` is its absolute path for other skills). If the target repo has its own `docs/wiki-style.md` (scaffolded by `framework:init`), prefer that — it's the repo's local copy of these same rules and may carry repo-specific conventions.

## What this skill does

Given a thing to document (a process the user describes, or one `/ship` distilled from a conversation):

1. **Decide if it's even a doc.** Document **general, reusable processes** — things someone would follow again in a different situation. Skip one-off specifics (those belong in a daily note or a commit message, not the wiki).
2. **Prefer extending an existing page.** Search `docs/` for the page that already owns this topic. Updating the right page in place beats adding a new one — and never write the same procedure in two places (one topic, one page; replace any copy with a link).
3. **If it's genuinely new,** place it at the right layer of the tree, give it a **topic title** and a strong opening sentence, link it **up** to its hub / **down** to what it references / **sideways** to siblings, and make its parent link **to it**. Add a subfolder only when a step fans into several pages worth grouping.
4. **Keep links generous and inline** — link every doc, page, tool, or resource the moment you name it, at the point of need, using standard markdown links (`[label](path.md)` for docs, `[label](https://…)` for URLs). Point at a section with its heading anchor (`[step](page.md#the-heading)`).

## The short version of the rules

- **Start general, break down as needed.** A section README is the overview; each step that has more links to its own page; that page does the same — only as deep as the real work goes. Don't manufacture depth.
- **One topic, one page.** Each thing is documented in exactly one place. Duplication is a bug — link instead.
- **Every page stands alone.** Clear `#` title + a strong first sentence that says what it is (it becomes the search snippet/preview). No breadcrumb/caveat/filler openers.
- **Title the topic, not its place in a sequence.** `Find inspiration`, never `Stage 1 — Find inspiration`. Ordering lives in the parent hub's list.
- **Link generously, in all three directions** — up to the hub, down to references, sideways to siblings. No orphans, full hub-coverage, no dead-ends.
- **Folders only for deep branches.** A subfolder's `README.md` is its hub. Navigate by inline links + search, not a hand-maintained table of contents.
- **Diagrams are pictures; links live in the adjacent list.** Never put links inside a `mermaid` fence.

The full reasoning, examples, the heading-anchor algorithm, and the add-a-page checklist are in [`references/progressive-disclosure.md`](references/progressive-disclosure.md).
