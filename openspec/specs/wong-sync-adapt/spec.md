# wong-sync-adapt Specification

## Purpose

Use the shared exploration skill to compare upstream improvements with the target repo and preserve user choices without a separate verdict pipeline.

## Requirements

### Requirement: Exploration owns update analysis

`/wong-sync` SHALL delegate comparison, questions, and scope decisions to `/explore`. It SHALL pass existing user decisions, including legacy verdict records when present, as context. It SHALL NOT require dedicated analysis agents, classifications, checkbox controls, or a second clarification procedure.

#### Scenario: Locally adapted workflow
- **WHEN** upstream and local workflows differ
- **THEN** `/explore` investigates the difference and uses its normal question policy
- **AND** planned edits preserve local work unless its change is within the user's agreed scope

#### Scenario: Prior decisions
- **WHEN** a repo has an old verdict record with user choices
- **THEN** those choices inform exploration without rewriting the record or treating old model verdicts as user approval
