# multi-part-workspaces Specification

## Purpose
Gives each separately publishable part of a request its own Paseo workspace, so parts never share a chat or a branch, and the person chooses in one question whether to open them.

## Requirements

### Requirement: Separate parts are asked about once
When a request holds two or more parts that could each be planned and published alone, the agent SHALL list the parts and put one multiple-choice question in `/explore`'s exit round: do the first part here and open a new workspace for each other part *(Recommended)*, do them here one at a time, or keep them as one change. The steps of one change SHALL NOT be offered as parts. When Paseo is not installed or its daemon does not answer, the question SHALL omit the new-workspace option and say that it needs Paseo.

#### Scenario: Three parts with Paseo
- **WHEN** a person asks for three separately publishable changes in one message, on a host with a running Paseo daemon
- **THEN** the exit round lists the three parts and asks once, with the new-workspace option first and recommended

#### Scenario: No Paseo
- **WHEN** the same request runs on a host without `paseo` on PATH
- **THEN** the question offers only one at a time here or one change, and says new workspaces need Paseo

### Requirement: A yes opens one standalone workspace per other part
On a yes, the agent SHALL keep the first part and SHALL open one new Paseo workspace for each other part, before it drafts its own plan. Each workspace SHALL be a new worktree branched from the latest remote default branch of the primary worktree, and SHALL run a new agent titled after its part, with the provider, model, thinking option, and mode of the agent that opened it. The new agent SHALL NOT be a sub-agent of the opening agent. The reply SHALL name each opened workspace and its part.

#### Scenario: Opened from a feature workspace
- **WHEN** a chat in a linked worktree on an unpublished branch opens a workspace for part B
- **THEN** B's worktree starts from the remote default branch, not from the chat's branch, and B's agent has no parent agent

#### Scenario: Settings follow the chat
- **WHEN** the opening agent runs Claude with model `claude-opus-5-5` in `bypassPermissions` mode
- **THEN** the new agent runs the same provider, model, and mode

### Requirement: A new workspace plans its part and waits
Each new agent's first message SHALL start with `/plan` and carry a brief: the part in the person's words, the answers settled for it, the other parts and where each is being done, and any part it builds on with that part's state. The new agent SHALL stop at its plan's review link and *build it now?*. A part that builds on another SHALL open with the others and SHALL NOT wait for that part to publish.

#### Scenario: Dependent part
- **WHEN** part B builds on part A, which this chat is building
- **THEN** B's workspace opens at once, its brief says A is being built here, and B's plan records that it builds on A

### Requirement: The next work is offered in a new workspace
When `/ship` finishes and the conversation or a memory thread names more work the person asked for, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)* beside stopping. When a new change is asked for in a workspace that holds another unpublished change, or `/continue` would switch this workspace away from other unpublished work, the agent SHALL offer a new workspace for it before planning or checking out anything. `/continue`'s new workspace SHALL check out the change's recorded branch.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Continue from a busy workspace
- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch

### Requirement: No workspace without a person or Paseo
An unattended run SHALL NOT open a workspace; it SHALL do the first part and record the rest as a memory thread. When Paseo cannot open a workspace, the agent SHALL open nothing, SHALL say whether Paseo is missing or its daemon does not answer, and SHALL carry on with the parts one at a time here.

#### Scenario: Scheduled run finds two parts
- **WHEN** a scheduled `/improve` run finds two separately publishable fixes
- **THEN** it opens no workspace, ships one fix, and records the other as a thread

#### Scenario: Daemon down
- **WHEN** the person chooses new workspaces and the Paseo daemon does not answer
- **THEN** no workspace opens, the reply says the daemon does not answer, and the first part carries on here

### Requirement: A new workspace carries its part's name
Each workspace the agent opens SHALL show its part's short title as its name in Paseo's workspace list, the same title its agent gets, whether it branches off the default branch or checks out a saved change's branch. When Paseo opens the workspace but refuses the name, the workspace and its agent SHALL still run, and the report SHALL say the workspace kept Paseo's own name.

#### Scenario: Named after its part
- **WHEN** the agent opens a new workspace for the part "Release collisions"
- **THEN** Paseo's workspace list shows that workspace as "Release collisions", not a generated name like `nifty-leopard`

#### Scenario: The name is refused
- **WHEN** the workspace opens but Paseo refuses to rename it
- **THEN** the agent still reports the opened workspace and its agent, with a warning that it kept Paseo's name
