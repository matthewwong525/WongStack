# agent-knowledge-center Specification

## Purpose
How WongStack presents and documents its core philosophy: a repo-native AI knowledge center where processes, active work, shipped decisions, and reusable lessons are centralized in files that humans can review and agents can run.

## Requirements
### Requirement: WongStack documents the repo as an AI knowledge center

WongStack SHALL define itself in user-facing docs as a repo-native AI knowledge center: a system where processes, active work, shipped decisions, and reusable lessons are centralized in files that humans can review and agents can run.

#### Scenario: Reader sees the top-level thesis

- **WHEN** a reader opens the README
- **THEN** the first section frames WongStack as turning a repo into an AI knowledge center
- **AND** it explains that agents need shared process knowledge to work effectively

#### Scenario: Philosophy has an owning wiki page

- **WHEN** a reader wants more than the README pitch
- **THEN** the wiki links to a page that explains the AI knowledge center philosophy and the repo surfaces that support it

### Requirement: The docs state the six working principles

The philosophy page SHALL state the six working principles behind WongStack in plain, impersonal prose, and the README SHALL link to that page. The principles are: building in-house is about speed and quality, not saving money; most process improvements should be code, not AI; consolidate the processes and the data in one place you own; using AI must not require a complicated setup (no local dev environment, minimum dependencies); context has to survive the session; give AI as much access as you can, and as little autonomy as it needs.

#### Scenario: Reader finds the principles

- **WHEN** a reader opens the philosophy page
- **THEN** they see the six principles stated plainly
- **AND** each principle points to the repo mechanism that applies it (Cloudflare pack, the change loop, the knowledge surfaces, PR review and tests)

#### Scenario: The setup is presented as adaptable

- **WHEN** a reader reviews the philosophy page
- **THEN** it presents the setup as one way of working that a team can adapt, not a doctrine
- **AND** it contains no first-person founder framing

#### Scenario: Autonomy principle explains the gates

- **WHEN** a reader asks why humans stay in the loop
- **THEN** the philosophy page explains that AI does not disobey instructions, it misinterprets them
- **AND** it names the standardized gates: the reviewed plan, PR review, tests, and Zero Trust

#### Scenario: Consolidation principle covers process and data

- **WHEN** a reader reads the consolidation principle
- **THEN** it states that a process written as code is also the record of how the work is done
- **AND** that the business data sits behind that code, so an agent can read the process and the records together
- **AND** it explains that this is what makes access to an agent worth granting

### Requirement: The docs use matter-of-fact language

The README and philosophy page SHALL describe WongStack in matter-of-fact terms. They SHALL NOT use the labels "AI-native" or "the compounding loop" or equivalent sales-style framing.

#### Scenario: Buzzwords are absent

- **WHEN** a reader searches the README and philosophy page
- **THEN** the phrases "AI-native" and "compounding loop" do not appear

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

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and `/dream` SHALL be presented as the mechanism that lets each project leave more useful context for the next person or agent.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
