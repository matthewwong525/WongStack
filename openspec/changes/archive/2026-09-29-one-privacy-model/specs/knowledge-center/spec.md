# Spec Delta

## MODIFIED Requirements

### Requirement: Facts are placed without false conflicts or leaks

Different people's preferences SHALL each stay on their own page; newest-wins SHALL apply only between facts about the same person or the whole team. Health, family, and money SHALL NOT be written to the wiki of a repo anyone else can read.

#### Scenario: Two people disagree

- **WHEN** one teammate wants squash merges and another wants merge commits
- **THEN** each preference stays on its owner's page and neither supersedes the other

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** no page in the work repo records it
