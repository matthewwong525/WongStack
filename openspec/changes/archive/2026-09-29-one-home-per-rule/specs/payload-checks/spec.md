## MODIFIED Requirements

### Requirement: The link check catches links a target or GitHub cannot follow

This SHALL be the one requirement for payload link checks. Every internal link in a payload file SHALL resolve in a fresh install, so every page a skill cites as an owner SHALL itself ship; the check SHALL resolve links against a target's file set, not this repo, treating a path as present only when setup writes it. It SHALL fail on a live Markdown link that resolves nowhere in a target or passes through a symbolic link, naming the real path, and on a README `raw.githubusercontent.com` URL that passes through one, because GitHub returns a 404 for it. A skill that stays in the source repo SHALL have its links resolved against the source repo, heading anchors included. Code spans and commands SHALL NOT be checked.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: Setup links a renamed heading

- **WHEN** `wong-setup` links `../memory/SKILL.md#background-run` and that heading was renamed
- **THEN** the check fails and names the file and the missing anchor

#### Scenario: A link resolves only in the source

- **WHEN** a payload page links a page only WongStack's own wiki has
- **THEN** the release check fails until the example is generalized or dropped
