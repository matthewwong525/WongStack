# One task, one workspace

**Status:** shipped
**Branch:** one-task-one-workspace
**Open questions:** none

## Why

A Paseo workspace should hold one task. Today a chat only *offers* to close when its work is done, and a new ask often goes into the same chat. Old chats then stay open, and one chat mixes several tasks. One install has run the fix since 2026-10-26: a finished task closes its own workspace, and a new task opens a new one. It is general, so it goes to every install.

## What Changes

- **A finished task closes its own workspace.** When the chat's task is done (the change went live, or the non-code work is done and reported), the agent runs `/close` by itself, with no *Close this workspace?* question. `/close` still keeps unsaved work. The agent does not close at a plan's review, during a build, on a blocker, a failed check, a declined publish, or a question to the person. When a routine or app offer applies, the offer is the closing question first, and `/close` runs after the answer.
  ```mermaid
  flowchart LR
    done[task done] --> close["/close by itself"] --> gone[workspace closed]
    done -.->|waits on you| stay[stays open]
  ```
- **A new task goes to a new workspace.** When the person asks a chat for something that is not its task, the agent opens a new workspace with a short brief and says `Opened: <title>`. A quick question about this chat's task stays here, and *do it here* keeps a new task here.
- **`/ship` opens the left work, then closes.** In a Paseo worktree, `/ship` opens each asked-for part still left in a new workspace, then runs `/close`, with no closing question. Outside Paseo it asks the next step as before.

Non-goals: Daily, its helper chats and routine chats keep their own rules; no board to-do closes a chat.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workspace-cleanup`: finished work closes its workspace instead of offering to; a new task opens a new workspace.
- `multi-part-workspaces`: a publish in a Paseo worktree opens the left parts, then closes, with no closing question.

## Impact

- `AGENTS.md` (one rule line), `wiki/development/the-change-loop.md` (new *One task, one workspace* section), `.agents/skills/explore/references/asking-the-user.md`, `.agents/skills/ship/SKILL.md`, `.agents/skills/close/SKILL.md`, `.agents/skills/plan/references/new-workspace.md`.
- `wiki/development/the-change-loop.md` reaches the 3,000-word cap, so its *Read a test file before deleting it* paragraph moves to `wiki/development/loosened-checks.md`.
- `CHANGELOG.md`: a minor entry; installs have nothing to do.

## Decision log

- **2026-10-28** — Asked whether general WongOS features go up to WongStack → Matthew chose yes; this is the *one task, one workspace* part, shipped with `/ship` on both sides.
- **2026-10-28** — Assumed: the text is the install's published text (its PR #203), less its personal parts, because the parity check needs the two copies equal after the sync.
- **2026-10-28** — Assumed: the new-task section drops its link to the install's personal Daily page and says "Daily, its helper chats and routine chats keep their own rules", because WongStack's daily has no such section and the wording fits both.
- **2026-10-28** — Assumed: the board's *Done to-do closes its chat* part stays out, because it belongs with the task-tracking part.
- **2026-10-28** — Built: the install's text was about 1,750 bytes over the skills' size budget, so the skills now say less and link the change-loop section, which owns the rule. `/close` itself no longer names who runs it. The change loop drops "One workspace holds one change" (the new section says it) and its `workspace.mjs` sentence (the new-workspace page owns it), to fit the save route's budget.
- **2026-10-28** — Archived at ship as 44.19.0: built, links and size checks pass, saved on `one-task-one-workspace`.
