## ADDED Requirements

### Requirement: A page's send comes from the person

A message that a page or an inbox tap sends to its chat SHALL reach that chat as the person's own message. It SHALL NOT carry the name of any chat, such as the chat that first started the shared page server. After an update, a page server or inbox helper still running from older code SHALL be replaced the next time a page opens there, and each open link SHALL keep its address.

#### Scenario: A send after another chat started the server

- **WHEN** chat A opened the first page on the computer, and the person taps *Send notes* on a plan that chat B opened
- **THEN** chat B gets the notes as the person's own message, with no sign of chat A

#### Scenario: An older server is running

- **WHEN** a page server from older code is running and a chat opens a new page
- **THEN** the server is replaced, the new page and each open link keep working at the same address, and later sends come from the person
