# work-verbs Specification

## Purpose
Let the verbs a person invokes serve work that changes no repo file, such as research, errands, messages, and data changes, with a plan, a record, and confirmations that fit that work.
## Requirements
### Requirement: An invoked verb serves any work

When the person invokes `/explore`, `/plan`, `/apply`, `/save`, or `/continue` for work that changes no repo file, the verb SHALL run in its non-code form. It SHALL NOT create an OpenSpec change, a branch, a commit, or a review page for that work. The work SHALL decide the form; no setting, flag, or mode SHALL select it. Work that changes repo files SHALL use the verbs as the change loop defines them.

#### Scenario: Plan an errand

- **WHEN** the person invokes `/plan` to prepare a supplier comparison and an email to the chosen supplier
- **THEN** the agent writes a to-do in the conversation
- **AND** no OpenSpec change, branch, or review page is created

#### Scenario: Plan a code change

- **WHEN** the person invokes `/plan` to change how the app stores runs
- **THEN** `/plan` drafts an OpenSpec change and its review page as before

### Requirement: A non-code plan is a to-do in the conversation

For work that changes no repo file, `/plan` SHALL run `/explore`'s bounded pass under the same one-round limit, then write a short numbered to-do in the conversation. The to-do SHALL mark each step that acts outside the conversation. `/plan` SHALL write no file for it.

#### Scenario: A plan names its outward steps

- **WHEN** `/plan` writes a to-do that ends with sending an email
- **THEN** the sending step is marked as an action outside the conversation

### Requirement: Apply confirms each outward action

For work that changes no repo file, `/apply` SHALL work the to-do in order. Before each step that acts outside the conversation — a sent message, a post, a created or changed record in a service, a payment, or a deletion — it SHALL show exactly what it will do and ask in the shared ask format. It SHALL NOT cover several outward actions with one confirmation unless the person asked for that. Steps that only read, search, or draft SHALL run without a prompt. When the steps are done, `/apply` SHALL report the result and SHALL NOT invoke `/save`.

#### Scenario: Send an email

- **WHEN** `/apply` reaches a step that sends an email
- **THEN** it shows the recipient and the full text and asks before it sends
- **AND** a declined step is not done and is reported

#### Scenario: Research only

- **WHEN** every step only reads and summarizes
- **THEN** `/apply` completes the to-do without a prompt and reports the result

### Requirement: Save and continue keep non-code progress as a thread

For work that changes no repo file, `/save` SHALL record a thread fact through the memory write gate: what is done, what is next, and any blocker. It SHALL make no commit. `/continue` SHALL offer open threads beside active changes and SHALL resume a chosen thread by recapping it and handing the remaining steps to `/apply`.

#### Scenario: Stop halfway

- **WHEN** the person runs `/save` after two of four steps
- **THEN** a thread fact records the two done steps and the next step
- **AND** no git change is made

#### Scenario: Resume in a new session

- **WHEN** the person runs `/continue` and chooses that thread
- **THEN** the agent recaps it and continues from the next step

### Requirement: Ship is for repo changes

`/ship` SHALL act only on repo changes. When invoked for work that changes no repo file, it SHALL say that the work finishes in `/apply` and SHALL make no git change.

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand that changed no file
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change

