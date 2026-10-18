# Agent API discovery

## Purpose

Give employee assistants machine-readable descriptions of company actions and existing memory reads through one private helper, so relevant context is available without sharing business keys or changing memory authority.

## Requirements

### Requirement: Discovery describes the deployed company API

The protected company Worker SHALL publish OpenAPI 3.1 generated from its currently registered described actions and a bounded summary catalogue with per-action details. The outputs SHALL identify a contract revision, omit undeclared and infrastructure routes, preserve stable operation identities, and include only synthetic examples and nonsecret metadata. Every existing operation-level visibility restriction SHALL apply consistently to summary listings, selected details and OpenAPI; enabled Access per-app policy SHALL additionally enforce current employee app permissions on all three outputs. Permission changes SHALL govern the next discovery request even during an existing session; conditional or cached responses SHALL not reveal another caller's or a previously permitted action's contract. Discovery remains descriptive and SHALL grant no execution or memory authority.

#### Scenario: A new action is published

- **WHEN** a reviewed action joins the production registry and deploys
- **THEN** production discovery describes its real method, path, input, output and effect to permitted employees without a second manually maintained API document

#### Scenario: A route is not an employee action

- **WHEN** the Worker also serves the raw memory protocol, verification uploads, administrative operations or undescribed legacy handlers
- **THEN** discovery does not advertise those routes as company actions

#### Scenario: Employee app permission is removed

- **WHEN** an employee requests summaries, selected details or OpenAPI after their app permission is removed
- **THEN** none of those responses or conditional cache paths reveal that app's unauthorized action contract

### Requirement: One helper describes company and memory operations without combining authority

The helper SHALL provide one bounded, filterable catalogue and selected-operation descriptions for live company actions and installed memory read operations. Every description SHALL identify its source, transport, required authentication, input/output schemas, effect and contract revision. Installed-client operations SHALL NOT be presented as deployed HTTP endpoints in OpenAPI. Company operations SHALL NOT override the memory namespace or select arbitrary local commands. Memory discovery and calls SHALL remain usable independently of company login; knowing a schema SHALL NOT establish an authorized connection. A combined list that could not reach the company SHALL also say so in one plain line outside its result, naming the sign-in step.

#### Scenario: A task needs both company information and remembered context

- **WHEN** an agent lists and describes company and memory operations through the helper
- **THEN** it receives the relevant contracts through one interface with distinct sources and authentication requirements, without loading every schema or receiving credentials

#### Scenario: Company login is unavailable

- **WHEN** the agent lacks company login but its installed memory credential is valid
- **THEN** it can still discover and use the described memory reads, the unavailable company connection is reported separately, and a plain line says company actions are missing and how to sign in

### Requirement: Agent context is selective and available by default

Every install SHALL give its agents a short always-read instruction that names the services list as the first step for any outside service, then search, describe and call. An agent SHALL be able to list every service it can reach, list relevant action summaries and load the full contract and local schema dependencies for a selected action. The entire schema SHALL NOT be required in every session's starting context. Newly published contracts and newly saved keys SHALL be discoverable without manual employee prompt updates.

#### Scenario: A task needs company information

- **WHEN** an employee asks their agent to do work covered by a described company action
- **THEN** the agent has instructions to find that action, load its contract and call the company endpoint rather than request the business key

#### Scenario: The catalogue grows

- **WHEN** many described actions are available
- **THEN** the helper can return bounded filtered summaries and just the selected action's full schema

#### Scenario: A key is saved

- **WHEN** the owner saves a Notion key through its key link
- **THEN** a chat's next services list names Notion without any instruction or skill being edited

### Requirement: The employee client reuses normal company login

The private helper SHALL authenticate as the employee through the company's existing Cloudflare Access login, reuse its private session while valid, and request a fresh login when needed. It SHALL expose no login token in model context, command arguments, URLs, repo files or ordinary diagnostics, and SHALL never fall back to owner or verification credentials. The employee SHALL need no Cloudflare administration account or business API key. When a call fails because the sign-in expired, the helper SHALL show the checked sign-in link with the failure, not a bare refusal.

#### Scenario: First use and a later request

