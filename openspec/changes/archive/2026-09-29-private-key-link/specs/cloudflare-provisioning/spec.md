## MODIFIED Requirements

### Requirement: A plain page says how to add an API key

The stack section SHALL have a page for a non-developer that says to get a key from the service and give it to the assistant through the private key link, with pasting it into the chat with what it is for as the fallback; that the assistant saves it privately and gives it to hosting when the live site needs it; what to do when a key leaks; and that website logins are kept by the browser tool instead.

#### Scenario: A key leaks

- **WHEN** a reader thinks a key was shared by mistake
- **THEN** the page says to make a new key, give it to the assistant, and delete the old one

#### Scenario: A reader has a key to give

- **WHEN** a reader has copied a key from a service
- **THEN** the page tells them to give it through the private key link, and to paste it into the chat only as a fallback
