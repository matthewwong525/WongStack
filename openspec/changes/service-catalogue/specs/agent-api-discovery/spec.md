## MODIFIED Requirements

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

## ADDED Requirements

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
