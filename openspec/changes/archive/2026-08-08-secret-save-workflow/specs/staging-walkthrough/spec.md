## ADDED Requirements

### Requirement: Walkthrough credentials follow the durable worktree store

The walkthrough SHALL honor `CLOUDFLARE_API_TOKEN` and optional Access credentials already exported into its process. When a required value is not exported, it SHALL resolve the repository's primary worktree from Git metadata and read the durable ignored `.env` there, rather than assuming the active linked worktree contains a copy. It SHALL NOT print any resolved value or persist the primary worktree's absolute path in repository artifacts.

#### Scenario: Walk runs from a linked worktree

- **WHEN** `/walk` runs from a linked worktree with no local `.env` and the required credentials exist in the primary worktree's durable file
- **THEN** preflight authenticates with the durable credentials
- **AND** it does not report the token as missing or ask the user to copy it

#### Scenario: Exported credentials retain precedence

- **WHEN** the walk process already has a required credential in its environment
- **THEN** preflight uses the exported value without replacing it from a file

#### Scenario: No durable credential exists

- **WHEN** neither the process environment nor the durable primary-worktree file supplies the required credential
- **THEN** the walkthrough retains its `UNKNOWN` missing-credential verdict and points to the secrets convention
- **AND** no linked-worktree copy is created as a side effect
