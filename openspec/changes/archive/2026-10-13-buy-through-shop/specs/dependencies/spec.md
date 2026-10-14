# Spec Delta

## ADDED Requirements

### Requirement: Shopping adds one command on first use

Shopping through Shop SHALL need one tool beyond the core: Shop's command, installed into the person's home folder the first time a shopping task needs it, in the one version WongStack has tried. Before installing, the agent SHALL ask once, naming its size. A download that does not match the recorded fingerprint of that version SHALL install nothing. It SHALL add nothing to the repository, SHALL need no admin password, and setup SHALL NOT offer it.

#### Scenario: A first shopping request

- **WHEN** a task first needs Shop on a machine without the command
- **THEN** the agent says what the install needs, asks, installs it into the home folder, and carries on with the task

#### Scenario: The download does not match

- **WHEN** the downloaded command differs from the recorded fingerprint
- **THEN** nothing is installed, the agent says so, and the errand falls back to browsing as the person
