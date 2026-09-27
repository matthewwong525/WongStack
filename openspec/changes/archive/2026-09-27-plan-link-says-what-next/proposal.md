# The plan's link says what to do next

**Status:** ready-to-ship
**Branch:** add-apply-plan-review
**Open questions:** none

## Why

When a plan waits for you, you get a link to its page but no word on how to go on. You open the plan, read it, and then have to know that `/apply` builds it.

## What Changes

- **A next-step line under the plan's link.** When a plan stops for your review, the line right under its link says *When you're ready, type `/apply` to build it.*
  ```text
  Click here to see the plan:
  review.html   ◀── tap to open
  When you're ready, type /apply
  to build it.
     │
     ▼
  you: /apply   or  your notes
  ```
- **It shows wherever the plan waits.** After a plan made on its own, an update plan, notes pasted from the plan's page, and the reply to *Review the plan*.
- **It stays out when the build goes on.** When the plan is built in the same run, or the work is already live, the link shows alone, so it never tells you to do what is already happening.
- **One wording everywhere.** The tool that builds the plan's page prints the line under the link, so every reply uses the same words.

**Non-goals:** changing the plan's page itself, or the closing question's choices. *Build it now* stays the recommended choice.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan-link requirement gains a next-step line, printed under the link only when the plan waits for the person.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs` output (a third line), and `scripts/tests/review.test.mjs`.
- `.agents/skills/explore/references/asking-the-user.md` "Print the plan's link"; `.agents/skills/plan/SKILL.md` build-page sentence.
- `AGENTS.md` WONG-STACK plan-link rule line.
- `openspec/specs/asking-the-user/spec.md` (delta), `CHANGELOG.md`.

## Decision log

- **2026-09-27** — Assumed: the line reads *When you're ready, type `/apply` to build it.*, because the person asked to name `/apply`, and *type* is the plain word for what they do.
- **2026-09-27** — Assumed: bare `/apply`, not `/apply <name>`, because in the same chat `/apply` finds the plan the session made, and a cold pick-up already has `/continue <name>`.
- **2026-09-27** — Assumed: the line shows only when the plan waits for the person, because inside `/apply` or `/ship` the build is already under way, and after a publish the plan is done.
- **2026-09-27** — Assumed: the page builder prints the line, because agents copy its output as printed, and one source keeps the wording from drifting.
- **2026-09-27** — Assumed: chat only; the review page itself is unchanged, because the ask was about the printed link, and the page is cheap to change later.
- **2026-09-27** — Assumed: a minor release, because it adds a line people see and changes no command.
- **2026-09-27** — Distilled: no repeatable fact. The change and branch had no live facts.
- **2026-09-27** — Archive checkpoint: the builder prints the next-step line under the plan's link, and the rule copies it only when the plan waits. Built and shipped in one `/ship` run.
