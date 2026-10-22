## MODIFIED Requirements

### Requirement: The chief sends approvals and questions to the inbox when it is on

When the person's inbox is available, the chief SHALL put each approval and each *needs you* question in the inbox instead of asking them in the daily chat, and SHALL write one line in the chat saying what waits there, with the inbox link. An answer from the inbox SHALL be relayed as the person's own answer; words the person typed on an approval SHALL count as approval only when they plainly say so. An answer the person types in the daily chat SHALL still count, and SHALL close the matching inbox item. When the person answers the agent in its own chat instead, the watch SHALL close that agent's open inbox items once the agent works again or stops asking, and the chief SHALL say so in one line. Where the inbox is unavailable, the chief SHALL ask in the chat as before.

#### Scenario: An approval while the inbox is on

- **WHEN** a watched agent asks to send a customer email and the inbox is available
- **THEN** the chat shows one line that an approval waits in the inbox, and the person's *Approve* there reaches the agent

#### Scenario: The person answers in the chat instead

- **WHEN** an approval waits in the inbox and the person types *approve it* in the daily chat
- **THEN** the chief relays the approval and the inbox item closes

#### Scenario: The person answers in the agent's own chat

- **WHEN** a question waits in the inbox and the person answers it in the agent's own chat, and the agent starts working
- **THEN** the item leaves the inbox, a later tap on it is never delivered, and the daily chat says it was answered in its chat
