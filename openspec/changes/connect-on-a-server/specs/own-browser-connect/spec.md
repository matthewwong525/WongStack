## MODIFIED Requirements

### Requirement: The assistant asks before it uses the person's Chrome

The assistant SHALL use the person's own open Chrome only after the person says yes in the chat and Chrome itself allows the connection. It SHALL act and read only in tabs it opened, SHALL leave the person's other tabs unread and untouched, and SHALL close only its own tabs when it is done, never Chrome. When the assistant runs on a server, it SHALL NOT offer the person's Chrome. When no Chrome on the assistant's computer allows the connection, or the assistant runs on a server, it SHALL make the keys in its own browser, with no further question, where it can show the person that browser; the private key link SHALL be the last fallback. When the person picks the key link, it SHALL connect the tools by the private key link.

#### Scenario: The person says yes

- **WHEN** the owner says yes and allows the connection in Chrome, with their mail open in another tab
- **THEN** the assistant opens each tool in a new tab, never reads the mail tab, and closes only its own tabs at the end

#### Scenario: Chrome is on another computer

- **WHEN** the assistant runs on a server and the person's Chrome is on their own computer
- **THEN** the assistant does not ask the person to switch on a Chrome setting, and makes the keys in its own browser without asking which way first

## ADDED Requirements

### Requirement: The assistant makes keys in its own browser by default

On a server, when the person asks to connect a tool, the assistant SHALL make the key in its own browser, with no question first and no key-link steps for the person. There, it SHALL make each key by the same rules as in the person's Chrome: the narrowest key that only reads, unless the person names a key that changes things; keys hidden in every reading; no picture while a key shows; each key sent to the live app unseen, with only its last four characters in the chat; and no change to Access. It SHALL act only on the page it opened for connecting, and SHALL leave the browser's other pages, and every sign-in the browser holds, as they were. It SHALL NOT type a saved login on a key page.

#### Scenario: Already signed in from an errand

- **WHEN** the assistant runs on a server, its browser is signed in to Stripe from an earlier errand, and the owner says *connect my Stripe*
- **THEN** the assistant makes a Stripe key that only reads, the chat shows only its last four characters, and the person types nothing

#### Scenario: Another task's page

- **WHEN** a scheduled errand has a bank page open in the same browser while the owner connects Notion
- **THEN** the assistant never reads or acts on the bank page, and closes only its own page at the end

### Requirement: The person watches the assistant connect and can take over or stop

When the assistant makes keys in its own browser, it SHALL first send one private link that shows that browser live, with a line saying what the assistant is doing, and SHALL start when the person opens the link or says to go on without it. While the assistant works, the person's taps and typing SHALL NOT reach the browser. The person SHALL be able to take over at any time from the link, after which the assistant SHALL send its browser no command until the person hands back, and SHALL then read the page afresh before it goes on. The person SHALL be able to stop at any time, from the link or the chat, after which the assistant SHALL make no more keys, SHALL keep the keys already saved, and SHALL list the rest as waiting. The link SHALL save nothing the person types, and SHALL close when the run ends.

#### Scenario: Taking over mid-run

- **WHEN** the person taps take over while the assistant is on Notion's integrations page
- **THEN** the assistant's next step does not run, the person's taps reach the browser, and after hand back the assistant reads the page again and goes on

#### Scenario: Stopping

- **WHEN** the person taps stop after the Stripe key is saved and before the Notion key is made
- **THEN** Stripe stays saved, no Notion key is made, and the chat lists Notion as waiting

### Requirement: The person signs in to a tool on their turn in the watch link

When a tool's key page in the assistant's own browser asks the person to sign in, the watch link SHALL turn to the person, saying which tool to sign in to, and SHALL take their taps and typing. The person's request to connect SHALL cover each such turn in that run, with no question before it. The assistant SHALL NOT type, save, or ask for a password or a sign-in code, and SHALL send its browser no command during the turn. When the person is signed in, the turn SHALL end by itself and the assistant SHALL make the key. A tool whose sign-in the turn does not finish, that asks for a passkey, or that turns the sign-in away SHALL go to the private key link.

#### Scenario: Signed out of Notion

- **WHEN** Notion shows its sign-in page in the assistant's browser
- **THEN** the watch link says it is the person's turn, the person signs in there with their own password and code, the turn ends by itself, and the assistant makes the Notion key with no password reaching it

#### Scenario: A passkey

- **WHEN** a tool's sign-in asks for a passkey
- **THEN** the assistant stops trying that tool and lists it for the private key link at the end
