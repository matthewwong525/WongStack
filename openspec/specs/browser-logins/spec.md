# browser-logins Specification

## Purpose

Let the agent use the person's own web accounts through agent-browser, with each login done once and reused, kept out of preview checks.

## Requirements

### Requirement: One persistent profile keeps logins

When a task first needs a login and agent-browser has no `profile`, the agent SHALL set one to an absolute folder. It SHALL NOT change a `profile` already set.

#### Scenario: An existing config

- **WHEN** the config has other keys and no `profile`
- **THEN** the agent adds `profile` and keeps the rest

### Requirement: The person does each login once

The agent SHALL hand the browser to the person to log in, then reuse the session. It SHALL NOT ask for or store a password.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

### Requirement: Personal browsing runs one task at a time

Browsing tasks and scheduled runs SHALL NOT share the profile at once; a task that finds it busy SHALL wait or report, never delete its lock. Preview checks SHALL NOT use the personal profile.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run finds the profile in use
- **THEN** it reports the browser busy and leaves the lock alone

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses a temporary profile with none of the person's logins

### Requirement: Personal browsing follows the installed tool's guide

Before a task's first agent-browser command, the agent SHALL load the guide agent-browser serves for its installed version.

#### Scenario: A first browsing task in a session

- **WHEN** a task needs the person's saved logins and has not yet loaded the guide
- **THEN** the agent loads it before opening the site

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

### Requirement: A hand-over link closes itself

A hand-over link SHALL stop working when the finish the agent named is reached, when the person says they are done, or after 10 minutes, whichever comes first, even if the agent's session has ended. A closed link SHALL never work again. When the agent named a finish, it SHALL resume the task on reaching it without the person saying they are done.

#### Scenario: The person logs in

- **WHEN** the browser reaches the logged-in address the agent named
- **THEN** the link stops working and the agent resumes the task

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass without reaching the finish or hearing done
- **THEN** the link stops working and the agent tells the person it timed out

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

### Requirement: The agent shows its browsing in the chat

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, and take none while the person has the browser.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A hand-over mid-task

- **WHEN** the agent hands the person its browser for a login
- **THEN** no picture appears until the hand-over ends

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer.

#### Scenario: A card number from a phone

- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab

- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page
