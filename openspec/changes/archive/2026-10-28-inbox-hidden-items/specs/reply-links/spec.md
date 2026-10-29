## ADDED Requirements

### Requirement: A chat can put an Inbox item with no page

A chat SHALL be able to put an item with a title, a header and buttons, and no file, in the Inbox, and SHALL get its id, or none where no chat can be woken. An open item of the same chat with the same title SHALL be replaced. A hidden item SHALL show in no Inbox list and SHALL still deliver its taps to its chat. A kept-open item SHALL stay open after a delivered tap, SHALL wake its chat on each tap, and SHALL move its close to its hours from that tap. An item with a stop message SHALL wake its chat once with that message when it runs out of time, and SHALL NOT when its chat or file is gone.

#### Scenario: A chat watches a mini app's Submit

- **WHEN** a chat puts a hidden, kept-open item for 8 hours with a stop message, and the person submits twice in a mini app that taps it
- **THEN** the Inbox shows no card, the chat is woken twice, the item closes 8 hours after the last tap, and the chat then gets the stop message once
