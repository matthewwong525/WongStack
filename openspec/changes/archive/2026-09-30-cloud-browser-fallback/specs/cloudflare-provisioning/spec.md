# Spec Delta

## MODIFIED Requirements

### Requirement: One user token widens itself without asking

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL include the cloud browser's permission, and an installed repo whose token lacks it SHALL widen the same way the first time a task needs the cloud browser. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: An older install first needs the cloud browser

- **WHEN** a task needs the cloud browser and the token lacks its permission
- **THEN** the token widens itself, the agent reports the permission it granted, and the task carries on
