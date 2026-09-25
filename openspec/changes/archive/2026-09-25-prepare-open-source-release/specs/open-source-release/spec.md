## Purpose

Make the public WongStack repository safe and legal to reuse: a license, a way to report security problems, no committed secrets, and a setup prompt whose URL works for a first-time reader.

## ADDED Requirements

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
