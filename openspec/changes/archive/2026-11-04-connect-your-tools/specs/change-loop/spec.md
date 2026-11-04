## MODIFIED Requirements

### Requirement: A change asked with no verb stops at the plan and at the preview

A code or process change asked for with no verb SHALL stop at the plan's review link, with no question: from that page the person builds it, or builds and publishes it in one go with no stop before the merge. After a build alone, it SHALL stop at the preview to ask whether to publish, running the next verb on yes. A verb the person types SHALL keep its own reach. A small change whose shape a skill's own page fixes, such as adding a new tool while connecting tools, SHALL instead be recorded and built on the person's request, with no plan review link, and SHALL stop only to ask whether to publish.

#### Scenario: Yes to both stops

- **WHEN** the person asks to change how the app stores data, taps *Build it* on the plan's page, then says yes at the preview
- **THEN** the agent runs `/plan`, `/apply`, and `/ship` without the person naming a verb

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: Connect my tools

- **WHEN** the owner types *connect my tools* and names a tool the app does not know
- **THEN** one change that adds it is recorded and built, the owner is asked *publish it?* once, and no plan review link is shown

### Requirement: Only the person moves a chat past plan

A chat SHALL move past plan only when the person types a step, taps a build button on a plan's page, picks a build or publish choice the agent offered, or asks for a small change whose shape a skill's own page fixes, such as connecting a new tool. A step started inside another SHALL NOT narrow the outer one's limits.

#### Scenario: A plan is written

- **WHEN** a chat in plan has written a plan and the person has given no go
- **THEN** the agent ends on the plan's link and builds nothing

#### Scenario: Ship runs its chain

- **WHEN** the person types `/ship add a sign-up page`
- **THEN** planning and building inside it change files freely, through to the merge

#### Scenario: Connect my tools

- **WHEN** the owner types *connect my tools* and names a tool the app does not know
- **THEN** the chat builds the change that adds it with no other go, and stops at *publish it?*
