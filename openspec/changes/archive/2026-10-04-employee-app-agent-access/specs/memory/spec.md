# Discoverable memory reads

## ADDED Requirements

### Requirement: Existing memory reads have discoverable contracts

Memory SHALL describe its existing search and topic-read operations with stable namespaced identities, supported input schemas, truthful output schemas, safe errors, effects and contract revisions. The shared helper SHALL let an agent discover, describe and call these operations through the existing memory client. Descriptions SHALL derive from the supported command definitions, use synthetic examples and contain no credential values or stored private facts. The adapter SHALL reject unsupported input before making a store request and SHALL reuse existing search behavior rather than introduce another query protocol. Existing direct commands, automatic loading/capture and gated memory writes SHALL continue to work without company login or installing the app.

#### Scenario: An agent searches remembered knowledge

- **WHEN** an authorized installation discovers and calls a described memory search through the shared helper
- **THEN** the search uses its existing memory client and returns the same permitted knowledge as the corresponding direct command, within the adapter's documented output bound

#### Scenario: An input tries to select another access path

- **WHEN** a helper memory call supplies raw SQL, another owner, arbitrary commands or paths, or an unsupported admin-wide option
- **THEN** the adapter refuses it before any store request without changing existing direct-command behavior

### Requirement: Shared discovery preserves memory credentials and private ownership

Shared operation discovery SHALL NOT change memory enrollment, roles, machine ownership, website-login association, data bindings or credential lifecycle. A memory call through the helper SHALL require the existing repository credential for its installation, retain the existing team/private server checks, and use the primary checkout's recorded production memory target. Company login alone SHALL grant no memory access. A company origin override, staging target or remote schema SHALL NOT select the destination for a memory credential. No credential SHALL reach descriptions, arguments, model context or ordinary diagnostics, and no missing or refused memory credential SHALL cause fallback to owner credentials or website login.

#### Scenario: The same employee uses two machines

- **WHEN** two installations have the same verified website identity and make memory calls through the shared helper
- **THEN** each retains its credential's permitted shared knowledge and machine-private scope, with no combining of private facts or reassignment of ownership

#### Scenario: A logged-in employee lacks an active memory credential

- **WHEN** an employee with valid company login calls a described memory operation without a valid installed memory credential
- **THEN** memory access is refused with a safe existing installation or denial instruction, without issuing a credential or widening access
