## REMOVED Requirements

### Requirement: Session capture excludes credential values

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: A conversation-only session does not produce an OpenSpec change

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: Session context lives as facts in the memory store

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: `/save` is the deliberate capture point

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: Facts keep what a cold reader needs

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: A prose-only save commits directly to the default branch

**Reason**: Merged into `delivery-gate`'s "The gate is CI-when-present, else PR review", which already owned the prose allowlist.
**Migration**: None; the protected-branch fallback and the prose-only report are kept there.
