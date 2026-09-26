## ADDED Requirements

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

No live file outside `openspec/changes/archive/` and `CHANGELOG.md` SHALL name a private downstream repository or service. Examples and tests SHALL use generic names.

#### Scenario: A reader searches the code

- **WHEN** a reader searches the live files for a private downstream name
- **THEN** there is no match outside the archive and the changelog

### Requirement: Each release is tagged

Each release SHALL be tagged `v<VERSION>` on its merge commit, and SHALL have a GitHub Release whose body is its changelog entry.

#### Scenario: A user pins a version

- **WHEN** a user looks for release 19.0.0
- **THEN** the tag `v19.0.0` and its GitHub Release exist, and the release body is the 19.0.0 changelog entry
