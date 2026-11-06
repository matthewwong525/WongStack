## MODIFIED Requirements

### Requirement: Access lists every key's status without its value

Access SHALL give the owner and Admins a Services view beside People and Roles, listing every registered key with its name, purpose, whether it is saved, waiting for the next publish, or not saved, and whether it is also used directly. Each key SHALL offer a place to paste its value, sealed in the browser before it is sent. The view SHALL never show a key's value, a sealed value, or a level. A person who manages nothing SHALL NOT see the view.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services with Stripe saved and Mailchimp not saved
- **THEN** Stripe shows Saved, Mailchimp shows Not saved with a way to paste its key, and no value is on the screen

#### Scenario: The owner pastes a key

- **WHEN** the owner pastes the Mailchimp key in Services and saves it
- **THEN** Mailchimp shows that it waits for the next publish with its last four characters, and the value never shows again

#### Scenario: A teammate looks for Services

- **WHEN** a teammate who manages nothing opens Access
- **THEN** no Services view is offered and the Services address shows them nothing about keys
