## MODIFIED Requirements

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The URL SHALL name the file's real path in the git tree, `.agents/skills/wong-setup/SKILL.md`, not a path through the `.claude` link. The prompt and surrounding copy SHALL frame WongStack first as a personal AI assistant that remembers the person and gets things done, built on a repo that keeps its knowledge. The README SHALL tell the user to start in an empty folder, and SHALL name a Cloudflare account and one user token as requirements. The README SHALL name a place to run the prompt that needs no terminal, such as the Claude desktop app, while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup gives them an assistant, starts in an empty folder, and needs a Cloudflare account

#### Scenario: A reader without a terminal

- **WHEN** a non-technical reader looks for where to paste the prompt
- **THEN** the README names an app they can use without a terminal

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions
