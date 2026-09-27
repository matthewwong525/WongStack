## ADDED Requirements

### Requirement: Payload checks skip script tests on a docs-only change

When every path a branch changes is under `wiki/` or `openspec/`, the payload checks SHALL skip lint, shell checks, and the script suite, and SHALL still run the private-name scan and the release checks. Markdown anywhere else, skill text included, and a change with no base to compare SHALL run every check. The required `payload` check SHALL still report.

#### Scenario: A wiki-only branch

- **WHEN** a branch changes only a wiki page
- **THEN** the payload job skips lint, shell checks, and the script suite, and runs the private-name scan and release checks

#### Scenario: Skill text changes

- **WHEN** a branch changes only a skill's Markdown
- **THEN** the payload job runs every check
