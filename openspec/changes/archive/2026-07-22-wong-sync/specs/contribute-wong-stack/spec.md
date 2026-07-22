# contribute-wong-stack — delta spec (retirement)

`/contribute-wong-stack` is retired; `/wong-sync` absorbs the upstream leg. Every requirement is removed — the durable behaviors (manifest-scoped diff, per-file confirmation, release ritual, app files never leak) carry forward as requirements of the `wong-sync` capability; the skill-specific ones (no git, dirty-clone handoff, symlink distribution) are superseded outright.

## REMOVED Requirements

### Requirement: Upstream-only direction
**Reason**: Superseded — `/wong-sync` runs both directions in one pass (pull first, then contribute), making a dedicated upstream-only skill redundant.
**Migration**: Run `/wong-sync`; its contribute leg is the upstream direction, reached after the pull leg.

### Requirement: Manifest-scoped diff
**Reason**: Carried forward, not abandoned — the same manifest-only scoping is now a requirement of the `wong-sync` capability ("Single payload manifest, wong-sync included"), with the list living in one place inside the wong-sync skill.
**Migration**: No user action; the same files (and no others) flow through `/wong-sync`.

### Requirement: Per-file confirmation before applying
**Reason**: Superseded by wong-sync's three-way classification and curation bar — files needing no decision are handled silently; contribution candidates still require explicit opt-in per file.
**Migration**: Approve/skip candidates inside `/wong-sync`'s contribute leg.

### Requirement: Release ritual in the clone
**Reason**: Carried forward — the VERSION bump + CHANGELOG entry now happen inside wong-sync's clone-side commit, only when contributions are approved.
**Migration**: No user action; the ritual is part of the PR `/wong-sync` opens.

### Requirement: Does not run git
**Reason**: Deliberately reversed — the no-git rule forced a dirty-clone handoff ("cd to the clone and /save"). The rescoped rule is: no git in the target, full git (branch, commit, push, PR) in the clone.
**Migration**: None; `/wong-sync` opens the upstream PR itself and leaves the clone clean.

### Requirement: Excluded from the copied payload
**Reason**: The premise changed — the successor skill `wong-sync` IS payload, installed into every target, so exclusion-plus-symlink no longer applies to the upstream flow. `install-wong-stack` remains source-only.
**Migration**: The installer/sync offers to remove installed or symlinked `contribute-wong-stack` copies.
