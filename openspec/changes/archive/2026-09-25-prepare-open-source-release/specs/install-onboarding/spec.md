## MODIFIED Requirements

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The URL SHALL name the file's real path in the git tree, `.agents/skills/wong-setup/SKILL.md`, not a path through the `.claude` link. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL tell the user to start in an empty folder, and SHALL name a Cloudflare account and one user token as requirements. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in an empty folder and needs a Cloudflare account

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions

### Requirement: Setup provisions the memory store

The installation plan SHALL include setup's provisioning step, and SHALL install the session-start hooks and the `memory` skill. Setup SHALL ask for the Cloudflare user token before the install is planned. When no token is available, setup SHALL stop before it writes any file, and SHALL say what the token is for and where to create it. It SHALL NOT report the install as complete with memory or hosting working when no store or Worker exists.

#### Scenario: A token is available

- **WHEN** the installation tasks run with a Cloudflare user token in `.env`
- **THEN** the memory store and the app are provisioned, and the install record lists the store under `components.memory`

#### Scenario: No token yet

- **WHEN** a user starts setup without a Cloudflare token
- **THEN** setup writes nothing, and it gives the click path for the token and says that pasting it continues setup

## ADDED Requirements

### Requirement: Setup starts from an empty folder

`/wong-setup` SHALL install WongStack only into an empty folder, or a folder whose only entries are `.git` with no commits. For any other folder it SHALL stop before planning, write nothing, and say that setup starts from an empty folder. A folder that already has an install record SHALL still go to `/wong-sync`. The install SHALL always include the core payload, the Cloudflare pipeline, the starter app, and the UI pages, with no component question.

#### Scenario: An empty folder installs

- **WHEN** a user runs setup in an empty folder with a Cloudflare token
- **THEN** setup plans and applies the full install without asking which components to take

#### Scenario: A folder with files stops

- **WHEN** a user runs setup in a folder that has files and no install record
- **THEN** setup writes nothing and says that it starts from an empty folder

#### Scenario: An installed repo syncs

- **WHEN** a user runs setup in a repo with `.claude/.wong-stack.json`
- **THEN** setup goes to `/wong-sync`
