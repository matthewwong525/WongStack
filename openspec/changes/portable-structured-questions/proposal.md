# Make structured questions portable

**Status:** ready-to-ship
**Branch:** tender-ape
**Open questions:** none

## Why

Codex can show the same multiple-choice question UI that WongStack already requests, but the source repository does not enable that tool in Default mode and the skill names only Claude's tool. This made an interactive `/improve` run fall back to typed numbered choices even though the local Codex build supports structured input.

## What Changes

- Make `/explore` prefer Codex `request_user_input` or Claude `AskUserQuestion`, then use the existing numbered-chat fallback only when no structured tool is callable. Apply the same portable name rule to other direct question-tool references. (review.html#/question-flow/after)
- Add trusted project configuration that enables Codex's `default_mode_request_user_input` feature for WongStack sessions without changing the user's global Codex configuration. (review.html#/config-diff/added)
- Update the structured-question contract and release WongStack 16.2.1 with the portable behavior and its limits.

**Non-goals:** Making a tool callable when a host does not provide it, changing collaboration modes, enabling the feature globally, or editing ClaymooApp in this repository change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-clarification`: Name the Codex and Claude structured-question tools explicitly and require the usable one before chat fallback.

## Impact

Update the exploration and continuation skills, add project-local Codex configuration, revise the existing clarification specification, and publish the required patch release surfaces. No application runtime, service, credential, or dependency changes are required. This change does not complete the user's ClaymooApp request; that adoption remains a separate downstream repository change after this source change ships.

## Decision log

- 2026-09-21: `/improve` ranked two maintenance candidates; the user supplied a custom direction to make structured questions work across Codex and Claude.
- 2026-09-21: User chose explicit support for `request_user_input` and `AskUserQuestion`, with numbered chat only when neither tool is callable.
- 2026-09-21: User chose project-local Default-mode enablement for WongStack and ClaymooApp, not only skill wording.
- 2026-09-21: Assumed WongStack and ClaymooApp should each own a `.codex/config.toml` override because this keeps the experimental feature scoped to the requested repositories instead of every local Codex session.
- 2026-09-21: ClaymooApp adoption is deferred to its own clean worktree and workflow because its primary checkout contains unrelated untracked files.
- 2026-09-21: The exit question round is complete; the conversation settled scope, observable behavior, compatibility, and acceptance before planning.
- **2026-09-21** — Implemented the portable question-tool order, enabled Codex structured input in trusted WongStack checkouts, updated the clarification contract, and prepared release 16.2.1. The project flag is active for new sessions; ClaymooApp remains a separate tracked delivery.

Maintenance-Origin: /improve
Maintenance-Revision: 065a011d829d0d66b1b7728b77921baa6085f510
Maintenance-Area: .agents/skills/agent-browser
