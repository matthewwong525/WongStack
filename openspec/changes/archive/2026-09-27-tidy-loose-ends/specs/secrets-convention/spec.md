## ADDED Requirements

### Requirement: One shared lookup finds the primary worktree

Every WongStack script that needs the primary worktree SHALL find it through one shared lookup, shipped in the payload with the memory skill. The lookup SHALL read absolute Git paths. When the git directory equals the common directory, the active checkout SHALL be the primary. Otherwise the primary SHALL be the parent of the common directory, and the lookup SHALL confirm that Git reports that same path as a checkout's top level. When Git fails, or the confirmation does not match (as in a bare repository), the lookup SHALL report failure and SHALL NOT return a guessed path. Each caller SHALL keep its own documented response to that failure. A script that saves a secret SHALL stop without writing. A script that only reads a secret MAY fall back to the active checkout.

#### Scenario: A normal checkout

- **WHEN** a script runs in a repository with one checkout
- **THEN** the lookup returns that checkout's root

#### Scenario: A linked worktree

- **WHEN** a script runs in a linked worktree of a normal repository
- **THEN** the lookup returns the primary checkout's root, the same path from every caller

#### Scenario: The common directory is not a checkout's

- **WHEN** a script runs in a linked worktree whose common directory belongs to a bare repository
- **THEN** the lookup reports failure instead of returning the bare repository's parent
- **AND** a secret-saving caller stops without writing a value
