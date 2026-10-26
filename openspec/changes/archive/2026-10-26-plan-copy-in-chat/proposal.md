## Why

A finished plan ends on a link to its review page. To read the plan you have to open that page, even when you only want a quick look before saying build it or publish it.

## What Changes

- **The plan prints in the chat, above its link.** Whenever a reply hands you a plan to review, it shows the plan's why and each change as numbered points, then the link and the review line as today. You can read it, reply in the chat, and never open the page.
  ```text
  Plan: plan-copy-in-chat

  Why
  A finished plan ends on a link ...

  What changes
  1. The plan prints in the chat ...
     (picture on the review page)
  2. Pictures stay on the page ...

  Assumed for you
  - A copy, not the whole page ...

  Click here to see the plan: review.html
  Review the plan. When you're ready, ...
  ```
- **Pictures stay on the page.** A chat can't show flows or screen sketches, so each one becomes a short *picture on the review page* line. Tables and plain-text drawings print as they are.
- **Choices you didn't make are listed.** The copy ends with the decisions the assistant assumed for you, so you can catch a wrong guess without opening the page. Choices you answered yourself are left out: you already know them.
- **Only when the plan waits on you.** A plan built straight away, or one reported after it is live, still shows just its link, so those replies stay short.

Non-goals: no change to the review page itself, its buttons, or how notes reach the chat.

## Capabilities

### New Capabilities

### Modified Capabilities
- `asking-the-user`: a finished plan's reply, and the reply to *Review the plan*, print a chat copy of the plan above its link.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: prints a chat copy of the proposal after its status line.
- `.agents/skills/explore/references/asking-the-user.md` (*Print the plan's link*), `.agents/skills/plan/SKILL.md` (*Finish*), `wiki/development/reply-links.md`: say when the copy goes in a reply.
- `scripts/tests/review.test.mjs`: tests for the chat copy.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

1. **2026-10-26** — Assumed: the page builder prints the chat copy itself, because a fixed script prints the same copy every time, while an agent rewriting the plan by hand drifts from the page.
2. **2026-10-26** — Assumed: the copy holds the why, each change, and only the assumed decisions, because answered choices are already known to you and the full log makes the reply long.
3. **2026-10-26** — Assumed: flows, screen sketches, and drawn pictures print as one *picture on the review page* line, because a chat shows no pictures; tables and text drawings print as written.
4. **2026-10-26** — Assumed: the copy goes only in replies that end on the review line (a finished plan and the answer to *Review the plan*), because a plan built straight away or reported after publishing doesn't wait on you to read it.
5. **2026-10-26** — Archived and published as 44.16.0 from branch `show-review-chat`, chosen with Build and publish on the review page. Main's Payload checks had failed once in `hand-over.test.mjs` (a site-watch timing test) and passed on rerun before publishing.
