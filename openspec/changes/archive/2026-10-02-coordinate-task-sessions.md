<!-- openspec-archive v1 2026-10-02-coordinate-task-sessions -->
<!-- file proposal.md utf8 7829 -->
# Let task chats coordinate directly

**Status:** ready-to-ship
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

- **2026-10-02** — Assumed: mark gate task 4.1 complete after commit `0cad70c` passed all checks (payload run `37053586778`); the first run exposed a missing knowledge-area entry, which was added without changing or loosening checks. Disposable-chat evidence remains pending.

- **2026-10-02** — Verified: task 4.2 passed in two disposable same-repo chats using the parent's provider/model/thinking/mode. Exact-ID discovery, proposal, targeted context request, owner answer, actual acceptance, owner-written existing-plan agreements, independent progress and unchanged publishing permissions were observed. Both idle fixtures were archived and their scratch files removed; no production change was published. See [integration evidence](integration-evidence.md).

- **2026-10-02** — Authorized: the user invoked `/ship`. Archived the completed change with already reconciled specs, numbered release 29.10.0 from main's 29.9.0, and checkpointed the final integration evidence for publishing. No external task prerequisite or relaxed check applies.

<!-- end proposal.md -->
<!-- file design.md utf8 6986 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 2787 -->
# Tasks

## 1. Existing discovery script

- [x] 1.1 Extend other-work discovery with chat titles, exact session IDs, and status, preserving same-repo filtering and multiple chats per workspace; cover duplicate titles, unrelated projects, archived/current sessions, unavailable Paseo, and unchanged git-only fallback in CI tests.
- [x] 1.2 Verify the installed Paseo send behavior for busy and idle recipients and document a direct invocation using explicit daemon routing and bounded foreground execution; verify the instructions never stop a peer, claim dispatch is agreement, or introduce a watcher or custom queue.

## 2. Workflow instructions and documentation

- [x] 2.1 Add a concise direct-coordination convention to the owning change-loop wiki and explicit same-repo message authorization to AGENTS.md; verify task ownership, brief context requests, and each task's publishing approval remain intact.
- [x] 2.2 Replace the unconditional overlap ask in explore and its workspace reference with owner contact before escalation; update relevant apply/continue and ship guidance to read agreements from existing plans and confirm published dependencies, preserving current gate and collision recovery. Verify every instruction links the same owner and no registration lifecycle or shared store is added.
- [x] 2.3 Add owner-managed chat-title updates at initial planning, resumption, and meaningful scope changes through the existing Paseo update command; verify task titles stay short, routine progress causes no rename, session/branch/plan identity stays unchanged, peer titles and shared workspace names are untouched, and discovery confirms scope from actual context even when a title is stale or an update fails.

## 3. Payload delivery

- [x] 3.1 Add one `## Next (minor)` changelog entry and adjust existing payload/area references only as needed, leaving VERSION unchanged; verify payload links, OpenSpec configuration, and instruction context budget with the required repository checks.
- [x] 3.2 Regenerate the review page and strictly validate the final change; verify the artifacts contain only direct messaging and existing-plan agreements rather than the superseded runtime-store design.

## 4. Integration evidence

- [x] 4.1 Use /save to run discovery coverage in CI and record the gate result for the actual pushed head; leave this task pending if the gate is failing or unverifiable.
- [x] 4.2 Exercise direct discovery and a brief proposal, context request, and owner reply between two disposable same-repo chats under test-only briefs; show agreements recorded in their existing plans, independent tasks continuing, and permissions preserved. Send no task to unrelated existing chats and publish no production change. Use /save if fixture fixes need CI evidence.

<!-- end tasks.md -->
<!-- file specs/other-work-check/spec.md utf8 3321 -->
# Spec Delta

## REMOVED Requirements

### Requirement: Planning names overlapping work and asks

**Reason**: Routine conflicts should be coordinated by the task owners rather than immediately passed to the person.

**Migration**: Use automatic cooperation for reachable owners, asking only when cooperation leaves a real outcome unresolved or the affected work cannot proceed with an unreachable owner.

## ADDED Requirements

