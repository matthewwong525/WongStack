## MODIFIED Requirements

### Requirement: The memory store is production-only

Provisioning SHALL bind memory only to the pinned production Worker, or a separately pinned production memory Worker sharing the exact installation state. It SHALL record the store IDs and enroll the initiating machine only after verified trusted setup authority; its credential SHALL be stored privately outside git, never printed or put in CI secrets. On an account without R2, memory SHALL work without transcripts and report the missing bucket; a later authorized run SHALL add it without resetting installation identity.

#### Scenario: R2 is off
- **WHEN** the account has not enabled R2
- **THEN** memory works without transcripts and the report names how to turn R2 on

#### Scenario: Staging never reads memory
- **WHEN** the app's config is written
- **THEN** staging and ordinary previews have no production memory bindings or enrollment authority

## ADDED Requirements

### Requirement: A memory exception admits only explicitly authenticated machine operations

Any Access exception SHALL cover only reviewed machine paths on the exact canonical production memory target. Core handlers SHALL enforce a strict method/path allowlist and bearer proof for enrollment, renewal and data operations. App business content SHALL retain its Access wall. Anonymous requests and app verification service tokens SHALL never read memory, enroll a machine or administer grants.

#### Scenario: Wrong origin or unsupported route
- **WHEN** a client uses a preview, alternate production address, unknown path or wrong method for machine memory
- **THEN** it receives no memory or authorization and no app fallback widens the exception

#### Scenario: Independent disposable verification
- **WHEN** the new memory runtime is verified
- **THEN** it uses newly owned disposable production-scoped resources and proves authorized setup, private/shared reads, renewal and revocation separately from ordinary preview checks
