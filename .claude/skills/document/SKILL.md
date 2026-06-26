---
name: document
description: Write or update a process doc in a docs/ wiki following progressive-disclosure principles — atomic one-topic pages, strong stand-alone openers, topic titles (never "Step N"), generous inline linking up/down/sideways, folders only for deep branches. Use when you want to document a reusable process, add or restructure a docs page, or when /ship needs to capture a process. Carries the full rulebook in references/progressive-disclosure.md.
user-invocable: true
---

# /document

Write or update a `docs/` page so the wiki stays a healthy **progressive-disclosure tree**: one place to start, every node drilling down, every page standing on its own.

**Read the rulebook first** — the repo's own [`docs/wiki-style.md`](../../../docs/wiki-style.md) (the installer copies it there; the repo owns and can tweak it), or, if absent, [`references/progressive-disclosure.md`](references/progressive-disclosure.md) (its source). It carries the full reasoning, examples, the heading-anchor algorithm, and the add-a-page checklist.

Given a thing to document (described by the user, or distilled by `/ship`):

1. **Is it even a doc?** Document **general, reusable processes** — followed again in a different situation. Skip one-off specifics (those go in the `/ship` summary issue or a commit message).
2. **Prefer extending the page that already owns this topic** (search `docs/`). One topic, one page — never write the same procedure twice; replace any copy with a link.
3. **New page only as the exception** — topic title (never "Step N") + a strong opening sentence, placed at the right layer, linked **up** to its hub / **down** to references / **sideways** to siblings, with its parent linking to it. Subfolder only when a step fans into several pages.
4. **Link generously and inline** — link every doc/page/tool the moment you name it (`[label](path.md)`, `[label](https://…)`); point at a section with its heading anchor (`[step](page.md#the-heading)`). No orphans, no dead-ends, full hub-coverage. Never put links inside a `mermaid` fence.
