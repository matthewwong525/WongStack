## ADDED Requirements

### Requirement: The line Worker deploys before the app

Every deploy that sends the app SHALL first send the line's Worker for the same environment: production before the production app, staging before the staging app and its preview. When the line's deploy fails, the app SHALL NOT be deployed. A repo whose config has no line Worker yet SHALL deploy the app alone, as before.

#### Scenario: A branch push

- **WHEN** a branch is pushed
- **THEN** the staging line deploys, then the staging app, then the branch's preview is uploaded

#### Scenario: The line fails to deploy

- **WHEN** the line's Worker fails to deploy
- **THEN** the deploy stops and the app stays on its previous version

### Requirement: A branch picks the line's code, never its Worker or database

A preview deploy SHALL take the line's built code from the branch and its settings (Worker name, database, address) from the default branch's own config. The staging app SHALL point only at the staging line, never at the production line.

#### Scenario: A branch renames the line's Worker or database

- **WHEN** a branch's line settings name another Worker or the production database
- **THEN** the deploy still sends the line to the default branch's staging line Worker with the staging database

#### Scenario: Staging points at the live line

- **WHEN** a branch's staging app points its line at the production line Worker, or at any Worker but the default branch's staging line
- **THEN** the deploy refuses the build before uploading anything and names the binding
