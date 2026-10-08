# Spec Delta

## ADDED Requirements

### Requirement: One user token widens itself unasked

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL NOT grant a permission no WongStack feature uses, and SHALL leave in place a permission an earlier version granted. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered, with one exception: when the caller will finish open without login, an Access check still refused after the full propagation wait SHALL NOT stop the widen, and provisioning's Zero Trust step SHALL decide whether to open or stop.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted, the cloud browser's not among them

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: Access stays refused on the open path

- **WHEN** the caller will finish open and Cloudflare still refuses an Access check after the full wait, while the database check passes
- **THEN** the widen finishes, and the Zero Trust step opens the site only if Cloudflare refuses the organization, stopping on anything else

## REMOVED Requirements

### Requirement: One user token widens itself without asking

**Reason**: Its cloud-browser sentence and scenario go with Cloudflare's browser; a MODIFIED block can not drop a scenario.
**Migration**: "One user token widens itself unasked" carries every other promise. A token that already holds the cloud browser's permission keeps it.
