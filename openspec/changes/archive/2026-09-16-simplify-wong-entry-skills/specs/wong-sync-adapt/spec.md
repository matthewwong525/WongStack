## REMOVED Requirements

### Requirement: Capability adaptation is the default and only analysis path

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Two independent subagents, synthesized by the main thread

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The unit of analysis is a capability, not a file or a skill

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: One verdict per capability

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The analysis proposes and never implements

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Every verdict lands in a durable, reviewable record

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The user can overrule any verdict by ticking a box

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Only a recorded decline suppresses re-evaluation

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: Every changelog entry since the last sync is accounted for

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: The read boundary is broad; the write boundary is narrow

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

### Requirement: A bounded clarification stage precedes verdict assignment

**Reason**: Replaced by the normal workflow handoff.
**Migration**: Use the entry skill context with `/explore` and the later WongStack skills.

## ADDED Requirements

### Requirement: Exploration owns update analysis

`/wong-sync` SHALL delegate comparison, questions, and scope decisions to `/explore`. It SHALL pass existing user decisions, including legacy verdict records when present, as context. It SHALL NOT require dedicated analysis agents, classifications, checkbox controls, or a second clarification procedure.

#### Scenario: Locally adapted workflow
- **WHEN** upstream and local workflows differ
- **THEN** `/explore` investigates the difference and uses its normal question policy
- **AND** planned edits preserve local work unless its change is within the user's agreed scope

#### Scenario: Prior decisions
- **WHEN** a repo has an old verdict record with user choices
- **THEN** those choices inform exploration without rewriting the record or treating old model verdicts as user approval
