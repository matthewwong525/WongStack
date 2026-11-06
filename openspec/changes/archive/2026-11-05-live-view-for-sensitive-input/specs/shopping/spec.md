## MODIFIED Requirements

### Requirement: The agent never sees a payment secret from Shop

A card number, a payment credential, or the Shop sign-in SHALL NOT appear in any command, output, log, message, or repository file the agent can read. Of a saved payment method the agent SHALL see only what names it to the person, such as brand and last digits. The agent SHALL NOT obtain a card issued for it to type into a website.

#### Scenario: A checkout lists saved cards

- **WHEN** a checkout returns the person's saved payment methods
- **THEN** the agent sees each one's brand and last digits, and no credential

#### Scenario: A website outside Shop's checkout

- **WHEN** a purchase can only be made by typing a card into a website's own form
- **THEN** the agent requests no card from Shop, and the person types the card on the site in a live view
