## MODIFIED Requirements

### Requirement: The skill sets up the credential file for the user

The skill SHALL resolve the durable `.env` in the repository's primary worktree from Git metadata, including when invoked from a linked worktree. When the durable file does not exist, it SHALL create it from the active branch's `.env.example`, SHALL confirm that Git ignores the destination at the primary worktree, and SHALL ask the user only for the token value to paste. It SHALL read and narrowly update `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in that same durable file throughout the run. It SHALL NOT instruct the user to create a dotfile, choose a variable name, or verify their own ignore rules. It SHALL NOT overwrite or remove a pre-existing linked-worktree `.env`; when one exists separately, it SHALL report the duplicate without displaying values and continue using the durable file.

#### Scenario: Fresh repo with no durable .env

- **WHEN** provisioning starts in a repo that has `.env.example` but no `.env` in its primary worktree
- **THEN** the skill creates the primary worktree's `.env` from the active branch's example, verifies that destination is ignored by git, and asks for the token value alone

#### Scenario: Provisioning runs from a linked worktree

- **WHEN** `/wong-cloudflare` receives or updates a credential from a linked worktree
- **THEN** it writes and rereads the primary worktree's durable `.env`
- **AND** a later run from another worktree finds the same value

#### Scenario: A duplicate linked-worktree file is preserved

- **WHEN** provisioning finds both the durable `.env` and a separate regular `.env` in the active linked worktree
- **THEN** it uses the durable file and reports that the duplicate needs reconciliation
- **AND** it neither exposes values nor deletes, replaces, or bulk-merges the active file

#### Scenario: The credential file is never committed

- **WHEN** the token value has been written to the durable `.env`
- **THEN** the skill confirms git does not see the destination as a change
- **AND** it stops and warns rather than continuing if the destination would be committed
