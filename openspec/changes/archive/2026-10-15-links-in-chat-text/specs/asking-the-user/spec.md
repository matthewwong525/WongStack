## MODIFIED Requirements

### Requirement: Every reply that returns control ends with the next step

A reply that hands control back SHALL end with the decision that moves the work on, asked in the choice format through the question tool, with the report and every link written as chat text above it. A link SHALL NOT appear inside the question tool's question or options, and SHALL NOT appear only in the agent's reasoning; an option may name a link shown above it. A handoff the invocation already authorized SHALL continue instead of asking. The only replies that end with no question are the answers to *Review the plan* and *See the preview*.

#### Scenario: A stage finishes

- **WHEN** a skill finishes and a structured question tool is callable
- **THEN** the report is chat text, and the next steps are asked through the tool, recommended first

#### Scenario: The chain continues

- **WHEN** `/ship` moves from one of its stages to the next
- **THEN** it continues without a next-step question

#### Scenario: A link the person needs

- **WHEN** a reply gives the person a link, such as a pull request, a key link, or a private form, and ends with a question card
- **THEN** the full link is a line of chat text above the card, and neither the card's question nor its options holds the address
