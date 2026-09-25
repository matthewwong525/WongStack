## REMOVED Requirements

### Requirement: The stack section stays optional and does not make WongStack stack-specific

**Reason**: Setup starts from an empty folder and always provisions Cloudflare, so the stack section is core.
**Migration**: None for readers. The section stays at `wiki/stack/`; its new rules are in "The stack section is core and reachable".

## ADDED Requirements

### Requirement: The stack section is core and reachable

The `wiki/stack/` section SHALL be linked from `wiki/README.md` as core process, and its hub SHALL link every page in the section. The pages SHALL contain nothing specific to any single app — every example is generic. The Access runbook SHALL be the only path to the login wall: it SHALL say to widen the user token into the Access groups and to turn on the Worker's enforcement in the same step, because a public Worker that trusts an identity header lets anyone send that header.

#### Scenario: The section is reachable but not orphaned

- **WHEN** a reader opens `wiki/README.md`
- **THEN** it links the `wiki/stack/` hub
- **AND** the hub links every page in the section

#### Scenario: A user asks for a login wall

- **WHEN** a user asks an agent to put the app behind a login
- **THEN** the agent follows the Access runbook, widens the user token into the Access groups, and turns on enforcement in the same step
