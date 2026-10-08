# Spec Delta

## ADDED Requirements

### Requirement: Personal browsing adds one browser on first use

Browsing as the person SHALL need one tool beyond `/verify`'s: the personal browser, installed into the person's home folder the first time a browsing task needs it, with the versions WongStack has tried and no others. Before installing, the agent SHALL ask once, naming the disk and memory it needs. It SHALL add nothing to the repository and SHALL need no admin password.

#### Scenario: A first errand

- **WHEN** a task first needs to browse as the person on a machine without the personal browser
- **THEN** the agent says what the install needs, asks, installs it into the home folder, and carries on with the task

#### Scenario: A later errand

- **WHEN** a later task browses as the person
- **THEN** it asks nothing and installs nothing
