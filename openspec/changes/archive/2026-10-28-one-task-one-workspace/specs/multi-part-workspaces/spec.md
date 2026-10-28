## REMOVED Requirements

### Requirement: A publish offers the next work or closing
**Reason**: In a Paseo worktree a publish now opens the left work and closes, with no question (*A publish opens the next work, then closes*).
**Migration**: Nothing to do.

## ADDED Requirements

### Requirement: A publish opens the next work, then closes
When `/ship` finishes in a Paseo worktree, it SHALL open each asked-for part with no workspace yet in a new workspace, then run `/close`, with no closing question. Outside a Paseo worktree, its closing question SHALL offer the next part *(Recommended)* when one remains, a walk of the merged app, and stopping. A failed live look, or a `/ship` that `/close` invoked, SHALL NOT close.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A from a Paseo worktree and the asked-for part B has no workspace yet
- **THEN** it opens B in a new workspace, then runs `/close`

#### Scenario: Nothing left after a publish
- **WHEN** `/ship` merges from a Paseo worktree and no other asked-for work waits
- **THEN** it runs `/close` with no question

#### Scenario: Outside Paseo
- **WHEN** `/ship` merges outside a Paseo worktree and part B remains
- **THEN** the closing question offers B first and recommended
