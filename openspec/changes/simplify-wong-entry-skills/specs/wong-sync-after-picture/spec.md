## REMOVED Requirements

### Requirement: The proposal is an after-picture, in four regions

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Gain is grouped by capability, never enumerated by file

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The Lose region states what adopting costs

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The picture states its own resolution

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Present verdicts name their local evidence

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

## ADDED Requirements

### Requirement: Planning uses the normal proposal format

When an update proceeds to planning, `/plan` SHALL own the change name, proposal, review, and task structure. `/wong-sync` SHALL supply intent and context without a fixed proposal body or sync-specific report format. A bare sync invocation SHALL remain in exploration unless the user has requested a later stage.

#### Scenario: Update plan
- **WHEN** exploration establishes update work and the user proceeds to planning
- **THEN** the ordinary `/plan` skill creates the reviewable change with its normal artifacts

#### Scenario: Update already complete
- **WHEN** exploration finds no relevant update
- **THEN** the result is reported without a required empty change or verdict file

#### Scenario: Existing implementation request
- **WHEN** the user has already asked to implement or ship the update
- **THEN** the corresponding normal skill continues the workflow with that authorization
