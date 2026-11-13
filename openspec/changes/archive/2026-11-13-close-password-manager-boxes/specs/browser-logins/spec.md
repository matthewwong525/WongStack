## MODIFIED Requirements

### Requirement: A step that needs the person goes to the chat or the live view

When a browsing step needs something only the person can give, an ordinary answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value, a sign-in, a check that asks whether a person is present, a site step the agent's click can not get through, and a PayPal approval SHALL go through a live view. A one-time code SHALL follow the login-code requirement, and an API key or token step the own-browser requirement. A sign-in while connecting tools in the agent's own browser, and watching it when the person asks, with taking over, SHALL follow the own-browser connect requirements. A passkey saved in the password manager in the agent's browser SHALL follow the password-manager pick requirement. A step only the person's own device can do (a passkey kept on their own phone or computer, or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a live view for the card only

#### Scenario: A passkey

- **WHEN** a site asks for a passkey, and the password manager in the agent's browser offers none
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device
