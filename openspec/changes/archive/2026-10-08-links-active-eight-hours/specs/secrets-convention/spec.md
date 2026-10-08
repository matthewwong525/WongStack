## MODIFIED Requirements

### Requirement: The key link waits for the person
A key link SHALL stay open for eight hours by default from when it is opened, and its page SHALL show the time left. An explicit time override SHALL be honored. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a password link
- **THEN** the key link closes, the password link opens, and the first chat says its link closed and offers a new one

### Requirement: An unsaved key link says what happened
When a key link ends with nothing saved, the agent SHALL learn whether the person ever opened it and, when it closed for another private link, which workspace opened that link. The agent SHALL say which happened before it offers a new link, and SHALL NOT send another link to a person who never opened the last one without asking whether it loaded. What the agent learns SHALL hold no key value, private address, or page content.

#### Scenario: A link that ran out unopened

- **WHEN** a key link reaches its default eight hours and nobody opened it
- **THEN** the agent says nobody opened it and asks whether the link loaded, before any new link

#### Scenario: Another chat's link took its place

- **WHEN** an unopened key link closes because a chat in another workspace opened a private link
- **THEN** the first chat names that workspace, says its own link closed for it, and offers a new one
