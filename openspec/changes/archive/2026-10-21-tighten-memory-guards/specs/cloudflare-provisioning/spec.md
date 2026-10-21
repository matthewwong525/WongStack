## ADDED Requirements

### Requirement: Going private turns the open-site memory key off

When a provisioning run leaves an install private and the setup computer still holds the open-site memory key, it SHALL turn every memory key off and remove the key from `.env`, and its report SHALL say memory now uses the company sign-in. A run that leaves the install open SHALL keep the key.

#### Scenario: The card is added later

- **WHEN** an install set up open until the card is provisioned again after the card is added, and the private login comes on
- **THEN** `.env` holds no memory key, the store holds no working key, and the report says memory uses the company sign-in

#### Scenario: Still waiting for the card

- **WHEN** provisioning runs again while Zero Trust still wants a payment method and the install stays open
- **THEN** the admin memory key stays in `.env` and keeps working
