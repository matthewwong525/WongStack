## REMOVED Requirements

### Requirement: On a computer with its own screen, the turn happens in the browser's window

**Reason**: The Mac no longer hides the browser window until the person's turn, so the requirement's hidden-on-a-Mac rule and its scenario go.

**Migration**: Replaced by *On a computer with its own screen, the turn happens in the shown browser window*, which keeps every other promise.

## ADDED Requirements

### Requirement: On a computer with its own screen, the turn happens in the shown browser window

On a Mac or Windows computer, and on a Linux computer with a screen and the link setting off, the agent's browser SHALL open in a window on the screen by default, and the window SHALL stay shown while the agent works: it SHALL never hide by itself. The person's turn SHALL happen in that window, on the task's own tab: the chat SHALL say what to do and to say *done*, and the turn SHALL end on the finish or on *done*. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. On a Mac or Windows computer with the window off, a step that needs the person SHALL end with steps to finish in their own browser.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** the window, already shown, brings that task's tab to the front, no link is sent, the chat asks the person to sign in in the browser window and say *done*, and the agent carries on once the page shows them signed in

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

#### Scenario: A Linux computer with a screen

- **WHEN** a task on a Linux computer with a screen and the link setting off meets a login page
- **THEN** the browser shows in a window there, and the turn goes as on a Mac, with no link
