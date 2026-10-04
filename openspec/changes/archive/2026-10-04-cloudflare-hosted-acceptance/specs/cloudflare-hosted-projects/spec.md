# Spec Delta

## MODIFIED Requirements

### Requirement: Managed creation stays disabled pending live acceptance

The prepared implementation SHALL keep general new managed project creation disabled and its production provider execution bindings unconfigured until a separately authorized complete live acceptance and enablement decision. A separately authorized acceptance environment SHALL admit only its exact approved owner, workspace, project inventory, immutable identities and finite execution bounds; absent, expired or mismatched acceptance authority SHALL refuse before provider mutation. Shipping the implementation or completing a restricted acceptance run SHALL NOT activate general customer provisioning or imply that an unobserved live journey passed.

#### Scenario: Managed creation is disabled

- **WHEN** the managed route has not completed live acceptance and remains disabled
- **THEN** starting a workspace creates no managed repository, hosting resource or provider credential, while the existing GitHub route remains available

#### Scenario: One restricted acceptance run is authorized

- **WHEN** fresh approval names one acceptance owner/workspace, exact inventory, immutable identities, cost/time limits and cleanup
- **THEN** only that bounded run can exercise managed setup and delivery, while other owners/workspaces and ordinary production creation remain unavailable

## ADDED Requirements

### Requirement: Internal functionality trials do not establish customer readiness

A separately authorized internal trial SHALL be restricted to its named staging owner, workspace and exact bounded inventory. Its results SHALL distinguish functional observations from unverified hostile-code isolation and full acceptance. General creation SHALL remain disabled and existing customer authority-isolation promises SHALL remain unchanged. Missing platform-credential separation, exact target, finite cost or supported cleanup SHALL prevent trial execution.

#### Scenario: Controlled app completes its journey

- **WHEN** the reviewed owner-controlled app completes setup, private preview and exact publication under the bounded request
- **THEN** the records show those functional observations while hostile-code isolation, full customer acceptance and general enablement remain pending

#### Scenario: Trial prerequisite is absent

- **WHEN** exact owner/target authority, platform-credential separation, cost or cleanup is unresolved
- **THEN** the affected live action refuses without expanding resources, credentials or general creation


### Requirement: Internal staging access does not change billing

A separately approved internal staging VM exception SHALL grant only the named owner/workspace temporary test access within its bound expiry. It SHALL preserve ordinary paid-access checks for all other users/workspaces and SHALL NOT create or change subscription, billing, trial or fake readiness records. Missing, malformed, foreign or expired internal authority SHALL refuse fresh test provisioning/access.

#### Scenario: One internal test workspace is prepared

- **WHEN** exact live authority permits the named owner/workspace's finite staging exception
- **THEN** only that test workspace can use the existing provisioning and owner journey within the bounds, with unchanged billing records

#### Scenario: Internal authority is unavailable

- **WHEN** authority is absent, foreign, expired or used for a different workspace
- **THEN** no internal provisioning or access exemption is granted and ordinary paid-access behavior is preserved
