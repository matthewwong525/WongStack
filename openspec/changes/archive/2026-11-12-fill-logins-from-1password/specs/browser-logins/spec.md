## MODIFIED Requirements

### Requirement: The person does each login once

The person SHALL sign in to a site once, in a live view or the browser's window, and the agent SHALL then reuse the browser's session. The agent SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or store a password. It SHALL NOT type one, except a login picked from the person's unlocked password manager after their yes.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person signed in to
- **THEN** no sign-in step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers a live view to sign in instead

### Requirement: Sensitive input is typed only on the real site in a live view

A payment card, a backup or recovery code, a password, and any other lasting secret a page asks for SHALL be typed by the person, except a login picked from the person's unlocked password manager after their yes, on the site's own page, in a live view of the agent's browser, never in the chat and never in a page of the agent's own. The agent SHALL first fill the page's ordinary answers and ask in the chat whether the person is ready, naming what the step is for. The live view SHALL show one short line saying what to do now. The agent SHALL NOT read, picture, or act on its browser from the moment the view opens until the person's turn ends. The turn SHALL end only when the person taps *Hand back*, when the chat closes it, or at its time limit. The agent SHALL learn only how the turn ended, then read the page afresh.

#### Scenario: A sign-in

- **WHEN** a task meets Netflix's login page and the browser is not signed in
- **THEN** the agent asks whether the person is ready, sends a live view whose line says to sign in and tap *Hand back*, the person signs in there and taps *Hand back*, and the agent carries on signed in, never having seen the password

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person types it on the site in a live view, and the stored chat never holds it

#### Scenario: A login from the unlocked password manager

- **WHEN** a site needs a login, the person's unlocked 1Password offers one for it, and the person says yes to the agent's ask
- **THEN** the agent picks it, 1Password fills the site's own page with no live view, and the password never reaches the chat
