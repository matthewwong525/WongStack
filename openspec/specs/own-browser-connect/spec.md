# own-browser-connect Specification

## Purpose

Lets the assistant connect a person's work tools in its own browser, a window on the person's computer or a watch link on a server, making each key there and sending it sealed to the company app without the chat ever holding it.

## Requirements

### Requirement: The assistant makes the narrowest key and handles no password

In its own browser, the assistant SHALL make for each tool the narrowest key the tool offers that only reads, and SHALL make a key that can change things only when the person asks for it by name. When the tool's page asks the person to sign in, the person SHALL sign in themselves on their turn, and the assistant SHALL NOT type, save, or ask for a password or a sign-in code.

#### Scenario: Signed in already

- **WHEN** the assistant's browser is signed in to Stripe
- **THEN** the assistant makes a Stripe key that only reads, and the person types nothing

#### Scenario: Signed out

- **WHEN** Notion shows its sign-in page in the assistant's browser
- **THEN** the person signs in on their turn, and no password reaches the assistant

### Requirement: A key moves from the page to the app unseen

A key the assistant makes SHALL be sealed on the computer before it is sent, SHALL travel to the company app under the person's company sign-in, and SHALL NOT pass through the chat, a command line, a log, or a tracked file. The computer SHALL need no Cloudflare login to send it. The chat SHALL show only the tool and the key's last four characters, and SHALL say the key goes live at the next publish, never that it is live already. While a key shows on a page, every reading of that page the assistant gets SHALL hide it, and the assistant SHALL take no picture of that page.

#### Scenario: A Stripe key is made

- **WHEN** Stripe shows a new key on its page, on a computer with no Cloudflare login
- **THEN** the sealed key reaches the app, the chat says the Stripe key is sent, ends in its last four characters, and goes live at the next publish, and no reading, picture, or chat record holds the rest

#### Scenario: A reading while the key shows

- **WHEN** the assistant reads the page while the new key is on the screen
- **THEN** the reading shows the key hidden, with only its last four characters

### Requirement: The assistant makes keys in its own browser by default

When the person asks to connect a tool, the assistant SHALL make the key in its own browser, on every computer, with no question first: shown as a window on a Mac or Windows computer, and through the watch link on a server. It SHALL act only on the page it opened for connecting, and SHALL leave the browser's other pages, and every sign-in the browser holds, as they were. It SHALL NOT type a saved login on a key page, and SHALL NOT change Access.

#### Scenario: Already signed in from an errand

- **WHEN** the assistant runs on a server, its browser is signed in to Stripe from an earlier errand, and the owner says *connect my Stripe*
- **THEN** the assistant makes a Stripe key that only reads, the chat shows only its last four characters, and the person types nothing

#### Scenario: On a Mac

- **WHEN** the owner says *connect my Shopify* on a Mac
- **THEN** the key page opens in the assistant's browser window, with no question about Chrome

#### Scenario: Another task's page

- **WHEN** a scheduled errand has a bank page open in the same browser while the owner connects Notion
- **THEN** the assistant never reads or acts on the bank page, and closes only its own page at the end

### Requirement: The person can take over or stop the assistant's browser

When the assistant makes keys in its own browser on a server, it SHALL start at once, report in the chat, and send no link unless a sign-in needs one or the person asks to watch. An open link SHALL show that browser live, with one short line under it that says what the person can do now. While the assistant works, the person's taps and typing SHALL NOT reach the browser. The person SHALL be able to take over at any time from the link, after which the assistant SHALL send its browser no command and read nothing from it until the person hands back, and SHALL then read the page afresh before it goes on. In a browser window on the person's own computer, the person's turn SHALL be the sign-in turn alone. On every computer, the person SHALL be able to stop at any time in the chat, after which the assistant SHALL make no more keys, SHALL keep the keys already sent, and SHALL list the rest as waiting. The link SHALL save nothing the person types, and SHALL close when the run ends.

#### Scenario: Already signed in

- **WHEN** the owner says *connect my Notion* on a server and the assistant's browser is already signed in to Notion
- **THEN** the assistant makes the key with no link sent, and the chat shows only the key's last four characters

#### Scenario: Taking over mid-run

- **WHEN** the person taps take over in an open link while the assistant is on Notion's integrations page
- **THEN** the assistant's next step does not run, the person's taps reach the browser, and after hand back the assistant reads the page again and goes on

#### Scenario: Stopping

- **WHEN** the person says stop in the chat after the Stripe key is sent and before the Notion key is made
- **THEN** Stripe stays sent, no Notion key is made, and the chat lists Notion as waiting

### Requirement: The person signs in to a tool on their turn in a link

When a tool's key page in the assistant's own browser asks the person to sign in, the assistant SHALL give the person a turn, saying which tool to sign in to: in the browser window on a Mac or Windows computer, and through a link on a server. The person's request to connect SHALL cover each such turn in that run, with no question before it. The assistant SHALL NOT type, save, or ask for a password or a sign-in code, and SHALL send its browser no command during the turn. The turn SHALL end only when the person taps *Hand back* on the link, or says *done* for the window, never because the site let them in; the assistant SHALL then read the key page afresh and make the key. A tool whose sign-in the turn does not finish, that asks for a passkey, or that turns the sign-in away SHALL be listed for the person to paste its key in Access.

#### Scenario: Signed out of Notion

- **WHEN** Notion shows its sign-in page in the assistant's browser on a server
- **THEN** the link says to sign in to Notion and tap *Hand back*, the person signs in there with their own password and code and taps *Hand back*, and the assistant makes the Notion key with no password reaching it

#### Scenario: Signed out of Shopify on a Mac

- **WHEN** Shopify shows its sign-in page in the assistant's browser window
- **THEN** the chat says to sign in to Shopify in the window and say *done*, the person signs in there and says *done*, and the assistant makes the key once the key page opens, with no password reaching it

#### Scenario: A passkey

- **WHEN** a tool's sign-in asks for a passkey
- **THEN** the assistant stops trying that tool and lists it, at the end, for the person to paste its key in Access
