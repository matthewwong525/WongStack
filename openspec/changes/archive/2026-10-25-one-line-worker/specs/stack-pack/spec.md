## MODIFIED Requirements

### Requirement: The line Worker deploys before the app

Every deploy of the live app SHALL first send the line's Worker: when the line's deploy fails, the live app SHALL NOT be deployed. A preview SHALL deploy no line Worker. A repo whose config has no line Worker yet SHALL deploy the app alone, as before.

#### Scenario: A branch push

- **WHEN** a branch is pushed
- **THEN** the staging app deploys and the branch's preview is uploaded, and no line Worker deploys

#### Scenario: The line fails to deploy

- **WHEN** the line's Worker fails to deploy on the default branch
- **THEN** the deploy stops and the live app stays on its previous version

### Requirement: A branch picks the line's code, never its Worker or database

A live deploy SHALL take the line's settings (Worker name, database, address) from the default branch's own config, never a branch's. The staging app SHALL point at no line and at no Durable Object in another Worker; the checks and the deploy SHALL refuse one that does.

#### Scenario: A branch renames the line's Worker or database

- **WHEN** a branch's line settings name another Worker or the production database
- **THEN** its preview deploys no line, and the live deploy after merging still uses the default branch's line Worker and database

#### Scenario: Staging points at the live line

- **WHEN** a branch's staging app points its line at the production line Worker, at an old test line, or at any other Worker's Durable Object
- **THEN** the deploy refuses the build before uploading anything and names the binding

#### Scenario: Staging has no line

- **WHEN** a branch's staging app binds no line while the live app does
- **THEN** the staging check passes and the preview deploys
