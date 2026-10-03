## Purpose

Provide installation-owned machine identities and grants so private memory belongs to a stable machine without requiring a human login or Git hosting account.

## ADDED Requirements

### Requirement: A stable machine principal owns private memory

An installation SHALL assign a machine an opaque stable principal scoped to its repository during trusted setup. Private memory SHALL follow that principal across sessions, linked worktrees and credential rotation. Machine names, email, hardware fingerprints, Git authorship and browser identity SHALL NOT authorize access or claim history. Optional employee labels SHALL remain metadata only.

#### Scenario: Normal restart or credential rotation
- **WHEN** an authorized machine starts another chat or rotates its credential
- **THEN** it retains its existing private memory namespace and repository scope without human sign-in

#### Scenario: A label matches another machine
- **WHEN** a new client uses the same name or employee email as an existing machine
- **THEN** it cannot claim that machine's identity, private notes or transcripts

### Requirement: The installation controls machine grants

Only verified installation provisioning/operator authority SHALL create, narrow or revoke machine grants. Ordinary memory credentials, hosted project roles, GitHub membership and app verification service tokens SHALL NOT administer grants. Removal SHALL immediately deny data access and renewal for every credential under that grant. Browser logout SHALL NOT revoke machine memory access.

#### Scenario: A grant is removed
- **WHEN** the operator revokes a machine grant while old and rotated credentials exist
- **THEN** both credentials are denied on subsequent data and renewal requests

#### Scenario: App login is disabled
- **WHEN** the app is open or a client holds only an app service token
- **THEN** it receives no memory grant or operator authority; a separately authorized machine can still use memory