- **WHEN** an allowed employee signs in for their first API request and later makes another request during that valid session
- **THEN** both requests use that employee's identity and the later request reuses private authentication automatically

#### Scenario: Expired or removed access

- **WHEN** the provider refuses the session because it expired or employee access was removed
- **THEN** the helper reports sign-in or denial without exposing credentials or widening permission, and an expired session comes with the sign-in link

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

### Requirement: Catalogue search matches words in any order

The summary catalogue's text filter SHALL return an operation when every word of the filter appears in its identity, summary or description, whatever the order or case, for live company actions and installed memory reads alike. An empty filter SHALL keep returning every permitted operation.

#### Scenario: The words are not one phrase

- **WHEN** an agent filters with several words that an action's summary and description contain apart from each other
- **THEN** the catalogue returns that action

#### Scenario: One word matches nothing

- **WHEN** one word of the filter appears nowhere in an operation
- **THEN** the catalogue omits that operation

### Requirement: The helper reports a failed call as failed

The helper SHALL end a call whose result is an error with a failing status while still printing the safe error. When a write's outcome is uncertain and its live description names a confirming read, the helper SHALL name that read in what it reports and SHALL NOT call either action again by itself.

#### Scenario: An action returns an error

- **WHEN** a called company action or memory read returns a safe error
- **THEN** the helper prints that error and ends with a failing status

#### Scenario: A write with a confirming read times out

- **WHEN** a write that names a confirming read times out or its connection drops
- **THEN** the helper reports the uncertain outcome, names the read to check first, and repeats nothing

### Requirement: Memory and company actions share one sign-in

A memory operation called through the shared helper SHALL use the same saved employee sign-in as company actions, and SHALL keep memory's own team and private checks. Company actions and memory SHALL still report their readiness separately. The helper SHALL never fall back to owner credentials, and an origin override, staging target or remote schema SHALL NOT pick where memory calls go.

#### Scenario: One person, actions and memory

- **WHEN** a signed-in teammate lists operations and calls a company action and a memory search
- **THEN** both succeed with the one sign-in, and the search returns only what memory allows that person

### Requirement: The services list names the services a caller can use

The helper and the company endpoint SHALL return, for the signed-in caller, one bounded entry per registered key the caller holds a level for: its id, name, one-line purpose, whether it is saved, their level, and for a key used directly the link to its service's API guide. Other keys SHALL appear as one count, and the full list SHALL be available on request, each entry marked as needing access. Its size SHALL not grow with the number of operations a service has, and it SHALL contain no key value. The helper SHALL add to each key-based entry the checkout path of that service's notes page and whether the page exists yet.

#### Scenario: A chat lists services

- **WHEN** a person with Stripe at Read, Notion at Read but not saved, and no Mailchimp level lists services
- **THEN** Stripe shows ready at Read, Notion says to ask for its key link, and Mailchimp is only counted among services that need access

#### Scenario: A service has notes

- **WHEN** `wiki/services/notion.md` exists and a chat lists services
- **THEN** the Notion entry links that page, and an entry with no page names the path to make

### Requirement: Chats keep notes on each key-based service

The always-read instructions SHALL tell an agent that uses a key-based service directly to read its notes page first, and, after working out a call the page lacks, to add that call there in the next wiki save. The first agent to use a service with no page SHALL make it with only the purpose line and the guide link, plus what it learned. No notes page SHALL hold a key value, a sign-in, or a customer's data, and WongStack SHALL ship no notes page.

#### Scenario: The second chat uses Notion

- **WHEN** an earlier chat recorded how to search Notion pages and a new chat needs to search Notion
- **THEN** the new chat uses the recorded call without opening Notion's guide

### Requirement: The helper keeps lists and answers short in the chat

By default the helper SHALL print one line per search match and a bounded first part of a long answer, saving the whole answer to a private file it names, so one call cannot fill the chat. A script SHALL be able to ask for the full structured list and the whole answer in the output, as before.

#### Scenario: A long answer

- **WHEN** a chat runs a Stripe search whose answer is 2 MB
- **THEN** the chat sees the first part and the path of a private file holding the whole answer

#### Scenario: A script needs the whole answer

- **WHEN** a skill's script runs the same call asking for the full answer
- **THEN** it gets the whole answer as JSON on its output
