## MODIFIED Requirements

### Requirement: Non-code progress is kept as a thread

For work that changes no repo file, what is done, what is next, and any blocker SHALL be kept as a memory thread with no git change, recorded by the memory plugin's capture of the chat, not by `/save`. `/continue` SHALL offer open threads beside active changes and resume the chosen one. `/ship` SHALL act only on repo changes.

#### Scenario: Stop halfway and resume

- **WHEN** the person stops a chat after two of four steps of an errand, then runs `/continue` in a new session
- **THEN** no git change is made, and the agent recaps the thread and continues from the third step

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change