### Requirement: Planning coordinates overlapping work with its owner

When planning repo work, the agent SHALL inspect this repo's other active work before its first question, including local worktrees, unsaved plans, and open pull requests. An overlap with a reachable task owner SHALL trigger cooperation about shared responsibility or dependencies, preserving each chat's own task. The person SHALL be asked only when an outcome remains unresolved, owners disagree, or the affected work cannot proceed independently with an unreachable owner. Unrelated work SHALL continue without a coordination question. Discovery SHALL run once during planning for a piece of work; later workflow boundaries SHALL refresh relevant task context without repeating the planning question round.

#### Scenario: Another workspace plans the same area

- **WHEN** the requested installer change overlaps an unsaved plan in a reachable workspace
- **THEN** the owners seek an agreement about the shared responsibility or integration order and continue their own independent portions
- **AND** the person is asked only if that cooperation cannot resolve the affected outcome

#### Scenario: Nothing overlaps

- **WHEN** other active work concerns unrelated outcomes
- **THEN** the task continues without mentioning the check or waiting for unrelated sessions

## MODIFIED Requirements

### Requirement: The check reads only this repo's live work

The check SHALL read only canonical worktrees of this repo, excluding unrelated repositories even when nested within one of its folders. It SHALL exclude the current session and archived sessions, while preserving distinct peer chats in one workspace, including a peer sharing the current worktree. A workspace SHALL count when it has unpublished work, a running agent, or a non-archived peer chat. With no verified peer chat, the current worktree SHALL remain excluded. Bot pull requests SHALL remain excluded, and a pull request SHALL fold into the worktree on its branch. When GitHub or Paseo is unavailable, discovery SHALL retain its git-only facts and report the limitation.

#### Scenario: Several chats share a workspace

- **WHEN** two peer chats have identical titles in the same canonical checkout
- **THEN** discovery preserves both exact session IDs and their status, excluding the caller's own session

#### Scenario: Paseo cannot answer

- **WHEN** Paseo is unavailable
- **THEN** discovery retains the previous git-only workspace and pull-request filtering with a limitation note

#### Scenario: Other projects on the same computer

- **WHEN** Paseo lists workspaces of this repo and of other projects
- **THEN** only this repo's workspaces reach the agent

#### Scenario: GitHub is unreachable

- **WHEN** the pull request lookup fails
- **THEN** the local workspaces are still listed, with a one-line note that open pull requests were not checked

<!-- end specs/other-work-check/spec.md -->
<!-- file specs/session-coordination/spec.md utf8 4684 -->
# Spec Delta

## Purpose

Let independent chats working on the same project resolve conflicting responsibilities and dependencies through brief direct messages, keeping agreements with their existing plans.

## ADDED Requirements

### Requirement: Chats keep ownership while cooperating directly

Same-repo task chats SHALL cooperate about overlapping work through Paseo by default. Each SHALL retain its own task, plan, branch, and publishing authorization. Titles SHALL help identify the relevant owner, and messages SHALL reach the verified intended session rather than rely on a title being unique. Unrelated and archived chats SHALL receive no automatic coordination messages, and unrelated work SHALL proceed independently.

#### Scenario: Two titles match

- **WHEN** more than one chat has the relevant title
- **THEN** the agent identifies the owner from the actual task and sends to that verified session without broadcasting

#### Scenario: A task overlaps another

- **WHEN** an existing same-repo chat owns conflicting work
- **THEN** the owners discuss only the overlap while each retains responsibility and permission for its own task

### Requirement: Owners keep chat titles aligned with their current task

Each owner SHALL keep its chat title a short description of its current task, updating it when the requested outcome or scope meaningfully changes. Ordinary progress SHALL NOT require a title change, and renaming SHALL preserve the session, branch, and plan identity. An owner SHALL NOT rename another chat. Discovery SHALL use current titles to find candidates and SHALL confirm relevant scope from existing task context or the owner rather than treating the title as complete or authoritative. A stale title or failed update SHALL NOT alone exclude relevant work.

#### Scenario: A task changes scope

- **WHEN** a chat's requested outcome meaningfully changes
- **THEN** its owner updates its short title and other chats can discover the new scope without losing the existing session or task identity

