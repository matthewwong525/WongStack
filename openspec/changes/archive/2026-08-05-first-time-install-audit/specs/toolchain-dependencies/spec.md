## MODIFIED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively


No WongStack skill SHALL install a language runtime as a precaution, as part of a readiness check, or "while we're here." A runtime SHALL be installed only at the moment a step actually requires it, and only after the user consents. Installation SHALL prefer a user-local method (the official installer, or `nvm` into the user's home) over a `sudo` package manager, which can fail outright on a managed machine. Installing a runtime is the only step in the flow that modifies the machine rather than the repo, and SHALL be the only step that asks for that reason.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node remains a real dependency of the planning verbs — but not of the knowledge layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what
the verbs actually do. `/save` shells out to `openspec new change`,
`openspec status --json`, and `openspec instructions` when it authors a change for a
session that skipped `/plan`, so it is **not** a no-runtime verb, and `wong-setup`
currently promises that it is. A list that is wrong here is worse than no list: it
is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs its readiness check on a machine with no Node.js
- **THEN** it does not install Node during the check
- **AND** it proceeds until a step genuinely requires the OpenSpec CLI, then explains in plain language what needs installing and why, and asks

#### Scenario: The user declines the runtime install

- **WHEN** the user declines the Node install
- **THEN** setup completes the layer that needs no runtime — `CLAUDE.md`, the wiki, `notes/`, the skills, and the verbs that touch only git and files
- **AND** it names exactly which verbs are unavailable without the CLI and how to enable them later
- **AND** it does not dead-end, fail, or leave the repo half-written

#### Scenario: Install prefers a user-local method

- **WHEN** the user consents to installing Node
- **THEN** the install targets the user's own home directory rather than requiring `sudo`, wherever the platform allows it

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** setup states which verbs work without the CLI
- **THEN** `/save`'s change-authoring path is named as needing it, alongside `/plan`, `/apply`, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI
