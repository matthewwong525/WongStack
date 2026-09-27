## MODIFIED Requirements

### Requirement: The link check catches links a target or GitHub cannot follow

The link check SHALL fail on a live Markdown link that resolves nowhere in a target or passes through a symbolic link, naming the real path. A skill that stays in the source repo SHALL have its links resolved against the source repo, heading anchors included. Code spans and commands SHALL NOT be checked.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: Setup links a renamed heading

- **WHEN** `wong-setup` links `../memory/SKILL.md#background-run` and that heading was renamed
- **THEN** the check fails and names the file and the missing anchor
