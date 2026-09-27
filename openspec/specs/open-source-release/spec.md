# open-source-release Specification

## Purpose

Make the public WongStack repository safe and legal to reuse: a license, private security reports, no committed secrets or private names, working links, and a tagged Release per version.

## Requirements

### Requirement: The repository carries a license and a security policy

The repository SHALL hold an MIT `LICENSE` and a `SECURITY.md` that says how to report a vulnerability privately and what each Cloudflare credential can do. The README SHALL link both.

#### Scenario: A reader checks the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names each token, where it lives, and which one can mint others

### Requirement: Links resolve on GitHub

No live Markdown link and no README `raw.githubusercontent.com` URL SHALL pass through a symbolic link, because GitHub returns a 404 for it.

#### Scenario: The setup prompt

- **WHEN** a person pastes the README's setup prompt into a coding agent
- **THEN** the agent fetches the `wong-setup` runbook with HTTP `200`

### Requirement: No secret or private name is published

The full history SHALL be scanned for credentials before a public release; a real match SHALL stop it until rotated, reported without its value. No live file outside `openspec/changes/` and `CHANGELOG.md` SHALL name a private downstream repository or service.

#### Scenario: The scan finds a credential

- **WHEN** the history scan finds a live credential
- **THEN** the release stops and the owner is asked to rotate it

### Requirement: The repository carries the community files GitHub detects

The repository SHALL hold the contributing, conduct, template, and code owners files GitHub detects. Security reports SHALL route to the private advisory form, and the guide SHALL tell fork contributors they get no preview.

#### Scenario: A fork opens a pull request

- **WHEN** a contributor reads the guide before a pull request from a fork
- **THEN** it says no preview link will appear, and why

### Requirement: The README speaks to a non-technical reader first

The README's first screen SHALL say what the assistant does, with example requests and no developer terms. One later section SHALL list setup's tools, why Cloudflare is needed, and each top-level entry's purpose.

#### Scenario: A non-technical reader

- **WHEN** someone new to coding agents reads the first screen
- **THEN** they learn what to ask and how to start, with no developer term

### Requirement: GitHub settings enforce the gate

The default branch SHALL require the test and payload checks, block force-push and deletion, and allow only squash merges; no save route SHALL rely on bypassing these rules. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on.

#### Scenario: A red pull request

- **WHEN** a pull request's required checks fail
- **THEN** GitHub refuses the merge

### Requirement: Each release is tagged

Each version SHALL get a `v<VERSION>` tag on the first default-branch commit that set it and a GitHub Release carrying its changelog entry, created automatically, filling any missed version. When GitHub refuses the workflow's token, the run SHALL warn and pass, and `/ship` SHALL create the missing Release with the person's own login. A changelog version no commit set SHALL fail the run.

#### Scenario: A new version merges

- **WHEN** a pull request raising `VERSION` to 25.7.0 merges
- **THEN** the merge commit is tagged `v25.7.0` and a Release carries the 25.7.0 entry

#### Scenario: GitHub refuses the workflow

- **WHEN** GitHub answers HTTP 403 for a release that changes a workflow file
- **THEN** the run warns and passes, and `/ship` creates it after
