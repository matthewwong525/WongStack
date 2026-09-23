## MODIFIED Requirements

### Requirement: Planning uses the normal proposal format

When an update exists, `/plan` SHALL own the change name, proposal, review, and task structure. `/wong-sync` SHALL supply intent and context without a fixed proposal body or sync-specific report format. A bare sync invocation SHALL end at the validated plan and its `review.html`, presented for review, and SHALL NOT implement the update unless the user has requested a later stage.

#### Scenario: Update plan
- **WHEN** a bare sync finds an update
- **THEN** the ordinary `/plan` skill creates the reviewable change with its normal artifacts, including `review.html`
- **AND** it presents the review and stops without editing payload files in the target

#### Scenario: Update already complete
- **WHEN** the preflight or planning finds no relevant update
- **THEN** the result is reported without a required empty change or verdict file

#### Scenario: Existing implementation request
- **WHEN** the user has already asked to implement or ship the update
- **THEN** the corresponding normal skill continues the workflow with that authorization
