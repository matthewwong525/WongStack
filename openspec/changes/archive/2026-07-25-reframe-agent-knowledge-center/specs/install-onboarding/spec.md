## MODIFIED Requirements

### Requirement: Honest fit verdict with a first-class not-a-fit exit

After research and any discovery, `wong-setup` SHALL guide the user through onboarding and process alignment. It SHALL stop without changing the repo when a hard playbook disqualifier holds (e.g. a non-GitHub forge, no willingness to use git, a locked-in workflow the loop would fight, no ongoing changes to manage), explain the mismatch plainly, and suggest an alternative from the playbook. Public-facing wording SHALL NOT repeatedly foreground fit verdicts or make setup feel like an admissions test; mismatch handling remains a safety exit for cases where the workflow cannot operate.

#### Scenario: Hard mismatch stops setup

- **WHEN** discovery reveals the team hosts on a non-GitHub forge and won't move
- **THEN** the skill states the mismatch plainly, offers what to consider instead, and makes no changes to the repo

#### Scenario: Normal onboarding is not framed as denial

- **WHEN** the README or setup runbook introduces WongStack to a newcomer
- **THEN** it presents setup as guided onboarding into a repo-native knowledge workflow
- **AND** it does not repeatedly emphasize "not a good fit" as the main product promise

#### Scenario: Recommendation still maps user needs to verbs

- **WHEN** discovery surfaces needs the verbs address and no disqualifier holds
- **THEN** the skill summarizes how WongStack's commands and knowledge surfaces address those needs and proceeds to setup after consent

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in the repo

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions
