## MODIFIED Requirements

### Requirement: The README states the problem, the requirements, and the layout

The README's first screen SHALL be written for a non-technical reader. It SHALL say what the assistant does, with example requests, before any install step, and SHALL NOT depend on terms such as git, OpenSpec, CI, or pull request. The developer material SHALL sit under one later heading. That section SHALL list every tool that setup needs, including Node, `curl`, the OpenSpec install command, and the Windows symlink setting. It SHALL say why Cloudflare is required and link `SECURITY.md`. It SHALL name every top-level folder and file of the repository with its purpose. Working from the source SHALL start with a fork.

#### Scenario: A non-technical reader opens the README

- **WHEN** a reader who has never used a coding agent reads the README's first screen
- **THEN** they learn what they can ask the assistant and how to start, without meeting a developer term

#### Scenario: A reader checks prerequisites

- **WHEN** a reader follows the README's requirements list on a new Windows machine
- **THEN** the list names every tool setup calls, and the symlink setting that the skills need

#### Scenario: A reader asks what a folder is for

- **WHEN** a reader sees `schema/` or `paseo.json` at the repository root
- **THEN** the README's layout table says what it is
