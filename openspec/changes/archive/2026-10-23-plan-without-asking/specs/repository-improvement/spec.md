## MODIFIED Requirements

### Requirement: One plan, then it stops

A normal invocation SHALL authorize selecting one improvement and writing its plan, and nothing more: `/improve-code` SHALL NOT build, publish, or change any file outside the plan. The run SHALL end at the plan's link the way any finished plan ends. A run with nobody to answer SHALL leave the plan saved and waiting, and SHALL NOT write a second plan while an earlier one of its own still waits.

#### Scenario: A person runs it
- **WHEN** a person invokes `/improve-code` and one improvement is supported
- **THEN** they get a plan's link to review and build from, and no code has changed

#### Scenario: A scheduled run
- **WHEN** a routine runs `/improve-code` and one improvement is supported
- **THEN** a saved plan waits for the person, their next chat shows it, and nothing is built or published