#### Scenario: The title is out of date

- **WHEN** the title does not describe relevant work visible in the plan or task context
- **THEN** discovery still considers that work and confirms the current scope from context or a brief owner question

### Requirement: Messages are brief and context can be requested

A coordination message SHALL briefly identify the sender's task and the conflict or question, referring to existing project context instead of copying transcripts or plans. A receiver SHALL be able to ask the owner for more context. Delivery alone and context responses SHALL NOT constitute agreement, completion, or publishing approval. Cooperation SHALL NOT stop or cancel the peer's running task.

#### Scenario: More context is needed

- **WHEN** an owner cannot assess a short proposal
- **THEN** it can ask a targeted question and receive a brief answer or reference before agreeing

#### Scenario: A message was dispatched

- **WHEN** Paseo acknowledges delivery of a proposal
- **THEN** the sender waits for an actual owner response before treating the proposal as accepted

### Requirement: Existing plans retain consequential agreements

Each affected owner SHALL record accepted shared responsibility or dependency order in its existing plan. The workflow SHALL introduce no separate persistent coordination store, custom delivery queue, or publishing lock. Resumed tasks SHALL recover agreements from their existing task context. The person SHALL be asked only for unresolved outcome choices or a conflict that cannot proceed with an unreachable owner.

#### Scenario: An owner resumes its task

- **WHEN** a chat resumes after agreeing to publish after another task
- **THEN** its existing plan identifies that dependency without requiring a coordination registry

### Requirement: Dependency cooperation preserves existing publishing safeguards

A task SHALL confirm an agreed prerequisite has published before publishing work that depends on it, incorporate the published changes into its own branch, and follow the existing gate for its resulting head. Approval for one task SHALL NOT authorize publishing another. Independent builds and saves SHALL continue without a custom global queue.

#### Scenario: A publishes before B

- **WHEN** the owners agree B needs A's published change
- **THEN** B continues independent work, confirms A's publication, incorporates it, and follows its own checks and publishing authorization

#### Scenario: A prerequisite is incomplete

- **WHEN** A is not published or a peer cannot be reached
- **THEN** B keeps the dependency unresolved and proceeds only with work that does not need it

<!-- end specs/session-coordination/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-02

~~~
<!-- end .openspec.yaml -->
<!-- file integration-evidence.md utf8 4963 -->
# Disposable chat integration evidence

Task 4.2 passed on 2026-10-02, 19:26–19:34 UTC, with installed Paseo CLI 0.10.1. The production implementation was unchanged during this exercise; its earlier CI gate passed for `0cad70c` in run `37053586778`.

## Test scope and recipients

- Existing workspace: `wks_7ce09a61077aba38`, canonical checkout `/root/.paseo/worktrees/2b9tffs3/warm-kangaroo`.
- Every operation used explicit daemon home `/root/.paseo`; no host route was set. Calls were bounded foreground operations.
- A: `652f0f1d-5bbe-4f4b-a4c0-5a0c97d93406`, title `Coordination fixture A`; owned an imaginary subtotal contract.
- B: `cd56edc3-75ee-41b5-9bb4-7b60686a5ad8`, title `Coordination fixture B`; owned its imaginary display.
- Both used the parent's `codex` provider, `gpt-6.1-sol` model, `high` thinking, and `full-access` mode in the existing workspace. Each test brief authorized only its own existing scratch plan and messages to its exact paired fixture ID. Neither had publishing permission.

## Observed exchange

1. A ran the production `other-work.mjs` helper with its own session ID and explicit home. It found B's exact ID, fresh title and `idle` status in the shared checkout and excluded itself. A read B's scratch plan before contacting it. B separately verified A with the helper's chat filtering and canonical checkout check; it did not run the helper's git discovery a second time.
2. A proposed: A owns the subtotal contract; B owns the display; hypothetical contract publication precedes dependent display publication. B recorded receipt with **no accepted agreement**.
3. B asked: “Is subtotal a decimal in currency units or integer minor units, and what example should the display expect?” A recorded receipt without treating the question as agreement.
4. A answered: decimal currency units, example `12.50`; the responsibility split and publication order remained pending B's actual acceptance.
5. B explicitly accepted the split and hypothetical order, stating that B would confirm A's publication and incorporate it before dependent publishing under B's own gate and approval. A recorded that actual acceptance, with no acknowledgement loop.

