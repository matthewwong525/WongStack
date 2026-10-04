# Design

## Context

PR #241, commit `3d9f248`, introduced direct task-chat coordination in version 29.10.0. Its parent is the source of the behavior to restore. See [proposal.md](proposal.md) for the requested outcome.

The parent prepared pre-change source files and the introduced diff in `.scratch/pre-coordination/` for the build helper. The discovery script and its tests have no later edits to preserve. These ignored reference files are build inputs only; they do not ship.

## Goals / Non-Goals

**Goals:** Selectively undo that release's communication behavior, restoring discovery and user-owned overlap decisions.

**Non-Goals:** Do not introduce PR-only discovery, new communication exceptions, or another coordination system. Do not revert unrelated releases or the wording-only edits bundled into #241.

## Decisions

- Restore the pre-#241 explore overlap instructions, new-workspace questions, and change-loop description. Remove the coordination authorization in AGENTS.md and the peer-agreement/title/context additions to plan, apply, continue, and ship.
- Restore `other-work.mjs` and its tests to their pre-#241 behavior: worktrees, plans, busy state, and non-bot PRs remain visible, with git-only fallback. Remove the release's distinct peer-session output and current-worktree peer inclusion. Before restoring a file, check for later changes and preserve any unrelated fixes.
- Remove `wiki/development/task-chats.md`, its payload-files entry, and the references added to the development hub and memory areas. Retire `session-coordination` through the CLI-supported `retire_capabilities: true` flag. Restore the two `other-work-check` requirements from the parent commit. Keep archived specs and changes unchanged.
- Update later live links to the removed coordination section, including Matthew's shared-file guidance, to point to the restored overlap guidance. Preserve that person's instruction to continue independent edits. Register retired paths/identifiers and fix their live references through the existing payload checks.
- Keep VERSION and historic CHANGELOG entries untouched. Add a new minor release entry for the behavior rollback. The discarded PR-only design is replaced by this selective reversal, which matches the user's clarification and avoids inventing a replacement policy.

## Risks / Trade-offs

- [Previously bundled changes could be lost] → Reverse only communication-related hunks, inspecting later file history before restoration.
- [Dangling links after removal] → Fix live references and run the payload-link and retired-name checks.
- [Overlaps now require a user decision] → This is the original behavior the user requested; no default peer negotiation is restored elsewhere.
- [Running chats may have loaded old instructions] → The change applies when updated instructions are loaded, not retroactively to other active chats.

## Migration Plan

Publish the rollback through the ordinary payload release process. Keep #241 and its archived record as history. The review page is [review.html](review.html), generated from the revised proposal. No app preview is needed.
