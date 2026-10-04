# Agent API discovery

## Purpose

Give employee assistants machine-readable descriptions of company actions and existing memory reads through one private helper, so relevant context is available without sharing business keys or changing memory authority.

## ADDED Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.1 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. An existing operation-level restriction SHALL also apply to discovery where it determines action visibility.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

### Requirement: One helper describes company and memory operations without combining authority

The helper SHALL provide one bounded, filterable catalogue and selected-operation descriptions for live company actions and installed memory read operations. Every description SHALL identify its source, transport, required authentication, input/output schemas, effect and contract revision. Installed-client operations SHALL NOT be presented as deployed HTTP endpoints in OpenAPI. Company operations SHALL NOT override the memory namespace or select arbitrary local commands. Memory discovery and calls SHALL remain usable independently of company login; knowing a schema SHALL NOT establish an authorized connection.

#### Scenario: A task needs both company information and remembered context

- **WHEN** an agent lists and describes company and memory operations through the helper
- **THEN** it receives the relevant contracts through one interface with distinct sources and authentication requirements, without loading every schema or receiving credentials

#### Scenario: Company login is unavailable

- **WHEN** the agent lacks company login but its installed memory credential is valid
- **THEN** it can still discover and use the described memory reads, and the unavailable company connection is reported separately

### Requirement: Agent context is selective and available by default

Every install SHALL give its agents a short instruction pointing to company API discovery. An agent SHALL be able to list relevant action summaries and load the full contract and local schema dependencies for a selected action. The entire schema SHALL NOT be required in every session's starting context. Newly published contracts SHALL be discoverable without manual employee prompt updates.

#### Scenario: A task needs company information

- **WHEN** an employee asks their agent to do work covered by a described company action
- **THEN** the agent has instructions to find that action, load its contract and call the company endpoint rather than request the business key

#### Scenario: The catalogue grows

- **WHEN** many described actions are available
- **THEN** the helper can return bounded filtered summaries and just the selected action's full schema

### Requirement: The employee client reuses normal company login

The private helper SHALL authenticate as the employee through the company's existing Cloudflare Access login, reuse its private session while valid, and request a fresh login when needed. It SHALL expose no login token in model context, command arguments, URLs, repo files or ordinary diagnostics, and SHALL never fall back to owner or verification credentials. The employee SHALL need no Cloudflare administration account or business API key.

#### Scenario: First use and a later request

- **WHEN** an allowed employee signs in for their first API request and later makes another request during that valid session
- **THEN** both requests use that employee's identity and the later request reuses private authentication automatically

#### Scenario: Expired or removed access

- **WHEN** the provider refuses the session because it expired or employee access was removed
- **THEN** the helper reports sign-in or denial without exposing credentials or widening permission

### Requirement: Calls remain on the connected target and handle uncertain outcomes

The helper SHALL resolve a company operation against current discovery for the connected company origin, send structured input to the registered endpoint, and return the business result or safe error. Memory operations SHALL use their installed contracts and the existing memory client's primary-checkout target and credential; a company target selection SHALL NOT redirect memory. The helper SHALL refuse credential forwarding to another origin, redirects, arbitrary server URLs and external schema references. Credentials SHALL NOT be exchanged between company and memory requests. Listing or describing SHALL perform no business mutation. A failed or ambiguous mutation SHALL NOT be automatically repeated.

#### Scenario: A redirect tries to move authentication

- **WHEN** discovery or an action redirects the helper to another destination
- **THEN** the helper stops without forwarding the employee session

#### Scenario: A write has an uncertain result

- **WHEN** a write times out after the request may have reached the company Worker
- **THEN** the helper reports the uncertain outcome without automatically calling it again

### Requirement: Open installations do not claim authenticated API readiness

The protected API guide SHALL require verified identity even when the existing starter is configured open without login. Setup and helper status SHALL distinguish a discovered address from successful authenticated employee API use, and SHALL give a plain login/setup instruction when protection or employee admission is missing.

#### Scenario: A starter is open without company login

- **WHEN** an employee attempts protected discovery on an open starter
- **THEN** the system reports that company login is needed and neither publishes sensitive discovery nor borrows owner credentials

#### Scenario: An address exists but no employee has signed in

- **WHEN** setup records a deployed company API address without real employee login evidence
- **THEN** it reports the address and leaves employee authenticated use unverified
