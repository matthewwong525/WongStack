## MODIFIED Requirements

### Requirement: Exploration owns update analysis

When the deterministic sync preflight reports an available update, `/wong-sync` SHALL delegate update judgment, questions, and scope decisions to `/explore` with the complete changed-unit classification as its initial scope. Exploration SHALL inspect related target context only where the classified change or a discovered dependency makes it relevant. It SHALL preserve existing user decisions, including legacy verdict records when present, as context. It SHALL NOT require a broad payload reread, dedicated analysis agents, a second classification pass, checkbox controls, or a second clarification procedure.

#### Scenario: Locally adapted workflow
- **WHEN** a classified upstream change overlaps a local workflow adaptation
- **THEN** `/explore` investigates that changed unit and the target context needed to understand it
- **AND** planned edits preserve local work unless its change is within the user's agreed scope

#### Scenario: Prior decisions
- **WHEN** a repo has an old verdict record with user choices
- **THEN** those choices inform exploration without rewriting the record or treating old model verdicts as user approval

#### Scenario: Small upstream delta
- **WHEN** the preflight identifies a small set of changed payload units
- **THEN** exploration starts from that set instead of comparing the full selected payload again
- **AND** it can expand only to named dependencies that affect the update decision
