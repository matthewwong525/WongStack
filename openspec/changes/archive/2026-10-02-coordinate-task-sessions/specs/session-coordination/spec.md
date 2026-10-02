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
