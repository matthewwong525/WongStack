## MODIFIED Requirements

### Requirement: Finished chats close only when the person picks them

The helper SHALL NOT send `/close` to a chat by itself, and SHALL NOT answer a chat's close question for the person. Where the host lets a chat watch other chats, the answer to *what's going on?* in any chat SHALL mark each watched chat whose work is published, with nothing new on its branch or in its folder since, that is not working and has no open question. It SHALL also mark, as covered, each watched chat that was told another chat covers its work and that is not working. A stopped chat whose last message asks the person a question in plain text, not on a card, SHALL get one message to ask it again on a card, at most once for that message, and SHALL stay out of the answer's own question. When it marks one or more other chats, it SHALL ask which to close, and SHALL send `/close` only to the chats the person picks. It SHALL NOT mark the chat that asks, a sub-agent, or a chat in the main checkout.

#### Scenario: The person picks one finished chat

- **WHEN** the chats `flashy-crab` and `calm-otter` are both published with nothing new, and the person answers *what's going on?* with "close flashy-crab"
- **THEN** `flashy-crab` gets `/close` once, and `calm-otter` stays open

#### Scenario: A published chat left open

- **WHEN** a chat's change is published, and the person leaves it open for an hour without asking *what's going on?*
- **THEN** the chat stays open and gets no `/close`

#### Scenario: A covered chat

- **WHEN** `calm-otter` was told `flashy-crab` covers its work and stopped, and the person asks *what's going on?*
- **THEN** `calm-otter` is marked covered by `flashy-crab` and offered for closing, and closes only if the person picks it

#### Scenario: A typed question comes back as a card

- **WHEN** `flashy-crab` stopped on "Close this chat?" in plain text, and the person asks *what's going on?* twice
- **THEN** `flashy-crab` gets one message to ask again on a card, is not in the answer's own close question, and gets no `/close` until the person taps *Close it*

#### Scenario: The helper leaves a close card alone

- **WHEN** a chat waits on a close card with *Close it (Recommended)*, and a check-in judges it
- **THEN** the card waits for the person, and an answer of *Close it* or *Keep it open* from the helper is refused
