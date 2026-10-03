# Restore independent task chats

**Status:** ready-to-ship
**Branch:** infamous-frog
**Open questions:** none

## Why

Mandatory conversations between agents distract tasks and grow their scope. Restore the behavior we had before that requirement was introduced.

## What Changes

- **Restore the previous behavior.** Agents still see other workspaces, their plans, and open PRs. When work overlaps, they ask you whether to keep going here, work there, or narrow the request. They no longer have instructions to contact each other, negotiate responsibilities, or recover peer conversations.
  ```text
  Your request ──▶ See other work
                         │
                ┌────────┴────────┐
                ▼                 ▼
             Overlap          No overlap
                │                 │
                ▼                 ▼
             Ask you           Continue
  ```

**Non-goals:** No new coordination policy or PR-only restriction. Keep unrelated improvements and the existing publishing process.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `other-work-check`: Restore its requirements from immediately before PR #241.
- `session-coordination`: Retire the capability introduced by PR #241.

## Impact

Reverse the communication-specific changes in PR #241 across discovery, skills, instructions, documentation, and payload metadata. Keep existing release history, archives, unrelated prose edits, and later improvements. Add release notes for the rollback.

## Decision log

- **2026-10-03** — Assumed: Use open PRs as the only default source of other-task context, because the user requested seeing other work with less agent conversation and suggested restricting the channel to PRs.
- **2026-10-03** — Assumed: PR awareness is read-only, because the user asked for seeing work rather than agents talking; moving the same conversations into PR comments would keep the problem.
- **2026-10-03** — Assumed: Direct peer contact requires an explicit user request, because the existing blanket coordination authorization conflicts with the user's preference for each chat to focus on its own task.
- **2026-10-03** — Assumed: Keep real prerequisite and publishing safeguards, because reducing communication should not allow a task to publish code whose prerequisites are missing.
- **2026-10-03** — Assumed: Do not force tasks to create PRs earlier; unpublished work will be outside this check, which keeps this change small and follows the requested PR boundary.

- **2026-10-03** — Asked how to proceed with the proposed plan → chose to restore behavior before agents were required to communicate. This supersedes the earlier PR-only assumptions; use PR #241 (3d9f248) and its parent as the rollback boundary.

- **2026-10-03** — Check: `scripts/tests/other-work.test.mjs` removes the three #241-only peer-session and explicit-daemon-routing cases because that discovery behavior is retired. The original 13 cases continue to cover worktree/plan discovery, busy state, PR folding, and unavailable-service fallbacks.

- **2026-10-03** — Archived checkpoint: restored the pre-#241 discovery and overlap decisions; retired the mandatory coordination capability. All four tasks are complete, original discovery tests and payload validations pass, and release 29.17.0 is numbered for publication.
