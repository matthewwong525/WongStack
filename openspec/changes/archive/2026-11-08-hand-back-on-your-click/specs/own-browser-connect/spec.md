## MODIFIED Requirements

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
