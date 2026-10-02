# Design

## Context

See [the proposal](proposal.md) for the outcome. Existing other-work discovery already lists this repo's worktrees, plans, changed files, and pull requests. Peer chats can also share the current worktree; exclude the caller by exact session ID while preserving those peers. Clean idle workspaces remain discoverable when they have a non-archived peer; without Paseo the earlier git-only filtering stays unchanged. Paseo can list chats and send a message to an existing session. Extend that path instead of introducing a second coordination system.

## Goals / Non-Goals

**Goals:** Brief direct cooperation between independent chats; verified recipient selection; agreements recorded in existing plans; preserve scope and publishing approval.

**Non-Goals:** Runtime coordination files, a registration protocol, custom delivery or deduplication queues, watchers, a publication lock, new cleanup jobs, or automatic workspaces. The existing planning artifacts are retained.

## Decisions

### Discover by title, address by session ID

Extend the existing other-work helper to expose each workspace's chat title, session ID, and status from Paseo's existing listing. Verify canonical worktree and repository identity before presenting a recipient; exclude the current, archived, and unrelated sessions. Multiple chats in one workspace remain distinct. The agent judges semantic overlap from the task and plans, rather than treating shared filenames as proof of conflict.

Titles make discovery readable. Use the exact selected Paseo session ID for sending because a title can change or be ambiguous. An ambiguous match calls for inspecting the candidate task, not guessing or broadcasting.

Each owner keeps its own chat title to a short current task description, updating it with `paseo agent update <session-id> --name <title>` when the requested outcome or scope meaningfully changes. Initial planning and resumed work compare the title to the current task; ordinary progress does not trigger renaming. A title change leaves the session ID, branch, and plan identity unchanged. Do not rename another chat. Workspace names and chat titles are distinct; avoid overwriting a shared workspace name to match one chat.

Read fresh titles during discovery. Use them as candidate hints alongside existing plans, changed files, and task context; a mismatching or stale title does not by itself exclude relevant work. Confirm scope from the existing plan or a brief owner question. If title updating fails, report the limitation and use those same context sources rather than adding a shadow title registry.

### Send brief messages through Paseo

Use the installed `paseo send <session-id> ... --no-wait --json` command with the correct daemon home/host context. Messages identify the sender's chat and task, the specific conflict or question, and a suggested next step. Refer to existing plan or project files for details. The receiver may ask a targeted follow-up. Keep ordinary exchanges to a few sentences; no rigid payload schema or new word-count validator is needed.

The generic convention explicitly authorizes these same-repo coordination messages as part of existing tasks. Receiving a peer message does not create a new user request, expand scope, grant publishing approval, or transfer ownership. Never stop or cancel another chat to deliver a message. Confirm the installed Paseo send behavior during implementation; use its native queue if it preserves the running task. If safe delivery to a busy peer is unavailable, continue independent portions and recheck at a natural workflow boundary, without a custom watcher or automatic retry loop.

Installed CLI 0.10.1 uses interrupt delivery and exposes no safe queue. Native steering falls back to cancelling/replacing unsupported turns. Require fresh idle inspection with no pending permissions before CLI send; inspection is not atomic admission, so uncertain concurrent activity leaves delivery pending. Use explicit host routing before home routing and a bounded foreground call.

Check the send result. Dispatch is not an agreement: the affected owner must actually reply. If delivery is ambiguous, inspect the existing Paseo conversation before resending. Coordinate only when a conflict or dependency requires it; avoid status chatter and reply loops. Chats and Paseo retain the conversation, while plans retain consequential agreements.

### Keep ownership and dependencies in existing plans

Each owner records accepted responsibility or integration order in its own plan. Add no parallel task registry. Planning contacts a relevant owner before asking the person to choose between workspaces. Apply/continue consult agreed dependencies and contact the owner again when the scope changes or more context is needed. Do not make unrelated tasks wait for replies.

Ship respects the task's agreed order. A prerequisite is ready only after its publication is confirmed; incorporate its published changes into the task's own branch, resolve conflicts preserving both intents, and follow the existing exact-commit gate. There is no custom global publishing queue or exclusion guarantee. Existing stale-version and merge-conflict recovery handles collisions. A declined or incomplete prerequisite stays unresolved and blocks only work that needs it.

A session that resumes reads its existing plan and relevant Paseo context rather than a custom runtime store. Ask the person only when owners cannot resolve a real outcome choice or an unreachable owner prevents affected work from proceeding.

### Keep the workflow convention small

The change-loop wiki owns direct coordination and links its detailed task-chat procedure; AGENTS.md explicitly authorizes it in one concise instruction. Relevant skills link that owner and replace the old unconditional overlap ask. Do not integrate a new registration lifecycle into save or close. Existing payload instructions and checks must stay within their context budget.

## Risks / Trade-offs

- Titles may repeat, change, or be stale → keep each owner's title current, inspect actual task context, and send using its verified session ID.
- A peer may be busy or unavailable → use native safe delivery where supported and continue independent work; do not promise automatic wake-up or guaranteed delivery.
- Plans may become outdated → refresh actual dependency publication and relevant task context before ship.
- Simultaneous publishers can still collide → retain the existing exact-commit checks and merge/release recovery; this change adds cooperation, not distributed exclusion.

## Migration Plan

Ship the discovery enhancement, concise convention, workflow links, coverage, and minor release note together. No runtime state, credentials, or service setup is introduced. Rollback restores the former overlap ask; there are no coordination files to migrate or clean up. Generate [the review page](review.html) from the proposal. The app is untouched.
