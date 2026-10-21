## ADDED Requirements

### Requirement: A page reading never shows what a secret box holds

Every way the agent reads a page's text SHALL show a filled secret box only as filled, never its contents. A box SHALL count as secret when it is a password box, when its label or kind names a password, passcode, PIN, card number, card expiry, security code, or one-time code, or when the agent's saved-login step typed a password into it, even after the site switches it to plain text. An empty secret box, a dropdown's picked choice, and every other box SHALL read as before.

#### Scenario: A rejected login leaves the password typed

- **WHEN** a saved login is rejected and the agent reads the login page, with the password still in its box
- **THEN** the reading shows the password box as filled and hidden, and shows the username as typed

#### Scenario: A card box the private form filled

- **WHEN** the agent reads a checkout page whose card number box still holds the number the person sent through the private form
- **THEN** that box reads as filled and hidden, by the page reading and by asking for that one box's contents
