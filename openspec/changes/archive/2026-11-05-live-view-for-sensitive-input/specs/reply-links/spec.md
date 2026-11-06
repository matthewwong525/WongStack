## MODIFIED Requirements

### Requirement: Reply links and private links stay apart

An open reply link SHALL never stop a key link or a live view from opening, nor the reverse, and several pages MAY hold reply links at once. A reply link SHALL never be used to collect a secret, and nothing in this capability SHALL let a private link's page content reach the chat.

#### Scenario: A key is needed during a review

- **WHEN** a plan's reply link is open and the assistant needs a key
- **THEN** the key link opens at once, and the plan's link keeps working
