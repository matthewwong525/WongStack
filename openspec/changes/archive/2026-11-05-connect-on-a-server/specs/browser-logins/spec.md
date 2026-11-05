## MODIFIED Requirements

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use its own browser, saved logins, screenshots, page extraction, or a private form for that token step. The one exception SHALL be connecting a tool, where the person said yes to the agent using their own open Chrome, or the agent uses its own browser by the own-browser connect requirements: the agent MAY then make the key in that browser by the own-browser connect requirements, and SHALL type no saved login there. A newly supplied or replacement value SHALL otherwise use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

#### Scenario: Connecting in the person's own Chrome

- **WHEN** the owner connects Stripe and says yes to the agent using their own Chrome
- **THEN** the agent makes the Stripe key in that Chrome, and no key-page picture or reading holds the key

#### Scenario: Connecting in the agent's own browser on a server

- **WHEN** the agent runs on a server and the owner says *connect my Notion*
- **THEN** the agent makes the Notion key there, the owner signs in through a link if asked, and no key-page picture or reading of the agent's holds the key

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present, a stuck login, a site step the agent's click can not get through, a private form's press, a password link's sign-in, a sign-in while connecting tools in the agent's own browser, watching it when the person asks, with taking over, and a PayPal approval. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes; an email a login asks for SHALL follow the password link requirements instead. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle), and a stuck login, SHALL follow the live view requirement; a sign-in while connecting, and watching it, SHALL follow the own-browser connect requirements. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every other step, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent solves nothing, asks whether the person is ready, and sends a live view for the person to do the puzzle

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

## ADDED Requirements

### Requirement: A paste anywhere on a live view types into the browser

In every live view, a paste the person makes on the browser's picture, or in the box under it, SHALL type the pasted text into the part of the browser that has the focus, as if typed. The view SHALL save nothing pasted, and the agent SHALL NOT see it.

#### Scenario: Pasting a password on a laptop

- **WHEN** the person taps Notion's password box in the sign-in link on a laptop and pastes a password from their own password manager onto the browser's picture
- **THEN** the password appears in Notion's box, and nothing pasted reaches the chat, a file, or a log
