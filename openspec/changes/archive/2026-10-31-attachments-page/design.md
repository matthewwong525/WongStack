# Design

## Context

The landing site ([`wiki/maintaining/landing-page.md`](../../../wiki/maintaining/landing-page.md)) is meta-only, has two pages chosen by path in `site/src/App.tsx`, and already has `CopyMessage` (a message in a box with a copy icon) in `site/src/CopyButton.tsx`. Its rules hold here too: no outside requests, no price, no comparison with other products, comments short. The bullet style comes from WongOS's `/paste-this-into-your-ai` skill and its memory example (one opener, one flat `>` list, generic words). Payload checks run on every change, docs-only included, from `scripts/payload-checks.mjs`, mirrored in `.github/workflows/payload.yml`.

## Goals / Non-Goals

**Goals:** a public page of seven attachments with copy and per-card links; attachment text kept as files that name their sources; a check that stops a source change without its attachment; the skill that writes them, moved in.

**Non-Goals:** a deck; sending attachments to installs; automatic rewriting by AI in CI; analytics on copies.

## Decisions

### One file per attachment: `site/attachments/<slug>.md`

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
> ...
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/memory.md)
```

- The slug is the card's anchor: `wongstack.com/attachments#memory`.
- The frontmatter is a fixed small shape (strings, one list), parsed by one shared function the site and the check both import (`site/attachments/parse.mjs`), so the two never read a file differently.
- Plain Markdown, not TypeScript: the writing skill and a person edit text, not code.

Slugs and sources:

| slug | sources |
|-|-|
| `memory` | `wiki/development/memory.md`, `.agents/skills/memory/SKILL.md` |
| `know-how` | `wiki/agent-knowledge-center.md`, `wiki/wiki-style.md` |
| `plan-first` | `wiki/development/the-change-loop.md`, `.agents/skills/plan/SKILL.md` |
| `safe-changes` | `wiki/development/the-change-loop.md`, `wiki/development/staging-walkthrough.md`, `wiki/development/kept-checks.md` |
| `team-learning` | `wiki/development/memory.md`, `wiki/wiki-style.md`, `.agents/skills/close/SKILL.md` |
| `team-access` | `wiki/stack/employee-access.md`, `wiki/development/secrets.md`, `wiki/stack/company-api.md` |
| `own-your-setup` | `AGENTS.md`, `wiki/maintaining/repo-layout.md`, `wiki/development/required-tools.md` |

### The page: `site/src/Attachments.tsx` at `/attachments`

- `App.tsx` picks it for `/attachments` (with or without a trailing slash), as it does `/privacy`.
- Files load at build time with `import.meta.glob("../attachments/*.md", { query: "?raw", import: "default", eager: true })`, sorted by `order`. No request at run time, so the privacy promises hold.
- Each card: `<section id={slug}>`, `h2` title, the problem, the fix, then `CopyMessage` with the body. A card's title links to its own anchor.
- `SiteHeader` gains an *Attachments* text link beside *GitHub* and *Install*.

### The check: `scripts/check-attachments.mjs`

- Changed files = `git diff --name-only <merge-base origin/main> HEAD`, plus the working tree with `--worktree`. On the default branch, or with no base, it checks shape only.
- Fails, one line each, naming the fix:
  - a source in `sources` changed and the attachment did not: *`site/attachments/memory.md`: `wiki/development/memory.md` changed. Rewrite it by wiki/maintaining/attachments.md, or set `checked:` to today if the fix is unchanged.*
  - a source path that does not exist;
  - a missing field, a body line after the opener that does not start with `> `, or a last bullet without the repository link.
- Added to `STEPS` in `scripts/payload-checks.mjs` as `{ name: 'attachments', when: 'always', command: 'node scripts/check-attachments.mjs' }` and the same step in `payload.yml`, so a wiki-only change runs it too.

Alternative rejected: an AI rewrite inside CI. It needs a model key in CI and writes text no one reviewed.

### The skill: `.agents/skills/paste-this-into-your-ai/`

- Copied from WongOS with its `references/memory-example.md`. It reads this repo directly, not the latest-source cache, because here the repo is the source.
- `disable-model-invocation: true`: only a person starts it, and its text counts as on-call, outside the instruction budget and the startup words.
- Two outputs: the X post (unchanged), and `attachment <slug>` which writes or rewrites `site/attachments/<slug>.md` and updates `checked:`. The attachment format lives in [`wiki/maintaining/attachments.md`](../../../wiki/maintaining/attachments.md); the skill links it, so a CI failure and the skill point at one page.
- Not in `payload-files.json`, so no install receives it.

## UX

**Brief.** Who: someone who already uses an AI assistant, arriving from a post, a slide or the header. Job: find the fix for one problem and get its text into their chat. Done: the text is on their clipboard. Context: often a phone, from a link to one card. Common case: a link to one card, one copy. Edge: a browser refuses the clipboard; `CopyMessage` already says to select the text by hand. Mirrors the landing page's install message box.

**Flow.** Open the link → the page scrolls to the card → tap Copy → paste in their chat.

**Hierarchy.** One primary action per card: Copy. The title and the two sentences come first, the text box under them. No other buttons.

**Components.** Existing `CopyMessage`, `SiteHeader`, `SiteFooter`, the site's section and heading styles. New: the card section and a short page intro.

### Review

[review.html](review.html) shows the page in What Changes item 1, and an attachment's text in item 2.

## Risks / Trade-offs

- **A wording edit to a source page forces a touch on its attachment.** Accepted: setting `checked:` is one line, and it makes a person look.
- **Generic bullets can promise more than a stranger's setup can do** (the access fix needs an app with sign-in). Each opener tells the AI to build in their project and ask first; the last bullet sends them to the source for the full design.
- **Seven files written in one go may read alike.** The skill reads each area's pages first, and the review page shows them.
