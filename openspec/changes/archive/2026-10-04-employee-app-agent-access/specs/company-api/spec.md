# Company API

## Purpose

Let company apps and employee assistants use explicitly defined business actions through the company's Worker, while underlying service credentials remain on the server and existing authorization stays effective.

## ADDED Requirements

### Requirement: Apps and agents use the same defined company action

A described company action SHALL be callable through its existing Worker endpoint by both its app and an authenticated employee assistant. Both callers SHALL execute the same handler with verified identity and the same existing action and record checks. Discovery SHALL NOT grant permission or bypass those checks.

#### Scenario: An employee uses an app action through their agent

- **WHEN** an employee authorized to use a described action calls it from their assistant with valid input
- **THEN** the company endpoint performs the same work and returns the same business result as the app

#### Scenario: An existing record check denies the caller

- **WHEN** a described action's existing record check denies the employee
- **THEN** the agent call is denied even if the action appears in discovery

### Requirement: Company service credentials stay on the server

Company actions SHALL use saved server-side service connections without requiring an employee to possess the underlying business key. Employee login SHALL NOT distribute owner credentials, deployment credentials, memory credentials, or the workspace verification service token. Discovery, successful outputs and error outputs SHALL contain no service credential values.

#### Scenario: A connected action runs

- **WHEN** an authenticated employee calls a defined action that uses a saved business key
- **THEN** the server uses that key internally and the employee receives only the described business response

#### Scenario: A provider request fails

- **WHEN** the outside service returns a diagnostic containing credential material
- **THEN** the action returns a safe documented error without that material

### Requirement: Defined actions validate the documented interface

Every agent-exposed action SHALL declare its purpose, stable operation identity, accepted input, successful output, errors and effect. The same definition SHALL govern its published schema and runtime input validation. Unsupported schema definitions or duplicate operation identities SHALL fail the checks before publication. Invalid input SHALL perform no business work; a described output that violates its contract SHALL not be forwarded as a successful response.

#### Scenario: Invalid input

- **WHEN** a caller supplies input outside the action's documented schema
- **THEN** the endpoint returns a structured input error before invoking the business handler

#### Scenario: An action definition is inconsistent

- **WHEN** a new exposed action has an unsupported schema or duplicate operation identity
- **THEN** publication checks fail and identify that action

### Requirement: Exposure is explicit and preserves existing apps

An existing unconverted handler SHALL retain its path, behavior and authorization and SHALL be absent from discovery until deliberately described. Possessing a key SHALL NOT expose every action of that service. An employee-enabled action requiring company connections SHALL require verified caller authentication even when an older starter site is open without login. Missing connections SHALL produce a safe unavailable state rather than a request for the owner key on the employee machine.

#### Scenario: An installed app updates

- **WHEN** the update adds discovery support around a custom app without describing its legacy handlers
- **THEN** its handlers still work as before and are not silently advertised to agents

#### Scenario: A connection or login is missing

- **WHEN** a new company-connected action has no saved connection or no verified employee identity
- **THEN** no outside business request runs and the caller receives a safe unavailable or authentication response
