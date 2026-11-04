## MODIFIED Requirements

### Requirement: A request goes straight to a plan

A request for a change to the repo's code or process, made with no verb, SHALL go straight into planning: the assistant SHALL ask only the material questions, then write the plan, and SHALL NOT stop at a *Plan it?* question or announce which step it is in. Only a person who typed `/explore` SHALL get the *Plan it?* question. A chat message that asks for a change to a plan waiting on the person SHALL update that plan, asking only what the message newly opens and keeping settled answers, then show the plan's new link; a message that asks a question SHALL be answered as review notes are, leaving the plan unchanged. A small change whose shape a skill's own page fixes, such as adding a new tool while connecting tools, SHALL get no plan to review: the assistant SHALL record and build it, then ask only whether to publish.

#### Scenario: A plain request

- **WHEN** a person asks "make the plan page show the build buttons sooner" with no verb
- **THEN** the assistant asks only what it must, writes the plan, and ends with its link, without asking whether to plan it

#### Scenario: A follow-up on a waiting plan

- **WHEN** a plan waits on the person and they write in the chat "also cover the phone layout"
- **THEN** the assistant asks only a question that message opens, updates the plan, and shows its new link, without repeating earlier questions

#### Scenario: Connect my tools

- **WHEN** the owner types *connect my tools* and names a tool the app does not know
- **THEN** one change that adds it is recorded and built, the owner is asked *publish it?* once, and no plan link is shown
