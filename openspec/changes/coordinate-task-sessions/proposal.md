# Let task chats coordinate directly

**Status:** in-progress
**Branch:** session-task-coordination
**Open questions:** none

## Why

Adding tasks in separate chats should help you get more done. Chats should resolve overlapping work with each other through Paseo while each keeps responsibility for its own task.

## What Changes

- **Chats talk directly when their work overlaps.** Find the relevant chat by its title and task, send a brief message about the conflict, and ask its owner for more context when needed. Unrelated work keeps moving.
  ```text
     chat A ──▶ Paseo ──▶ chat B
        ▲                    │
        └──── brief reply ───┘
  ```
- **Chat titles stay current.** Each chat updates its short title when its task meaningfully changes, so other chats can find the relevant owner. They confirm the current scope from the plan or a brief question before relying on it.
  ```text
      task changes ──▶ owner updates title
                              │
                              ▼
                    peers find and confirm
  ```
- **Keep agreements with the work.** Each chat records important agreements in its existing plan, including who handles a shared responsibility and which task should publish first. Each keeps its own branch, checks, and publishing approval.
  ```text
      agree ──▶ each task's existing plan
                        │
                        ▼
                build and check own work
  ```

Non-goals: a shared coordination store, custom message queues, watchers, cleanup machinery, a publishing lock, a central supervisor, automatic workspaces, or cooperation across unrelated projects. Existing publishing safeguards remain in use.

## Capabilities

### New Capabilities

- `session-coordination`: Brief direct messages between same-repo task chats through Paseo, with agreements in existing plans and task ownership preserved.

### Modified Capabilities

- `other-work-check`: Resolve routine overlaps with a reachable owner before asking the person; retain the question for unresolved outcomes or unreachable owners.

## Impact

Existing other-work discovery gains verified chat titles and session IDs. AGENTS.md and relevant explore, workspace, apply/continue, and ship instructions explain direct cooperation. The change-loop wiki owns the convention. Existing Paseo commands deliver messages; no coordination service or runtime store is added. Coverage, payload references, and one minor release note accompany the change.

Branch: `session-task-coordination`.

## Decision log

- **2026-10-02** — Asked whether coordination should be the default → the user requested it so sessions can figure out how to ship tasks together and let them work faster.
- **2026-10-02** — Asked how chats should share responsibility → the user clarified that each chat must keep doing its own task, with coordination between chats when new tasks conflict.
- **2026-10-02** — Asked how much context coordination should carry → the user requested brief messages, with the receiving agent able to ask the owner for more context, and asked whether runtime state cleans itself up.
- **2026-10-02** — Assumed: compact runtime state should clean itself up during coordination operations, because a temporary coordination layer should not require manual housekeeping; retain unresolved dependencies and live publishing ownership for correctness.
- **2026-10-02** — Assumed: start with existing workspaces of one local repo, because the request is about tasks added to Paseo and the existing discovery helper already finds those workspaces.
- **2026-10-02** — Assumed: keep each task's publishing authorization, because cooperating does not establish which unfinished tasks the person has approved to publish.
- **2026-10-02** — Assumed: use deterministic state, message receipts, and publishing exclusion, leaving scope judgments to agents, because reliable coordination needs more than instructions telling chats to talk.
- **2026-10-02** — Assumed: retain separate task branches and changes, because they already support independent review and a shared publishing order gives the requested cooperation without combining unrelated outcomes.
- **2026-10-02** — Asked why coordination needs files rather than chat titles → the user challenged the additional machinery and said it seemed like extra complexity.
- **2026-10-02** — Assumed: simplify to title-based discovery and direct Paseo messages, because this preserves independent chats and addresses conflicts without the runtime store the user challenged. This supersedes the earlier assumptions about shared state, cleanup, watchers, and publishing exclusion.
- **2026-10-02** — Assumed: resolve the selected title to its existing Paseo session ID before sending, because titles can repeat or change and delivery must reach the intended owner.
- **2026-10-02** — Asked whether current titles matter for finding context → the user identified that title-based discovery needs titles to follow the task as its scope changes.
- **2026-10-02** — Assumed: update a chat's title on meaningful scope changes and confirm candidates from actual task context, because per-message renaming adds noise and a short title cannot fully describe the work.

- **2026-10-02** — Verified: installed Paseo CLI 0.10.1 `dist/commands/agent/send.js` calls `sendAgentMessage` without `activeTurnBehavior`; server `dist/server/server/session.js` defaults to `interrupt`. `agent/agent-manager.js` replaces and cancels a turn when native steering is unsupported. The workflow therefore contacts freshly verified idle owners without pending permissions and keeps busy or uncertain delivery pending; no custom queue or watcher is added.
- **2026-10-02** — Assumed: preserve peer chats sharing the current checkout and clean idle peer workspaces, because title discovery must find separate chats in one workspace. The existing git-only fallback still excludes the current checkout and clean inactive worktrees.
- **2026-10-02** — Verified: current CLI listing exposes `id`, `name`, `status`, and `cwd`; discovery maps `name` to chat title, verifies actual git roots, and gives explicit `PASEO_HOST` routing precedence over `PASEO_HOME`.
- **2026-10-02** — Assumed: the change-loop section links a detailed task-chat procedure, because putting all command guidance in the eagerly loaded owner would exceed the named-secret route's existing context budget. Existing workflow instructions link the same change-loop section.

- **2026-10-02** — Assumed: checkpoint the implemented discovery and workflow changes for gate task 4.1; static checks pass, while CI coverage and disposable-chat evidence remain pending.
