# own-browser-connect Specification

## Purpose

Lets the assistant connect a person's work tools through the Chrome they already use and are signed in to, making each key there and sending it to the company app without the chat ever holding it.

## Requirements

### Requirement: The assistant asks before it uses the person's Chrome

The assistant SHALL use the person's own open Chrome only after the person says yes in the chat and Chrome itself allows the connection. It SHALL act and read only in tabs it opened, SHALL leave the person's other tabs unread and untouched, and SHALL close only its own tabs when it is done, never Chrome. When the assistant runs on a server, it SHALL NOT offer the person's Chrome. When no Chrome on the assistant's computer allows the connection, or the assistant runs on a server, it SHALL make the keys in its own browser, with no further question, where it can show the person that browser; the private key link SHALL be the last fallback. When the person picks the key link, it SHALL connect the tools by the private key link.

#### Scenario: The person says yes

- **WHEN** the owner says yes and allows the connection in Chrome, with their mail open in another tab
- **THEN** the assistant opens each tool in a new tab, never reads the mail tab, and closes only its own tabs at the end

#### Scenario: Chrome is on another computer

- **WHEN** the assistant runs on a server and the person's Chrome is on their own computer
- **THEN** the assistant does not ask the person to switch on a Chrome setting, and makes the keys in its own browser without asking which way first

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

### Requirement: The assistant makes keys in its own browser by default

On a server, when the person asks to connect a tool, the assistant SHALL make the key in its own browser, with no question first and no key-link steps for the person. There, it SHALL make each key by the same rules as in the person's Chrome: the narrowest key that only reads, unless the person names a key that changes things; keys hidden in every reading; no picture while a key shows; each key sent to the live app unseen, with only its last four characters in the chat; and no change to Access. It SHALL act only on the page it opened for connecting, and SHALL leave the browser's other pages, and every sign-in the browser holds, as they were. It SHALL NOT type a saved login on a key page.

#### Scenario: Already signed in from an errand

- **WHEN** the assistant runs on a server, its browser is signed in to Stripe from an earlier errand, and the owner says *connect my Stripe*
- **THEN** the assistant makes a Stripe key that only reads, the chat shows only its last four characters, and the person types nothing

#### Scenario: Another task's page

- **WHEN** a scheduled errand has a bank page open in the same browser while the owner connects Notion
- **THEN** the assistant never reads or acts on the bank page, and closes only its own page at the end

### Requirement: The person can take over or stop the assistant's browser

When the assistant makes keys in its own browser, it SHALL start at once, report in the chat, and send no link unless a sign-in needs one or the person asks to watch. An open link SHALL show that browser live, with one short line under it that says what the person can do now. While the assistant works, the person's taps and typing SHALL NOT reach the browser. The person SHALL be able to take over at any time from the link, after which the assistant SHALL send its browser no command and read nothing from it until the person hands back, and SHALL then read the page afresh before it goes on. The person SHALL be able to stop at any time in the chat, after which the assistant SHALL make no more keys, SHALL keep the keys already saved, and SHALL list the rest as waiting. The link SHALL save nothing the person types, and SHALL close when the run ends.

#### Scenario: Already signed in

- **WHEN** the owner says *connect my Notion* and the assistant's browser is already signed in to Notion
- **THEN** the assistant makes the key with no link sent, and the chat shows only the key's last four characters

#### Scenario: Taking over mid-run

- **WHEN** the person taps take over in an open link while the assistant is on Notion's integrations page
- **THEN** the assistant's next step does not run, the person's taps reach the browser, and after hand back the assistant reads the page again and goes on

#### Scenario: Stopping

- **WHEN** the person says stop in the chat after the Stripe key is saved and before the Notion key is made
- **THEN** Stripe stays saved, no Notion key is made, and the chat lists Notion as waiting

### Requirement: The person signs in to a tool on their turn in a link

When a tool's key page in the assistant's own browser asks the person to sign in, the assistant SHALL send a link, or turn the open one to the person, saying which tool to sign in to, and SHALL take their taps and typing. The person's request to connect SHALL cover each such turn in that run, with no question before it. The assistant SHALL NOT type, save, or ask for a password or a sign-in code, and SHALL send its browser no command during the turn. When the person is signed in, the turn SHALL end by itself and the assistant SHALL make the key. A tool whose sign-in the turn does not finish, that asks for a passkey, or that turns the sign-in away SHALL go to the private key link.

#### Scenario: Signed out of Notion

- **WHEN** Notion shows its sign-in page in the assistant's browser
- **THEN** the link says to sign in to Notion, the person signs in there with their own password and code, the turn ends by itself, and the assistant makes the Notion key with no password reaching it

#### Scenario: A passkey

- **WHEN** a tool's sign-in asks for a passkey
- **THEN** the assistant stops trying that tool and lists it for the private key link at the end
