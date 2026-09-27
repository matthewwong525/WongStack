## ADDED Requirements

### Requirement: Payload checks skip script tests on a docs-only change

When every path a branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/` or `openspec/`, the payload checks SHALL skip the lint, the shell check, and the script test suite with its coverage floor, and SHALL say so in the job summary. They SHALL still run the private-names test, the payload link check, the OpenSpec config and retired-names checks, strict spec validation, and the context measurement check. A change to Markdown anywhere else, including skill text under `.agents/`, SHALL run every check. When the comparison can not be made, every check SHALL run. The skip SHALL happen inside the job, so the required `payload` check still reports.

#### Scenario: A wiki-only branch

- **WHEN** a branch changes only `wiki/development/memory.md`
- **THEN** the payload job skips lint, shell checks, and the script suite
- **AND** it runs the private-names test and the release checks, and passes when they pass

#### Scenario: Skill text changes

- **WHEN** a branch changes only `.agents/skills/save/SKILL.md`
- **THEN** the payload job runs every check

#### Scenario: A new branch with no base

- **WHEN** the comparison with the default branch can not be made
- **THEN** the payload job runs every check
