## MODIFIED Requirements

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and every link written as chat text above it. A link SHALL NOT appear inside the question tool's question or options, and SHALL NOT appear only in the agent's reasoning; an option may name a link shown above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are a finished plan's, which ends with its link and a line telling the person to review it, and the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

#### Scenario: A link the person needs

- **WHEN** a reply gives the person a link, such as a pull request, a key link, or a private form, and ends with a question card
- **THEN** the full link is a line of chat text above the card, and neither the card's question nor its options holds the address

### Requirement: A changed plan's reply carries its link

A reply that creates a plan, or changes what it says or its checklist, SHALL show the full link to the plan's review page as its own chat line, never inside a question. When the plan is finished and waits on the person, the reply SHALL end with that link and a line telling the person to review it, building or publishing from the page, and SHALL ask no question. When the page opens without build choices, that line SHALL say how to build or publish from the chat. Any other closing question in a reply that changed a plan SHALL offer to review the plan; choosing it SHALL show the link again and start nothing. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change, and the link SHALL NOT add a stop.

#### Scenario: A plan finishes

- **WHEN** `/plan` finishes and the plan waits on the person
- **THEN** the reply ends with the plan's link and a line to review it and build from its page, and no question card

#### Scenario: A plan built on the way

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply shows the plan's link and the build continues without a stop

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no review of the plan

## ADDED Requirements

### Requirement: A request goes straight to a plan

A request for a change to the repo's code or process, made with no verb, SHALL go straight into planning: the assistant SHALL ask only the material questions, then write the plan, and SHALL NOT stop at a *Plan it?* question or announce which step it is in. Only a person who typed `/explore` SHALL get the *Plan it?* question. A chat message that asks for a change to a plan waiting on the person SHALL update that plan, asking only what the message newly opens and keeping settled answers, then show the plan's new link; a message that asks a question SHALL be answered as review notes are, leaving the plan unchanged.

#### Scenario: A plain request

- **WHEN** a person asks "make the plan page show the build buttons sooner" with no verb
- **THEN** the assistant asks only what it must, writes the plan, and ends with its link, without asking whether to plan it

#### Scenario: A follow-up on a waiting plan

- **WHEN** a plan waits on the person and they write in the chat "also cover the phone layout"
- **THEN** the assistant asks only a question that message opens, updates the plan, and shows its new link, without repeating earlier questions
