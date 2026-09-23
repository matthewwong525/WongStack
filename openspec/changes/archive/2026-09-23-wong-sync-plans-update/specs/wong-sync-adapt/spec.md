## MODIFIED Requirements

### Requirement: Exploration owns update analysis

When the deterministic sync preflight reports an available update, `/wong-sync` SHALL invoke `/plan`, and the bounded `/explore` that `/plan` runs SHALL own update judgment, questions, and scope decisions with the complete changed-unit classification as its initial scope. That exploration SHALL ask at most one question group before the plan is drafted. It SHALL inspect related target context only where the classified change or a discovered dependency makes it relevant. It SHALL preserve existing user decisions, including legacy verdict records when present, as context. It SHALL NOT require a broad payload reread, dedicated analysis agents, a second classification pass, checkbox controls, or a second clarification procedure.

#### Scenario: Locally adapted workflow
- **WHEN** a classified upstream change overlaps a local workflow adaptation
- **THEN** the bounded exploration investigates that changed unit and the target context needed to understand it
- **AND** planned edits preserve local work unless its change is within the user's agreed scope

#### Scenario: Update questions
- **WHEN** the update leaves material decisions open
- **THEN** the bounded exploration asks them as one group of at most four questions before any artifact is drafted
- **AND** it records remaining decisions as assumptions in the plan instead of asking again

#### Scenario: Prior decisions
- **WHEN** a repo has an old verdict record with user choices
- **THEN** those choices inform exploration without rewriting the record or treating old model verdicts as user approval

#### Scenario: Small upstream delta
- **WHEN** the preflight identifies a small set of changed payload units
- **THEN** exploration starts from that set instead of comparing the full selected payload again
- **AND** it can expand only to named dependencies that affect the update decision
