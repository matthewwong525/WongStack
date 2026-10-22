## MODIFIED Requirements

### Requirement: Every private link goes through Cloudflare and closes itself
A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. Each link SHALL default to a 24-hour time limit from opening and SHALL honor an explicit time override. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a private form without a send or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: Every private input page starts calm

A key link, a password link, and a private form SHALL share one look. Each SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. Each SHALL offer *Not now*, which closes the link as closing it does today. A key link and a private form SHALL show when they close as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in their last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a private form has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock
