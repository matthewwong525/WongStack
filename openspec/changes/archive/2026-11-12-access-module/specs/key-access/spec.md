## REMOVED Requirements

### Requirement: An MCP server is used through the app, never connected to a chat

**Reason:** MCP servers through the app are removed: 13 calls in 30 days, and no project has one saved.
**Migration:** None needed. A tool that offers only an MCP server shows as not connected yet.

### Requirement: Each MCP call is sorted into a look-up or a change by its tool

**Reason:** No MCP call goes through the app any more.
**Migration:** None needed.

### Requirement: A public service can be set up with no key

**Reason:** Its only scenario was a keyless MCP server; the requirement returns as *A service with no key still goes through the app*.
**Migration:** None needed.

## ADDED Requirements

### Requirement: A service with no key still goes through the app

A service that needs no key SHALL be settable up for direct use with no secret, so it still goes through the app and under people's levels. Its setup SHALL then send no credential header, and a setup that names a secret for a key with none, or a key with secrets but no secret named, SHALL fail the checks before publishing.

#### Scenario: A keyless public API

- **WHEN** a public API is set up with no key and a person with Read sends a look-up to it
- **THEN** the answer comes back through the app, and no credential is sent

#### Scenario: A keyless setup that names a secret

- **WHEN** a setup for a key with no secrets names a secret to send
- **THEN** the checks fail before publishing
