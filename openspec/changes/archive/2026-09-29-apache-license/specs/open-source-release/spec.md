## MODIFIED Requirements

### Requirement: The repository carries a license and a security policy

The repository SHALL hold a `LICENSE` with the unmodified Apache License 2.0 text, a `NOTICE` with the project's copyright line, and a `SECURITY.md` that says how to report a vulnerability privately and what each Cloudflare credential can do. The README SHALL name Apache 2.0 and link the license and the security policy.

#### Scenario: A reader checks the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names each token, where it lives, and which one can mint others

#### Scenario: GitHub names the license

- **WHEN** a visitor opens the repository page on GitHub
- **THEN** it shows the license as Apache-2.0
