## MODIFIED Requirements

### Requirement: A branch picks the line's code, never its Worker or database

A preview deploy SHALL take the line's built code from the branch and its settings (Worker name, database, address) from the default branch's own config. The staging app SHALL never point at the production line: it SHALL point at the staging line or at no line, and the checks SHALL pass a staging app with no line.

#### Scenario: A branch renames the line's Worker or database

- **WHEN** a branch's line settings name another Worker or the production database
- **THEN** the deploy still sends the line to the default branch's staging line Worker with the staging database

#### Scenario: Staging points at the live line

- **WHEN** a branch's staging app points its line at the production line Worker, or at any Worker but the default branch's staging line
- **THEN** the deploy refuses the build before uploading anything and names the binding

#### Scenario: Staging has no line

- **WHEN** a branch's staging app binds no line while the live app does
- **THEN** the staging check passes and the preview deploys
