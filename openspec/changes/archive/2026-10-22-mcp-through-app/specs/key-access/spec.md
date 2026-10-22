# Spec Delta

## ADDED Requirements

### Requirement: An MCP server is used through the app, never connected to a chat

An outside MCP server SHALL be reached through the app's direct use of its key, and SHALL NOT be registered as a server in a chat's own settings, so its tool descriptions reach a chat only when a task asks for them. One helper SHALL list an MCP service's tools and call one through the app for any MCP service set up, with no per-service code. The services list SHALL mark which services are MCP servers.

#### Scenario: A new MCP server is added

- **WHEN** an owner asks to add an MCP server
- **THEN** the assistant sets it up in the app and uses the helper when a task needs it, and the chat's own server settings stay unchanged

### Requirement: Each MCP call is sorted into a look-up or a change by its tool

The server SHALL count an MCP message as a look-up only when it opens or lists the session's tools, or calls a tool the key's setup names as a look-up; every other method, every other tool, a tool the service adds later, a batch, and a message that cannot be read SHALL count as a change. Read SHALL permit only look-ups, as for any direct request. The server SHALL carry the service's session identifier back to the caller and on to the service, so one session spans several calls.

#### Scenario: A person with Read calls a tool that changes something

- **WHEN** a person whose level for an MCP service is Read calls a tool its setup does not name as a look-up
- **THEN** the server refuses before anything is sent, and that person's listing and look-up tools still run

#### Scenario: The service adds a tool

- **WHEN** the service's tool list gains a tool nobody has reviewed
- **THEN** calling it needs Read & write until its setup names it as a look-up

### Requirement: A public service can be set up with no key

A service that needs no key SHALL be settable up for direct use with no secret, so it still goes through the app and under people's levels. Its setup SHALL then send no credential header, and a setup that names a secret for a key with none, or a key with secrets but no secret named, SHALL fail the checks before publishing.

#### Scenario: A keyless MCP server

- **WHEN** a public MCP server is set up with no key and a person with Read lists its tools
- **THEN** the list comes back through the app, and no credential is sent
