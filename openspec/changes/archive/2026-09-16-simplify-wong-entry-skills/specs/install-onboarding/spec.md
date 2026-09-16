## REMOVED Requirements

### Requirement: Agent-agnostic runbook

**Reason**: Replace the prescribed seed and tool interview with the normal agent workflow.
**Migration**: Use source skills as the fallback and configure the planning home for the active agent.

### Requirement: Research before the conversation

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Pain discovery and diagnosis via the fit playbook

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Honest fit verdict with a first-class not-a-fit exit

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Consultation is skippable

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Setup scope is making wong-sync runnable, then handing off

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Bootstrap from zero

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Plain-language, one-thing-at-a-time narration

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: End with a real first step

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: wong-setup offers the stack pack as an opt-in

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Git identity is derived from GitHub, not requested

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Setup seeds every wiki hub the payload links to

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Setup corrects OpenSpec's closing instruction

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

## ADDED Requirements

### Requirement: Setup enters the normal workflow

`/wong-setup` SHALL obtain current WongStack source and invoke `/explore` with the intent to adopt WongStack in the target repo. It SHALL use local workflow skills where present and source skills where absent, resolving source references in the source checkout while keeping all planned work scoped to the target. It SHALL delegate later stages to the normal skills according to user intent.

#### Scenario: New repo without installed skills
- **WHEN** the user asks to evaluate WongStack in a target without workflow skills
- **THEN** setup invokes the source `/explore` skill against the target
- **AND** no payload or seed record is written during exploration

#### Scenario: User requests installation
- **WHEN** the user has asked to install WongStack
- **THEN** setup carries that intent through `/explore`, `/plan`, `/apply`, and `/save`
- **AND** required planning tools are prepared at the point of need before the target plan is drafted

#### Scenario: Existing installation
- **WHEN** a real install record exists
- **THEN** setup invokes `/wong-sync` with the existing context

### Requirement: Installation preserves the target and records the result

The normal installation plan SHALL use the payload inventory, preserve existing repo content, include required wiki hubs and environment ignore rules, and record the completed install version and commit. Git and GitHub work SHALL remain with `/save`, `/continue`, or `/ship`. Optional Cloudflare work SHALL use `/wong-cloudflare` when requested. Setup itself SHALL remain source-only.

#### Scenario: Empty folder
- **WHEN** the target has no repo or planning layer
- **THEN** setup prepares planning prerequisites when needed and includes target initialization in the workflow
- **AND** `/save` owns repo initialization, identity, commits, and remote setup

#### Scenario: Existing project
- **WHEN** the target already has instructions, docs, or skills
- **THEN** the plan adapts the payload to those files and preserves local content outside the agreed change
- **AND** optional hosting or scaffold components stay disabled unless selected

#### Scenario: Completed install
- **WHEN** `/apply` completes the installation tasks
- **THEN** the target has its required wiki hubs, environment ignore rules, and an install record for the implemented source
- **AND** the normal `/save` checkpoint follows

### Requirement: Setup supports the active coding agent

Setup SHALL work with any coding agent that can read skills, edit files, and run shell commands. Missing host skill invocation tools SHALL fall back to reading and following the relevant SKILL.md. The target planning home SHALL be initialized for the active agent.

#### Scenario: Non-Claude setup
- **WHEN** the user runs setup in another capable coding agent
- **THEN** source skill files provide a usable workflow and planning is configured for that agent
