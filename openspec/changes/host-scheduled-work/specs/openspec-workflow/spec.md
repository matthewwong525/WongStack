## ADDED Requirements

### Requirement: Published scheduled goals remain open

OpenSpec SHALL distinguish finite scheduled-work goal records from code-change records. A finite goal's agreed instructions and execution reference SHALL be publishable to the repository while its goal tasks remain incomplete, and that record SHALL stay discoverable as open work. Completion or cancellation SHALL close and archive the selected goal; a pause or unanswered question SHALL keep it open. Publication SHALL not represent the goal as achieved. Ongoing routines without a terminal goal SHALL use lightweight repo definitions and SHALL not create permanently open OpenSpec records.

#### Scenario: Publish a payment follow-up

- **WHEN** the person activates a schedule to follow up until an invoice is paid
- **THEN** its plan is available from the default branch with its goal unfinished and is visible among open scheduled work

#### Scenario: Finish the scheduled goal

- **WHEN** the invoice payment is verified and the native schedule is stopped
- **THEN** the record closes with evidence and is archived without altering capability specs for the business task

### Requirement: Delivery and resumption honor a record's lifecycle

The WongStack verbs SHALL identify a finite scheduled-work goal or lightweight routine definition before choosing a code build, archive, or branch-resumption path. Saving or publishing a goal record SHALL preserve its goal checklist; continuing scheduled work SHALL load the corresponding plan or definition. Existing published goals and ongoing routines SHALL not prevent an unrelated code change from shipping, and ordinary code delivery SHALL not execute or archive them accidentally.

#### Scenario: Ship code beside an open schedule

- **WHEN** the repo contains a published unfinished schedule and a finished code change is shipped
- **THEN** the code change ships through its ordinary gate and the scheduled goal remains open

#### Scenario: Continue a schedule

- **WHEN** the user continues a scheduled-work record from a fresh session
- **THEN** its current host binding and progress are loaded instead of treating the business goal as unchecked code implementation
