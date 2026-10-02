## MODIFIED Requirements

### Requirement: The memory store is production-only

Provisioning SHALL bind the memory store to the production Worker only, leave owner/device approval pending without minting a memory key, and record the store's ids under `components.memory` in the install record. Device credentials SHALL NOT be CI secrets. Memory readiness SHALL require an approved device and a successful scoped production read. On an account without R2, the store SHALL be made without a transcript bucket, the report SHALL say so with the dashboard step, and a later run SHALL add the bucket.

#### Scenario: R2 is off

- **WHEN** the account has not enabled R2
- **THEN** memory works without transcripts and the report names how to turn R2 on

#### Scenario: Staging never reads memory

- **WHEN** the app's config is written
- **THEN** only the production Worker binds the memory store

### Requirement: The Worker verifies the signed Access assertion

The documented enforcement SHALL verify the signed Access assertion for this application and read the identity from it, `email` for a person and `common_name` for a service token. Privileged memory-human actions SHALL additionally require a nonempty provider-scoped subject, the configured application-token type, and no service-token marker; they SHALL use installation-owned bindings rather than email as authority. A missing or invalid assertion SHALL get `401`; anonymous open-app access SHALL never permit memory approval or management; only an explicit `SKIP_AUTH` development flag MAY substitute an identity. A committed open-without-login setting SHALL serve business content without an assertion only while no Access application is configured; once one is, the assertion is required regardless of that setting.

#### Scenario: A machine caller

- **WHEN** CI or `/verify` calls the gated app with a service token
- **THEN** the request is authenticated from the assertion, not rejected for a missing email header

#### Scenario: A stale open setting

- **WHEN** the config still says open without login but carries Access identifiers
- **THEN** a request without a valid assertion gets `401`

## ADDED Requirements

### Requirement: The public memory exception is narrowly dispatched

The existing production memory path exception SHALL admit only exact reviewed machine protocol and memory routes, each with its own proof requirements. Human approval and management SHALL remain behind verified human login even when the rest of the app is deliberately open. No broader Access bypass SHALL be added. Noncanonical production aliases SHALL not issue device credentials; ordinary staging/previews SHALL bind no memory.

#### Scenario: An anonymous enrollment
- **WHEN** a machine starts a bounded request at the canonical production route
- **THEN** it can obtain only a pending request, not memory data or human management authority

#### Scenario: Another route or preview is probed
- **WHEN** an anonymous caller probes approval routes, unexpected methods, encoded path variants, production aliases or ordinary staging/previews
- **THEN** routing fails closed without exposing memory or bypassing the app login

### Requirement: A disposable installation proves device approval

Release verification SHALL use a separate installation with disposable identity and memory resources to prove real human login, machine approval, allowed memory read/write and denial after revocation. Service-token checks SHALL be reported separately and SHALL NOT count as human approval. No test installation, staging Worker or preview SHALL bind production memory or reuse production credentials.

#### Scenario: End-to-end acceptance succeeds
- **WHEN** a real member signs in and approves a disposable machine, writes and reads permitted data, then revokes it
- **THEN** the next memory operation and renewal are denied and credential-free evidence records each result

#### Scenario: Only machine verification passed
- **WHEN** a verification service token renders the preview successfully
- **THEN** human login and device approval remain explicitly unverified until independently demonstrated
