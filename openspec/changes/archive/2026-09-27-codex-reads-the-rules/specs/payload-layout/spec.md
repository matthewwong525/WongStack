## MODIFIED Requirements

### Requirement: One real agent folder with a link per agent

The source and every install SHALL keep skills, rules, hooks, and agent settings in one real `.agents/` folder, with `.claude` and `.codex` as links to it and no payload file at a real path under either. The source and every install SHALL keep the `WONG-STACK` block in a real `AGENTS.md`, with `CLAUDE.md` as a link to it, so Claude Code and Codex read the same rules.

#### Scenario: A new install gets the layout

- **WHEN** setup installs WongStack into an empty folder
- **THEN** `.agents/` is a directory holding the payload, and `.claude` and `.codex` link to it

#### Scenario: Both agents read the rules

- **WHEN** setup installs WongStack into an empty folder
- **THEN** `AGENTS.md` is a real file holding the `WONG-STACK` block, and `CLAUDE.md` is a link to it
