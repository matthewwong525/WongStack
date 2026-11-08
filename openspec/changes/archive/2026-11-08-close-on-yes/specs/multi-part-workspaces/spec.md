## REMOVED Requirements

### Requirement: A publish opens the next work, then closes
**Reason**: A finished chat now asks before it closes.
**Migration**: See *A publish opens the next work, then asks to close*.

## ADDED Requirements

### Requirement: A publish opens the next work, then asks to close
When `/ship` finishes in a Paseo worktree, it SHALL open each asked-for part with no workspace yet in a new workspace, then ask *Close this chat?*, and SHALL run `/close` only on a yes. Outside a Paseo worktree, its closing question SHALL offer the next part *(Recommended)* when one remains, a walk of the merged app, and stopping. A failed live look, or a `/ship` that `/close` invoked, SHALL NOT ask to close.

#### Scenario: More work after a publish
- **WHEN** `/ship` merges part A from a Paseo worktree and the asked-for part B has no workspace yet
- **THEN** it opens B in a new workspace, then asks *Close this chat?*

#### Scenario: Nothing left after a publish
- **WHEN** `/ship` merges from a Paseo worktree, no other asked-for work waits, and the person answers *Keep it open*
- **THEN** the chat and its workspace stay open

#### Scenario: Outside Paseo
- **WHEN** `/ship` merges outside a Paseo worktree and part B remains
- **THEN** the closing question offers B first and recommended
