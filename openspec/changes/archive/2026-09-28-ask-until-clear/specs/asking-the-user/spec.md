## REMOVED Requirements

### Requirement: One question round before planning

**Reason**: One round forced a guess whenever an answer opened a new material choice, though another multiple-choice question costs the person seconds.
**Migration**: Replaced by *Questions before planning continue while a choice is open*; follow-up groups keep the same bar and format.

## ADDED Requirements

### Requirement: Questions before planning continue while a choice is open

At the move into planning, however planning was invoked, `/explore` SHALL ask only the choices a wrong guess would make the plan wrong, not merely different, as structured multiple-choice asks of no more questions than the tool holds per group. When the answers open another such choice, it SHALL ask a follow-up group rather than assume it, and SHALL stop asking once none is open. A choice already settled SHALL NOT be asked again, nested calls included, and a minor gap SHALL become a recorded assumption with its reason.

#### Scenario: Everything is settled

- **WHEN** the conversation already answered every material choice
- **THEN** `/explore` asks nothing and moves to its summary

#### Scenario: An answer opens a new choice

- **WHEN** the first group's answers reveal another choice that would make the plan wrong if guessed
- **THEN** `/explore` asks a follow-up multiple-choice group before the plan is drafted
