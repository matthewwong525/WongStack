## MODIFIED Requirements

### Requirement: The watch tells the inbox where each agent stands

While the inbox is available, the daily watch SHALL report each watched agent's state to it: planning, waiting on the person, working with its latest step and the chief's last action, or done with its checked proof. A report SHALL carry no more of the agent's words than its latest step's one line. An agent that closes SHALL leave the inbox. The watch SHALL learn of a stop as soon as the agent reports it, and SHALL still check every minute for an agent that reports nothing.

#### Scenario: The chief keeps an agent going

- **WHEN** the chief replies *keep going* to the landing-page agent
- **THEN** its inbox card shows its latest step and *Kept going* within a minute

#### Scenario: A quick reply between checks

- **WHEN** a watched agent answers and stops again within a few seconds of the chief's reply
- **THEN** the watch sees the second stop at once, and its inbox card and the chief both act on it
