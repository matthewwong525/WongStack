# open-source-release Specification

## Purpose

Make the public WongStack repository safe and legal to reuse: a license, a way to report security problems, no committed secrets, and a setup prompt whose URL works for a first-time reader.

## Requirements

### Requirement: The repository carries an open-source license and a security policy

The repository root SHALL contain an MIT `LICENSE` with the copyright holder and year, and a `SECURITY.md`. `SECURITY.md` SHALL say how to report a vulnerability privately, and SHALL name each Cloudflare credential WongStack uses, where it is stored, and what it can do. The README SHALL link both files.

#### Scenario: A reader checks reuse terms

- **WHEN** a reader opens the repository on GitHub
- **THEN** GitHub detects the MIT license
- **AND** the README links `LICENSE` and `SECURITY.md`

#### Scenario: A reader finds the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names the user token, the deploy token, and the memory token, where each is stored, and which one can mint other tokens

### Requirement: The setup URL resolves for a first-time reader

Every `raw.githubusercontent.com` URL in the README SHALL name a path that is a regular file in the git tree of the default branch. It SHALL NOT pass through a symbolic link, because that host returns `404` for a path through a directory link. A deterministic test SHALL fail when a README raw URL names a path that is not a regular file in the tree.

#### Scenario: The setup prompt URL loads

- **WHEN** a user pastes the README setup prompt into a coding agent
- **THEN** the agent fetches the `wong-setup` runbook with HTTP `200`

#### Scenario: A link path is rejected

- **WHEN** a README raw URL names a path under `.claude/`
- **THEN** the test fails and names the URL and the real path to use

### Requirement: The release is scanned for committed secrets

Before the release, the full git history SHALL be scanned for credential patterns: GitHub tokens, API keys, AWS keys, JWTs, bearer headers, and Cloudflare token-shaped values in `.env`-style assignments. The change SHALL record the scan result without printing a match. A true match SHALL stop the release until the credential is rotated. History SHALL NOT be rewritten as part of this change.

#### Scenario: The scan is clean

- **WHEN** the history scan finds no credential
- **THEN** the change records the scan date, the patterns, and a clean result

#### Scenario: The scan finds a credential

- **WHEN** the history scan finds a live credential
- **THEN** the release stops, the credential's name and commit are reported without its value, and the owner is asked to rotate it

### Requirement: The repository carries the community files GitHub detects

The repository SHALL contain a contributing guide, a code of conduct, issue templates, a pull request template, and a code owners file, each at a path GitHub's community profile detects. The contributing guide SHALL say how to run the test suite and the payload checks, and SHALL say that a pull request from a fork gets a build check but no preview deploy. The issue template configuration SHALL send security reports to the private advisory form. The pull request template SHALL include the VERSION and CHANGELOG checklist for payload changes.

#### Scenario: A first-time contributor opens an issue

- **WHEN** a reader selects "New issue" on GitHub
- **THEN** they choose a bug or feature template, and the security option opens the private advisory form

#### Scenario: A fork opens a pull request

- **WHEN** an outside contributor reads the contributing guide before opening a PR from a fork
- **THEN** it tells them that no preview URL appears on their PR and why

### Requirement: The README states the problem, the requirements, and the layout

The README's first screen SHALL state the problem WongStack solves and what it does about it before any install step. The README SHALL list every tool that setup needs, including Node, `curl`, the OpenSpec install command, and the Windows symlink setting. It SHALL say why Cloudflare is required and link `SECURITY.md`. It SHALL name every top-level folder and file of the repository with its purpose. Working from the source SHALL start with a fork.

#### Scenario: A reader checks prerequisites

- **WHEN** a reader follows the README's requirements list on a new Windows machine
- **THEN** the list names every tool setup calls, and the symlink setting that the skills need

#### Scenario: A reader asks what a folder is for

- **WHEN** a reader sees `schema/` or `paseo.json` at the repository root
- **THEN** the README's layout table says what it is

### Requirement: GitHub settings enforce the documented gate

The default branch SHALL be protected by a ruleset that requires the test and payload checks to pass and blocks force-push and deletion. The repository owner SHALL be able to bypass it for prose saved straight to the default branch. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on. Only squash merges SHALL be allowed, and head branches SHALL be deleted after a merge. The agent SHALL show each setting to the user before it applies it.

#### Scenario: A red PR cannot merge

- **WHEN** a PR's required checks fail
- **THEN** GitHub refuses the merge

#### Scenario: A reporter follows SECURITY.md

- **WHEN** a reader opens the private vulnerability reporting link in `SECURITY.md`
- **THEN** GitHub shows the report form

### Requirement: Markdown links resolve on github.com

No live Markdown link SHALL pass through a symbolic link, because GitHub's web view does not follow a directory link. Links SHALL name the real path.

#### Scenario: A reader clicks a skill link in the wiki

- **WHEN** a reader clicks a link to a skill from a wiki page on github.com
- **THEN** GitHub opens the file, not a 404 page

### Requirement: Live files carry no private names

No tracked file outside `openspec/changes/` and `CHANGELOG.md` SHALL name a private downstream repository or service. Change folders are exempt because an active change may name a private repository to describe its task, and it becomes part of the archive when it ships. Examples and tests SHALL use generic names.

#### Scenario: A reader searches the code

- **WHEN** a reader searches the live files for a private downstream name
- **THEN** there is no match outside the change folders and the changelog

### Requirement: Each release is tagged

Each release SHALL be tagged `v<VERSION>` on its merge commit, and SHALL have a GitHub Release whose body is its changelog entry.

#### Scenario: A user pins a version

- **WHEN** a user looks for release 19.0.0
- **THEN** the tag `v19.0.0` and its GitHub Release exist, and the release body is the 19.0.0 changelog entry
