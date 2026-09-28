## ADDED Requirements

### Requirement: Browser journeys follow the installed tool's guide

Before writing a browser journey, the walk SHALL load the guide the installed browser CLI serves for its own version, and SHALL write the journey's commands from it rather than from a copy kept in the repo.

#### Scenario: The browser CLI updates

- **WHEN** the machine's browser CLI moves to a newer version with changed commands
- **THEN** the next walk writes its journeys from the newer version's guide, with no repo change
