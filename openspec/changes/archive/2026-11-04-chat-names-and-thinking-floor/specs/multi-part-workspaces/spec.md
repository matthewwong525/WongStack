## MODIFIED Requirements

### Requirement: A yes opens one standalone workspace per other part
On a yes, the agent SHALL keep the first part and SHALL open one new Paseo workspace for each other part, before it drafts its own plan. Each workspace SHALL be a new worktree branched from the latest remote default branch of the primary worktree, and SHALL run a new agent titled after its part, with the provider, model, thinking option, and mode of the agent that opened it. A thinking option below medium SHALL become medium; an unset one SHALL stay unset only when the model's default is medium or more, else SHALL become medium. The agent SHALL open the workspace only through the launcher, never by a raw `paseo run --new-workspace --new-branch` or Paseo's Handoff skill. The new agent SHALL NOT be a sub-agent of the opening agent. The reply SHALL name each opened workspace and its part.

#### Scenario: Opened from a feature workspace
- **WHEN** a chat in a linked worktree on an unpublished branch opens a workspace for part B
- **THEN** B's worktree starts from the remote default branch, not from the chat's branch, and B's agent has no parent agent

#### Scenario: Settings follow the chat
- **WHEN** the opening agent runs Claude with model `claude-opus-5-5` in `bypassPermissions` mode
- **THEN** the new agent runs the same provider, model, and mode

#### Scenario: Low thinking is raised
- **WHEN** the opening agent thinks at `low`, or at an unset level on a model whose default is low
- **THEN** the new agent thinks at `medium`; an opener at `high` keeps `high`