Immediately before all four peer sends, each sender inspected the exact paired Id and required `Archived=false`, `Status=idle`, `PendingPermissions=[]`. The controller also verified those fields before its four phase messages. Both fixtures returned idle between phases; dispatch returned `sent`, and agreement was recorded only after the actual acceptance. No busy recipient was interrupted, no unrelated chat received a task, and no stop/cancel operation was used.

## Existing plan excerpts at completion

A's own `.scratch/coordinate-task-sessions-live-20261002/A-plan.md`:

> Accepted agreement: A owns the decimal currency-unit `subtotal` contract; B owns the display. Hypothetically, B confirms A publication and incorporates it before dependent publishing under B's own gate and approval.
>
> Own publishing permission: none.

A independently completed ordinary sample `12.50` and boundary sample `0.00` before and after the exchange.

B's own `.scratch/coordinate-task-sessions-live-20261002/B-plan.md`:

> Accepted agreement: A owns the decimal currency-unit `subtotal` contract; B owns the display. Hypothetical A publication precedes dependent B publication.
>
> Neither task has publishing permission. Nothing is published in this test.

B independently completed label `Order subtotal`, placeholder layout `Order subtotal: <value>`, and final sample `Order subtotal: 12.50`.

Final plan SHA-256: A `7c7ab349d27da26226127acecabb358a95d3903b80c161f446decdfdfc1bc001`; B `0eebfc11efeede34cf48c79bf8864f5f18b775fe7a792558c095c2a4d2f36f2d`. These excerpts were captured after both owners finished, before fixture cleanup. The archived Paseo conversations retain the proposal, context request, owner answer, acceptance and tool activity under the exact IDs above; inspect them with `paseo logs <id> --home /root/.paseo`.

## Cleanup and limits

Both were freshly inspected idle with no permissions before archiving only those IDs. A archived at `19:33:33.098Z`; B at `19:33:56.751Z`. Post-archive inspection confirmed each exact ID had `Archived=true`, `Status=closed`, and no permissions. Removed only the test's scratch directory after retaining these excerpts. No workspace, branch, OpenSpec change, production file or publishing action was created by either fixture.

B's first test-only path check encountered an absent unrelated path; it corrected that scratch invocation and completed verification. No product fixture or implementation fix was needed. This controlled idle test validates discovery, targeted context exchange, independent ownership and approval preservation. It does not validate busy delivery or publish a real prerequisite; inspection remains non-atomic as the design states. No queue, watcher or persistent coordination registry was added.

