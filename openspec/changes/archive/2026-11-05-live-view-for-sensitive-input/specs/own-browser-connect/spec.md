## MODIFIED Requirements

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
