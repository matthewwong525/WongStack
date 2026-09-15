## REMOVED Requirements

### Requirement: OpenSpec mode detection

**Reason**: The `/improve` skill is retired because its audit-to-plan workflow overlaps the standard `/explore` → `/plan` path and is rarely used.

**Migration**: Use `/explore` to investigate an improvement and `/plan` to create its OpenSpec change.

### Requirement: OpenSpec plans keep the handoff quality bar

**Reason**: Advisor-authored plans no longer form a separate plan type after `/improve` is removed.

**Migration**: Use the normal `/plan` artifacts and their existing quality rules.

### Requirement: Write boundary in OpenSpec mode

**Reason**: The retired advisor workflow has no write boundary to specify.

**Migration**: Use `/explore` for read-only investigation and `/plan` for artifact writes.

### Requirement: Variants operate on OpenSpec changes

**Reason**: The `/improve` variants are removed with the skill.

**Migration**: Use `/explore`, `/plan`, `/continue`, and the normal change loop directly.
