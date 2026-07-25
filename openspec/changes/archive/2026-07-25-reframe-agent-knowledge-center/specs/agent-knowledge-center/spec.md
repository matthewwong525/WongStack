## ADDED Requirements

### Requirement: WongStack documents the repo as an AI knowledge center

WongStack SHALL define itself in user-facing docs as a repo-native AI knowledge center: a system where processes, active work, shipped decisions, and reusable lessons are centralized in files that humans can review and agents can run.

#### Scenario: Reader sees the top-level thesis

- **WHEN** a reader opens the README
- **THEN** the first section frames WongStack as turning a repo into an AI knowledge center
- **AND** it explains that agents need shared process knowledge to work effectively

#### Scenario: Philosophy has an owning wiki page

- **WHEN** a reader wants more than the README pitch
- **THEN** the wiki links to a page that explains the AI knowledge center philosophy and the repo surfaces that support it

### Requirement: The philosophy maps knowledge surfaces to repo files

The knowledge-center documentation SHALL name the durable surfaces WongStack uses: agent instructions, the progressive-disclosure wiki, active OpenSpec changes, archived changes, and skills. It SHALL explain what each surface owns without duplicating operational details owned by deeper docs.

#### Scenario: Reader understands where knowledge lives

- **WHEN** a reader reviews the philosophy page
- **THEN** they can identify where reusable process, active plans, shipped records, and repeatable agent actions live in the repo

#### Scenario: Details remain linked

- **WHEN** the philosophy page names a deeper process such as the change loop or wiki structure
- **THEN** it links to the owning page instead of restating the full procedure

### Requirement: The docs present WongStack as agent-agnostic

WongStack SHALL describe Claude Code as a supported starting point, not the boundary of the system. User-facing docs SHALL state that the durable interface is repo files, instructions, and process, and that another coding agent can run WongStack when it can read files, edit files, run shell commands, and follow the skill runbooks.

#### Scenario: Non-Claude agent user reads the README

- **WHEN** a user works with Codex, Cursor, or another coding agent
- **THEN** the README does not imply WongStack is only for Claude Code
- **AND** it states the practical capabilities an agent needs to follow the workflow

### Requirement: Knowledge capture is part of execution

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and `/dream` SHALL be presented as the mechanism that lets each project leave more useful context for the next person or agent.

#### Scenario: Reader understands the compounding loop

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see the sequence: centralize the process, let agents run it, capture what happens, improve the process, and make future work faster
