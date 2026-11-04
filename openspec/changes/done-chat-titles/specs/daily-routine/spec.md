## ADDED Requirements

### Requirement: A finished chat's name shows DONE

Where the host lets the helper rename chats, the helper SHALL start the name of each watched finished chat with `DONE: `, by the same meaning of finished that *what's going on?* uses, and SHALL NOT close the chat for it. It SHALL replace an earlier capital-letter status mark such as `WAITING: `. When a chat it marked stops being finished, it SHALL take the mark off again. It SHALL NOT change a name the person changed after the mark, and SHALL NOT mark the Daily chat, a sub-agent, or a chat in the main checkout.

#### Scenario: A chat's work goes live

- **WHEN** the chat `Fix the invoice total` publishes its change, has nothing new in its folder, and stops with no open question
- **THEN** within a few minutes its name in the chat list is `DONE: Fix the invoice total`, and the chat stays open

#### Scenario: The person writes in a DONE chat

- **WHEN** the person sends a new message to `DONE: Fix the invoice total` and the chat starts to work
- **THEN** its name goes back to `Fix the invoice total`, and gets `DONE: ` again only when the chat is finished again
