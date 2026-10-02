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
