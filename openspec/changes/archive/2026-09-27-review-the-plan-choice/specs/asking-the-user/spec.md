## MODIFIED Requirements

### Requirement: A reply that makes or changes a plan prints its link

Whenever a reply creates a plan or edits its proposal, whichever verb did it, the reply SHALL print *Click here to see the plan:* with a link to the change's review page, as chat text on its own line, above any closing question. The link SHALL be the full path the page builder reports, never a shortened one, and it SHALL NOT be placed inside the question. When that reply ends with a question, the question SHALL offer *Review the plan*; picking it SHALL make the next reply end with the link line in plain text and no question after it, and SHALL start nothing. Printing the link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:* and the full-path link, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues
