# Design

## Context

Source: the install's archived change `2026-10-26-one-task-one-workspace` (PR #203). Today `asking-the-user.md` makes *Close this workspace* a recommended closing option, and `/ship` ends with a question that `new-workspace.md#next-work` orders.

## Decisions

- **Owner: a new *One task, one workspace* section in `the-change-loop.md`.** `AGENTS.md` gets one rule line that links it; the skills link it, never copy it.
- **Auto-close replaces the offer.** `asking-the-user.md` has one closing bullet: finished work in a Paseo worktree asks nothing but a routine or app offer, then runs `/close`. `the-change-loop.md` owns when it never closes.
- **`/ship` ends by `next-work`.** In a Paseo worktree it opens each asked-for part left, then `/close`. A `/ship` that `/close` invoked for the wiki does not run `/close` again, and a failed live look does not close.
- **New task detection is the agent's judgement** against the chat's task: its first ask, its change, or its to-do title. It opens through `workspace.mjs`, as `new-workspace.md` already does.
- **Word cap.** `the-change-loop.md` would pass 3,000 words, so its test-file paragraph moves to `loosened-checks.md`, which owns check rules.

## Risks / Trade-offs

- [The agent closes too early] → `/close` keeps unsaved work, the chat stays readable, and `/continue` brings it back.