<!-- end integration-evidence.md -->
<!-- file review.html utf8 40979 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-02-coordinate-task-sessions</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-02-coordinate-task-sessions">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-02-coordinate-task-sessions</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Adding tasks in separate chats should help you get more done. Chats should resolve overlapping work with each other through Paseo while each keeps responsibility for its own task.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Chats talk directly when their work overlaps.</b> Find the relevant chat by its title and task, send a brief message about the conflict, and ask its owner for more context when needed. Unrelated work keeps moving.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">   chat A ──▶ Paseo ──▶ chat B</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      ▲                    │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      └──── brief reply ───┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Chat titles stay current.</b> Each chat updates its short title when its task meaningfully changes, so other chats can find the relevant owner. They confirm the current scope from the plan or a brief question before relying on it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">    task changes ──▶ owner updates title</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                            │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                            ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">                  peers find and confirm</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Keep agreements with the work.</b> Each chat records important agreements in its existing plan, including who handles a shared responsibility and which task should publish first. Each keeps its own branch, checks, and publishing approval.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">    agree ──▶ each task's existing plan</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                      │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                      ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">              build and check own work</span></pre></div></details></li>
</ol>
<p class="aside">Non-goals: a shared coordination store, custom message queues, watchers, cleanup machinery, a publishing lock, a central supervisor, automatic workspaces, or cooperation across unrelated projects. Existing publishing safeguards remain in use.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-02</p>Asked whether coordination should be the default → the user requested it so sessions can figure out how to ship tasks together and let them work faster.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-02</p>Asked how chats should share responsibility → the user clarified that each chat must keep doing its own task, with coordination between chats when new tasks conflict.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-02</p>Asked how much context coordination should carry → the user requested brief messages, with the receiving agent able to ask the owner for more context, and asked whether runtime state cleans itself up.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: compact runtime state should clean itself up during coordination operations, because a temporary coordination layer should not require manual housekeeping; retain unresolved dependencies and live publishing ownership for correctness.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: start with existing workspaces of one local repo, because the request is about tasks added to Paseo and the existing discovery helper already finds those workspaces.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: keep each task's publishing authorization, because cooperating does not establish which unfinished tasks the person has approved to publish.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: use deterministic state, message receipts, and publishing exclusion, leaving scope judgments to agents, because reliable coordination needs more than instructions telling chats to talk.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: retain separate task branches and changes, because they already support independent review and a shared publishing order gives the requested cooperation without combining unrelated outcomes.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-02</p>Asked why coordination needs files rather than chat titles → the user challenged the additional machinery and said it seemed like extra complexity.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: simplify to title-based discovery and direct Paseo messages, because this preserves independent chats and addresses conflicts without the runtime store the user challenged. This supersedes the earlier assumptions about shared state, cleanup, watchers, and publishing exclusion.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: resolve the selected title to its existing Paseo session ID before sending, because titles can repeat or change and delivery must reach the intended owner.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-02</p>Asked whether current titles matter for finding context → the user identified that title-based discovery needs titles to follow the task as its scope changes.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: update a chat's title on meaningful scope changes and confirm candidates from actual task context, because per-message renaming adds noise and a short title cannot fully describe the work.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-02</p>Verified: installed Paseo CLI 0.10.1 <code>dist/commands/agent/send.js</code> calls <code>sendAgentMessage</code> without <code>activeTurnBehavior</code>; server <code>dist/server/server/session.js</code> defaults to <code>interrupt</code>. <code>agent/agent-manager.js</code> replaces and cancels a turn when native steering is unsupported. The workflow therefore contacts freshly verified idle owners without pending permissions and keeps busy or uncertain delivery pending; no custom queue or watcher is added.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: preserve peer chats sharing the current checkout and clean idle peer workspaces, because title discovery must find separate chats in one workspace. The existing git-only fallback still excludes the current checkout and clean inactive worktrees.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-02</p>Verified: current CLI listing exposes <code>id</code>, <code>name</code>, <code>status</code>, and <code>cwd</code>; discovery maps <code>name</code> to chat title, verifies actual git roots, and gives explicit <code>PASEO_HOST</code> routing precedence over <code>PASEO_HOME</code>.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: the change-loop section links a detailed task-chat procedure, because putting all command guidance in the eagerly loaded owner would exceed the named-secret route's existing context budget. Existing workflow instructions link the same change-loop section.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: checkpoint the implemented discovery and workflow changes for gate task 4.1; static checks pass, while CI coverage and disposable-chat evidence remain pending.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-02</p>Assumed: mark gate task 4.1 complete after commit <code>0cad70c</code> passed all checks (payload run <code>37053586778</code>); the first run exposed a missing knowledge-area entry, which was added without changing or loosening checks. Disposable-chat evidence remains pending.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-02</p>Verified: task 4.2 passed in two disposable same-repo chats using the parent's provider/model/thinking/mode. Exact-ID discovery, proposal, targeted context request, owner answer, actual acceptance, owner-written existing-plan agreements, independent progress and unchanged publishing permissions were observed. Both idle fixtures were archived and their scratch files removed; no production change was published. See <a href="integration-evidence.md">integration evidence</a>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-02</p>Authorized: the user invoked <code>/ship</code>. Archived the completed change with already reconciled specs, numbered release 29.10.0 from main's 29.9.0, and checkpointed the final integration evidence for publishing. No external task prerequisite or relaxed check applies.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
