# agent-config-layout Specification

## Purpose

Keep every agent's project configuration in one real `.agents/` folder, with `.claude` and `.codex` as links to it, so the source and every install have one copy of each skill, rule, hook, and setting.

## Requirements

### Requirement: One real agent folder with a link per agent

The WongStack source and every new install SHALL keep skills, rules, hooks, and agent settings in one real `.agents/` folder. `.claude` and `.codex` SHALL be symbolic links to `.agents`. No payload file SHALL exist at a real path under `.claude/` or `.codex/`. The Codex project settings SHALL be at `.agents/config.toml`, and the Codex `SessionStart` hook SHALL be at `.agents/hooks.json`. The Claude settings SHALL stay at `.agents/settings.json`.

#### Scenario: The source tree has one real folder

- **WHEN** a reader lists the source repository's root
- **THEN** `.agents` is a directory, and `.claude` and `.codex` are links whose target is `.agents`
- **AND** git records no file under a `.claude/` or `.codex/` path

#### Scenario: A new install gets the same layout

- **WHEN** setup installs WongStack into an empty folder
- **THEN** the target has a real `.agents/` folder with the payload, and `.claude` and `.codex` links to it

### Requirement: Each agent loads the shared folder correctly

Codex SHALL read `.codex/config.toml` and `.codex/hooks.json` through the link, and SHALL load each skill once, not once through `.agents/skills` and again through `.codex/skills`. Claude Code SHALL read `.claude/settings.json`, `.claude/skills`, and `.claude/rules` through the link. Neither agent SHALL fail on the other agent's files in the shared folder. Where a probe shows that an agent does not meet one of these conditions, the change SHALL keep that agent's files at a real path and record why.

#### Scenario: Codex follows the link once

- **WHEN** a trusted Codex session starts in a checkout with the shared layout
- **THEN** `request_user_input` is available in Default mode and the memory digest loads
- **AND** each WongStack skill appears once in the skill list

#### Scenario: Claude ignores Codex files

- **WHEN** a Claude Code session starts in the same checkout
- **THEN** the memory digest loads from `.claude/settings.json`
- **AND** `config.toml` and `hooks.json` cause no error or warning
