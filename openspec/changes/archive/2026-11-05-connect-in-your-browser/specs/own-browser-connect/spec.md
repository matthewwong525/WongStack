# Spec Delta

## Purpose

Lets the assistant connect a person's work tools through the Chrome they already use and are signed in to, making each key there and sending it to the company app without the chat ever holding it.

## ADDED Requirements

### Requirement: The assistant asks before it uses the person's Chrome

The assistant SHALL use the person's own open Chrome only after the person says yes in the chat and Chrome itself allows the connection. It SHALL act and read only in tabs it opened, SHALL leave the person's other tabs unread and untouched, and SHALL close only its own tabs when it is done, never Chrome. When no Chrome on the assistant's computer allows the connection, or the person says no, the assistant SHALL connect the tools by the private key link instead.

#### Scenario: The person says yes

- **WHEN** the owner says yes and allows the connection in Chrome, with their mail open in another tab
- **THEN** the assistant opens each tool in a new tab, never reads the mail tab, and closes only its own tabs at the end

#### Scenario: Chrome is on another computer

- **WHEN** the assistant runs on a server and finds no Chrome it may connect to
- **THEN** it sends the private key link for the tools, as before, and nothing waits on the browser

### Requirement: The assistant makes the narrowest key and handles no password

In the person's Chrome, the assistant SHALL make for each tool the narrowest key the tool offers that only reads, and SHALL make a key that can change things only when the person asks for it by name. When the tool's page asks the person to sign in, the assistant SHALL ask them to sign in in that tab themselves, and SHALL NOT type, save, or ask for a password or a sign-in code.

#### Scenario: Signed in already

- **WHEN** the person's Chrome is signed in to Stripe
- **THEN** the assistant makes a Stripe key that only reads, and the person types nothing

#### Scenario: Signed out

- **WHEN** Notion shows its sign-in page in the assistant's tab
- **THEN** the assistant asks the person to sign in there and waits, and no password reaches the assistant

### Requirement: A key moves from the page to the app unseen

A key the assistant makes SHALL go from the page to the ignored live file and to the live company app without passing through the chat, a command line, a log, or a tracked file. The chat SHALL show only the tool and the key's last four characters, and SHALL NOT say the live app holds a key that waits for the next publish. While a key shows on a page, every reading of that page the assistant gets SHALL hide it, and the assistant SHALL take no picture of that page.

#### Scenario: A Stripe key is made

- **WHEN** Stripe shows a new key on its page
- **THEN** the key reaches the live app, the chat says the Stripe key is saved and ends in its last four characters, and no reading, picture, or chat record holds the rest

#### Scenario: A reading while the key shows

- **WHEN** the assistant reads the page while the new key is on the screen
- **THEN** the reading shows the key hidden, with only its last four characters
