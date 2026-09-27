# Spec Delta

## MODIFIED Requirements

### Requirement: The next work is offered in a new workspace
When `/ship` finishes and more work the person asked for remains, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)*, or stop. When `/ship` merged from a Paseo worktree, the closing question SHALL also offer *Close this workspace*, recommended when no next work is waiting. When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Nothing left after a publish
- **WHEN** `/ship` merges from a Paseo worktree and no other work the person asked for is waiting
- **THEN** the closing question offers *Close this workspace* first and recommended

#### Scenario: Continue from a busy workspace
- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch
