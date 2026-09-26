## ADDED Requirements

### Requirement: The link check rejects links through a symlink

The payload link check SHALL fail when a live Markdown link's path passes through a symbolic link in the git tree. The failure SHALL name the file, the link, and the real path to use. Code spans and shell commands SHALL NOT be checked by this rule.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the link check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: A command names `.claude/`

- **WHEN** a skill's shell command runs `.claude/skills/memory/scripts/memory.mjs`
- **THEN** the link check does not report it
