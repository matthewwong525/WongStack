## ADDED Requirements

### Requirement: A new workspace on a saved branch opens only reviewed work

Opening a saved branch in a new workspace SHALL apply the same review as `/continue`'s switch, before the workspace exists. When the branch holds commits new to this computer, the workspace SHALL NOT open until the person has said yes to the exact newest commit. It SHALL then open on that commit, so the workspace's setup runs only what the person saw. A newer commit saved after the review SHALL stop the open, and the workspace's starting commit SHALL be checked against the reviewed one.

#### Scenario: A busy workspace picks up a teammate's branch

- **WHEN** `/continue` runs in a workspace holding other unpublished work, on a teammate's branch new to this computer
- **THEN** it shows that branch's changed files and asks before offering a new workspace, and no workspace opens without a yes

#### Scenario: The open names no reviewed commit

- **WHEN** the workspace script is asked to open a branch holding commits new to this computer without the reviewed commit, or with one that is no longer the newest
- **THEN** it opens nothing and returns the commits and files to review

#### Scenario: The teammate saves again during the open

- **WHEN** the person reviewed commit A and the teammate's newer commit B reaches the remote before the workspace opens
- **THEN** the new workspace starts at A or does not open, and its setup never runs B's files

#### Scenario: The new workspace asks before building

- **WHEN** a new workspace opens on reviewed work and its first message also carries the person's instruction
- **THEN** its agent recaps and asks before building, and runs no install, test, or `/apply` first
