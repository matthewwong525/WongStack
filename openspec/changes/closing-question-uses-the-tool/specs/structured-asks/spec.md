## MODIFIED Requirements

### Requirement: A reply that returns control offers the next step

A skill SHALL end a reply that hands control back to the user with the decision that moves the work forward, put as a structured question in the same choice format. The skill SHALL carry that question with the same question mechanism as every other ask, in the same tool order, and SHALL NOT write it as numbered chat while a structured question tool is callable. The report, review link, or blocker that precedes the question SHALL be written as chat text before the question. This SHALL apply to a completed stage, a checkpoint, a report, and a blocked or partial result. The options SHALL be the supported ways to continue from the reported state, with the recommended one first. Where the work continues without user input, the skill SHALL continue instead of asking.

#### Scenario: A stage completes and stops

- **WHEN** a skill finishes its work and returns control to the user
- **THEN** its reply ends with the supported next steps as options, the recommended one first

#### Scenario: A structured question tool is callable at the end of a reply

- **WHEN** a skill ends a reply with the next-step question and `AskUserQuestion`, `request_user_input`, or an equivalent tool is callable
- **THEN** the report and any review link are written as chat text first
- **AND** the next-step question is asked through that tool, not as numbered chat

#### Scenario: Work is blocked or partial

- **WHEN** a skill stops with a blocker or unfinished work
- **THEN** its reply ends with the supported ways to resolve the blocker as options
- **AND** the report of the blocker stays intact

#### Scenario: The chain continues on its own

- **WHEN** a skill hands off to another skill that its invocation already authorized
- **THEN** it continues the chain
- **AND** it does not interrupt with a next-step question

## ADDED Requirements

### Requirement: A reply that makes or changes a plan prints its review link

Whenever a reply creates a change's plan or edits its proposal, the reply SHALL print *Click here to see the plan:* with a Markdown link to the change's `review.html`, as chat text on its own line. This SHALL hold whichever skill made or edited the plan — `/plan`, `/apply` planning first, `/continue`, `/ship`, `/wong-sync`, or review notes — and SHALL hold when the work continues without stopping. When the reply ends with a question, the link SHALL come just above it, outside the question tool. The rule SHALL live in the shared ask convention and be stated in the `WONG-STACK` block; a skill SHALL link it rather than restate it.

#### Scenario: A plan is made without the plan verb

- **WHEN** `/apply`, `/ship`, or `/wong-sync` creates a plan in the course of its own run
- **THEN** the reply prints the review link on its own line

#### Scenario: The work continues after planning

- **WHEN** the person's invocation authorizes building straight after the plan
- **THEN** the reply prints the review link before the build continues
- **AND** it does not stop to ask only because the link was printed

#### Scenario: The reply ends with a question

- **WHEN** a reply that made or changed a plan ends with a next-step question asked through a structured question tool
- **THEN** the link is chat text just above the question, not inside the tool's card
