## MODIFIED Requirements

### Requirement: Separate parts are asked about once
When a request holds two or more parts that could each be planned and published alone, the agent SHALL ask once, in `/explore`'s exit round: open a new workspace for each other part *(Recommended)*, do them here one at a time, or keep them as one change. Steps of one change SHALL NOT count as parts. Without a running Paseo, the question SHALL leave out new workspaces and say they need Paseo.

#### Scenario: Three parts with Paseo
- **WHEN** a person asks for three separately publishable changes in one message, on a host with a running Paseo daemon
- **THEN** the exit round lists the three parts and asks once, with the new-workspace option first and recommended

#### Scenario: No Paseo
- **WHEN** the same request runs on a host without `paseo` on PATH
- **THEN** the question offers only one at a time here or one change, and says new workspaces need Paseo

### Requirement: The next work is offered in a new workspace
When `/ship` finishes and more work the person asked for remains, its closing question SHALL offer to open the next piece in a new workspace *(Recommended)*, or stop. When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A and the queued part B has no workspace yet
- **THEN** the closing question offers to open B in a new workspace, first and recommended, and stopping

#### Scenario: Continue from a busy workspace
- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch
