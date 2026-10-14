## ADDED Requirements

### Requirement: Cloud schedules get a revocable service sign-in

Provisioning SHALL let the owner make a separate service sign-in for each cloud schedule, named for it, and switch it off without touching any other sign-in. It SHALL reach memory's team notes only and SHALL NOT reach business apps beyond what its schedule lists. Its secret SHALL go only to the schedule's own secret store, never chat, git or logs.

#### Scenario: The owner makes and revokes one

- **WHEN** the owner makes a sign-in for a nightly cloud schedule and later switches it off
- **THEN** the schedule reaches team notes until then, and every call after is refused while other sign-ins keep working

## MODIFIED Requirements

### Requirement: The memory store is production-only

Provisioning SHALL bind the memory store to the production Worker only and record the store's ids under `components.memory` in the install record. It SHALL issue no memory key and write none to `.env`. On an account without R2, the store SHALL be made without a transcript bucket, the report SHALL say so with the dashboard step, and a later run SHALL add the bucket.

#### Scenario: R2 is off

- **WHEN** the account has not enabled R2
- **THEN** memory works without transcripts and the report names how to turn R2 on

#### Scenario: Staging never reads memory

- **WHEN** the app's config is written
- **THEN** only the production Worker binds the memory store

### Requirement: Machine access uses explicit authentication

Provisioning SHALL supply a dedicated app-specific service-token policy for automated verification. Membership updates SHALL preserve that machine policy. The production memory route and the project's git route SHALL be the only automatic exceptions to the edge sign-in wall, and the Worker SHALL verify the company sign-in on each of them itself; other public routes require explicit reviewed configuration. Staging and CI branch previews SHALL carry no memory bindings.

#### Scenario: Automated checks and memory

- **WHEN** automated checks use the dedicated service token and a memory caller sends a valid company sign-in
- **THEN** each reaches its intended protected service, while an anonymous memory or git caller is denied by the Worker

#### Scenario: Team membership changes

- **WHEN** a person is added or removed
- **THEN** machine permissions and the two Worker-checked routes remain intact, and no broad public prefix becomes exempt
