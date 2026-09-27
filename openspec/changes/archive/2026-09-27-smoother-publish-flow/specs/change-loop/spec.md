## MODIFIED Requirements

### Requirement: Plain requests are done directly

The agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round, asking only when it cannot act without an answer. A plain request that edited a repo file, such as a wiki note, SHALL end by asking whether to publish it, so no edit is left unsaved.

#### Scenario: An errand

- **WHEN** the person asks for a shop's opening hours
- **THEN** the agent answers, with no `/explore` round and no OpenSpec change

#### Scenario: A note to remember

- **WHEN** the person says "remember that invoices go out on the 1st" and the agent writes it to the wiki
- **THEN** the reply ends by asking whether to publish it, recommended first, and a yes runs `/ship`
