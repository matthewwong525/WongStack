## MODIFIED Requirements

### Requirement: The key link waits for the person

A key link SHALL stay open for 24 hours by default from when it is opened, and its page SHALL show the time left. An explicit time override SHALL be honored. A key link nobody has opened SHALL close at once when another private link is opened on the same computer; the agent SHALL then say the link closed and offer a new one. An opened key link SHALL keep its place: a second link SHALL NOT open until it ends.

#### Scenario: A slow sign-in at the service

- **WHEN** the person opens a key link 5 minutes after it was sent, then takes 15 minutes to sign in at the service
- **THEN** the page is still open, and the pasted key is saved

#### Scenario: A link nobody opened

- **WHEN** a key link sits unopened and another chat on the same computer needs a live view
- **THEN** the key link closes, the live view opens, and the first chat says its link closed and offers a new one
