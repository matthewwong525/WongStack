## ADDED Requirements

### Requirement: Every key says what it is for

Every registered key SHALL carry a one-line purpose, and a key set up for direct use SHALL also carry a link to its service's public API guide. The checks SHALL fail before publishing on a key with no purpose, or a direct-use key with no guide link or one that is not HTTPS.

#### Scenario: A key is added without a purpose

- **WHEN** a change registers a Stripe key with a title and secrets but no purpose
- **THEN** the checks fail and name the Stripe key

### Requirement: Access lists every key's status without its value

Access SHALL give the owner and Admins a Services view beside People and Roles, listing every registered key with its name, purpose, whether it is saved and whether it is also used directly. The view SHALL show no key value and no level, and SHALL offer no place to type a key; an unsaved key SHALL say to ask the assistant for its key link. A person who manages nothing SHALL NOT see the view.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services with Stripe saved and Mailchimp not saved
- **THEN** Stripe shows Saved, Mailchimp says to ask for its key link, and no value is on the screen

#### Scenario: A teammate looks for Services

- **WHEN** a teammate who manages nothing opens Access
- **THEN** no Services view is offered and the Services address shows them nothing about keys
