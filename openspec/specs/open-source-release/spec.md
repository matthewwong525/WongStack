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

Each version SHALL get a `v<VERSION>` tag on the first default-branch commit that set it and a GitHub Release carrying its changelog entry, created automatically, filling any missed version. A Release another run already created SHALL count as done, never as a failure. When GitHub refuses the workflow's token, the run SHALL warn and pass, and the person who merged SHALL create the missing Release with their own login. A changelog version no commit set, or an unnumbered entry on the default branch, SHALL fail the run.

#### Scenario: A new version merges

- **WHEN** a pull request raising `VERSION` to 25.7.0 merges
- **THEN** the merge commit is tagged `v25.7.0` and a Release carries the 25.7.0 entry

#### Scenario: GitHub refuses the workflow

- **WHEN** GitHub answers HTTP 403 for a release that changes a workflow file
- **THEN** the run warns and passes, and the person who merged creates it with their own login

### Requirement: A release is numbered when it publishes

A change to WongStack's payload SHALL describe itself in `CHANGELOG.md` under a `## Next` entry that names its bump level, and SHALL leave `VERSION` alone. `/ship` SHALL set `VERSION` and the entry's heading from the default branch's current version right before it merges, and SHALL NOT merge a release whose number another release took meanwhile; it renumbers and saves again instead. The merged commit's title SHALL name the version that shipped. A repo with no `## Next` entry SHALL publish exactly as before.

#### Scenario: Two changes are in flight

- **WHEN** a minor change and a patch change both wait on a default branch at 26.1.0, and the minor one publishes first
- **THEN** it ships as 26.2.0 with a title naming `v26.2.0`, and the patch one ships as 26.2.1, never as a second 26.1.1

#### Scenario: Another release lands during the checks

- **WHEN** a release numbered 26.2.0 is about to merge and the default branch has meanwhile reached 26.2.0
- **THEN** the merge stops, the change is renumbered from 26.2.0 and saved again, and only then merges
