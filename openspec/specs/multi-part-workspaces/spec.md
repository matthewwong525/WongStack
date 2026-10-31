# multi-part-workspaces Specification

## Purpose
Gives each separately publishable part of a request its own Paseo workspace, so parts never share a chat or a branch, and the person chooses in one question whether to open them.

## Requirements

### Requirement: Separate parts are asked about once
When a request holds two or more parts that could each be planned and published alone, the agent SHALL ask once, in `/explore`'s exit round: open a new workspace for each other part *(Recommended)*, do them here one at a time, or keep them as one change. Steps of one change SHALL NOT count as parts. Without a running Paseo, the question SHALL leave out new workspaces and say they need Paseo.

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

### Requirement: No workspace without a person or Paseo
An unattended run SHALL NOT open a workspace; it SHALL do the first part and record the rest as a memory thread. When Paseo cannot open a workspace, the agent SHALL open nothing, SHALL say whether Paseo is missing or its daemon does not answer, and SHALL carry on with the parts one at a time here.

#### Scenario: Scheduled run finds two parts
- **WHEN** a scheduled run's work turns out to hold two separately publishable parts
- **THEN** it opens no workspace, does the first part, and records the other as a thread

#### Scenario: Daemon down
- **WHEN** the person chooses new workspaces and the Paseo daemon does not answer
- **THEN** no workspace opens, the reply says the daemon does not answer, and the first part carries on here

### Requirement: A new workspace carries its part's name
Each workspace the agent opens SHALL show its part's short title as its name in Paseo's workspace list, the same title its agent gets, whether it branches off the default branch or checks out a saved change's branch. The name SHALL read as plain words: a code-style title SHALL be turned into words, a workspace that picks up a saved plan SHALL take the plan's title, and a placeholder title such as `main` or `hello-world` SHALL be refused before anything opens. When Paseo opens the workspace but refuses the name, the workspace and its agent SHALL still run, and the report SHALL say the workspace kept Paseo's own name.

#### Scenario: Named after its part
- **WHEN** the agent opens a new workspace for the part "Release collisions"
- **THEN** Paseo's workspace list shows that workspace as "Release collisions", not a generated name like `nifty-leopard`

#### Scenario: A code-style or placeholder title
- **WHEN** the agent opens a workspace titled `customer-brain-confidence`, or one titled `main`
- **THEN** the first shows as "Customer brain confidence", and the second opens nothing and asks for a title that says what the work is

#### Scenario: The name is refused
- **WHEN** the workspace opens but Paseo refuses to rename it
- **THEN** the agent still reports the opened workspace and its agent, with a warning that it kept Paseo's name

### Requirement: Work that would displace unpublished work opens elsewhere

When new or resumed work would displace another unpublished change in this workspace, the agent SHALL offer a new workspace first and SHALL switch nothing here until the person answers. A resumed change's workspace SHALL open on its recorded branch.

#### Scenario: Continue from a busy workspace

- **WHEN** `/continue add-auth` runs in a workspace holding uncommitted work of another change
- **THEN** the options include opening `add-auth`'s branch in a new workspace, recommended, and nothing in this workspace changes branch

### Requirement: A new workspace on a saved branch opens only reviewed work

Opening a saved branch in a new workspace SHALL apply the same review as `/continue`'s switch, before the workspace exists. When the branch holds commits new to this computer, the workspace SHALL NOT open until the person has said yes to the exact newest commit. It SHALL then open on that commit, so the workspace's setup runs only what the person saw. A newer commit saved after the review SHALL stop the open, and the workspace's starting commit SHALL be checked against the reviewed one.

#### Scenario: A busy workspace picks up a teammate's branch

- **WHEN** `/continue` runs in a workspace holding other unpublished work, on a teammate's branch new to this computer
- **THEN** it shows that branch's changed files and asks before offering a new workspace, and no workspace opens without a yes

#### Scenario: The open names no reviewed commit

- **WHEN** the workspace script is asked to open a branch holding commits new to this computer without the reviewed commit, or with one that is no longer the newest
- **THEN** it opens nothing and returns the commits and files to review

#### Scenario: The teammate saves again during the open

- **WHEN** the person reviewed commit A and the teammate's newer commit B reaches the remote before the workspace opens
- **THEN** the new workspace starts at A or does not open, and its setup never runs B's files

#### Scenario: The new workspace asks before building

- **WHEN** a new workspace opens on reviewed work and its first message also carries the person's instruction
- **THEN** its agent recaps and asks before building, and runs no install, test, or `/apply` first

### Requirement: A brief of any shape opens its workspace

Opening a workspace SHALL pass its brief to the new agent as its first message whatever the brief's first character, a list dash included, and SHALL never read the brief as a command option.

#### Scenario: A brief written as a list

- **WHEN** /daily opens a workspace with a brief whose first line is `- **Goal**: …`
- **THEN** the workspace opens and its agent's first message is that brief, unchanged

### Requirement: A publish opens the next work, then closes
When `/ship` finishes in a Paseo worktree, it SHALL open each asked-for part with no workspace yet in a new workspace, then run `/close`, with no closing question. Outside a Paseo worktree, its closing question SHALL offer the next part *(Recommended)* when one remains, a walk of the merged app, and stopping. A failed live look, or a `/ship` that `/close` invoked, SHALL NOT close.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A from a Paseo worktree and the asked-for part B has no workspace yet
- **THEN** it opens B in a new workspace, then runs `/close`

#### Scenario: Nothing left after a publish
- **WHEN** `/ship` merges from a Paseo worktree and no other asked-for work waits
- **THEN** it runs `/close` with no question

#### Scenario: Outside Paseo
- **WHEN** `/ship` merges outside a Paseo worktree and part B remains
- **THEN** the closing question offers B first and recommended

### Requirement: A script can open a tagged workspace and find it again

A repo's own script SHALL be able to open a workspace through the same opener a person's chat uses, with the same checks, and MAY give it one `key=value` tag that Paseo keeps on the new agent. A tag with any other shape SHALL be refused before anything opens.

#### Scenario: A tool opens a tagged chat

- **WHEN** a repo script opens a workspace with the tag `job=42`
- **THEN** the workspace opens as one a person would open, and listing agents tagged `job=42` finds it

#### Scenario: An unsafe tag

- **WHEN** a script asks for the tag `job=42; rm -rf ~`
- **THEN** the opener refuses it and no workspace opens
