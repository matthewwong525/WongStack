# Every link in the chat

**Status:** planned
**Branch:** heavy-eel
**Open questions:** none

## Why

Links sometimes land inside a question box, where they can't be clicked, or only in the assistant's hidden reasoning, where nobody sees them. Today the rule covers only the plan's link and the preview's link, so other links (a pull request, a key link, a private form) still slip.

## What Changes

- **Every link you need sits in the chat message itself, on its own line.** Never inside a question box's question or its choices, and never only in the assistant's hidden reasoning. This covers every link: the plan, the preview, the change on GitHub, a key link, a private form, a page to sign in on.
  ```text
       BEFORE                 AFTER
  ┌──────────────────┐   Click here to see the plan:
  │ Build it?        │   https://…/review.html
  │ 1. Yes – see     │   ┌──────────────────┐
  │    https://…     │   │ Build it?        │
  │ 2. Stop          │   │ 1. Yes           │
  └──────────────────┘   │ 2. Stop          │
                         └──────────────────┘
  ```
- **A choice may point at the link above it**, such as *Review the plan*, but never repeats the address.

Non-goals: changing which links a reply shows, or how many; changing the *Review the plan* and *See the preview* choices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the "Every reply that returns control ends with the next step" requirement extends to every link: chat text, never in the question tool's text or options, never only in reasoning.

## Impact

`.agents/skills/explore/references/asking-the-user.md` (one general rule in "End every reply with the next step"; the plan-link section's own "keep it out of the question" sentence folds into it), the `asking-the-user` spec, and a `patch` entry in `CHANGELOG.md`. Skill word count must stay under the recorded baseline: the new sentence replaces the old narrower one.

## Decision log

- **2026-10-15** — Assumed: one general rule on the asking page rather than a sentence per link type, because a copy per link goes stale and the page already owns how a question looks.
- **2026-10-15** — Assumed: a `patch` release, because it is wording on an existing rule.
- **2026-10-15** — Built: the rule is shorter than the design's text, with no reasons, and the plan section links its "one chat line" to the rule instead of keeping its own sentence, because the design's wording put skill text 100 bytes over the size limit.
