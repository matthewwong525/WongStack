## MODIFIED Requirements

### Requirement: The repository carries an open-source license and a security policy

The repository root SHALL contain an MIT `LICENSE` with the copyright holder and year, and a `SECURITY.md`. `SECURITY.md` SHALL say how to report a vulnerability privately, and SHALL name each Cloudflare credential WongStack uses, where it is stored, and what it can do. The README SHALL link both files.

#### Scenario: A reader checks reuse terms

- **WHEN** a reader opens the repository on GitHub
- **THEN** GitHub detects the MIT license
- **AND** the README links `LICENSE` and `SECURITY.md`

#### Scenario: A reader finds the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names the user token, the deploy token, and the memory key, where each is stored, and which one can mint other tokens
