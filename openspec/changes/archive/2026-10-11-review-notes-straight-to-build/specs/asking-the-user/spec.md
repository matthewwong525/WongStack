## ADDED Requirements

### Requirement: A review build choice carries its notes into the build

When review notes accompany an explicit Build it or Build and publish choice, the assistant SHALL apply requested plan changes and answer question notes, then continue directly into the authorized build or publish action without asking for a further build choice. Question notes SHALL NOT cause unrequested plan edits. A missing plan or material blocker SHALL stop the action and be reported. Notes sent alone SHALL retain their plan-only reach.

#### Scenario: Notes with build authorization

- **WHEN** the reviewer sends a rename note with Build it
- **THEN** the plan is updated and the assistant builds it without waiting for another build instruction

#### Scenario: Notes alone

- **WHEN** the reviewer sends the same note through Send notes
- **THEN** the plan is updated and building waits for a separate build choice
