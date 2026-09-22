## MODIFIED Requirements

### Requirement: Explicit execution context
Interactive runs SHALL present investigated candidates and ask one group of material questions before selection is handed off, using the shared ask convention. Explicitly unattended runs SHALL use supported defaults, label them assumed, and defer decisions outside maintenance authority. An unanswered interactive question SHALL remain pending. An interactive run that returns control to the user SHALL end with the supported next steps as options, the recommended one first.

#### Scenario: Interactive user has not answered
- **WHEN** a material selection question remains unanswered
- **THEN** the run does not reinterpret silence as unattended execution or permission

#### Scenario: External unattended job
- **WHEN** the invocation or trusted host context explicitly establishes unattended execution
- **THEN** the run can choose an eligible candidate with recorded assumptions without waiting for interactive answers

#### Scenario: An audit-only run reports back
- **WHEN** an interactive run finishes with findings and returns control to the user
- **THEN** its report ends with the supported ways to continue as options, the recommended one first
