# Spec Delta

## MODIFIED Requirements

### Requirement: A plan opens inside the inbox without reaching the app

A plan item SHALL show the same review page the plan's file holds, with its notes and its actions. The page SHALL run sealed from the app: it SHALL be unable to read the person's sign-in, call the app, or change anything but its own notes, the files the person sends with a tap, and the actions its item offers.

#### Scenario: The person reviews a plan

- **WHEN** the person opens a plan item and taps *Build it*
- **THEN** the build request is queued for that plan's chat, carrying the version of the page they saw

#### Scenario: The page tries to reach the app

- **WHEN** a script on a plan's page tries to call the app or read its cookies
- **THEN** the call fails and nothing in the app changes

#### Scenario: A link on the page

- **WHEN** the person taps a link in a plan's page
- **THEN** it opens in a new tab, and the frame keeps the plan; a page that later loads in the frame can't tap or read notes

#### Scenario: A section link on the page

- **WHEN** the person taps *Changes* at the top of a plan in the inbox
- **THEN** the plan scrolls to its list of changes and stays in the frame

### Requirement: The inbox never holds a secret

No page that collects a password, key, card or other secret, and no form other than a review page's questions, SHALL ever be shown inside the inbox, and the inbox SHALL offer no way to enter a secret. Such a page MAY be listed as a link item holding only its title, its kind, its closing time and its address. *Open* SHALL take the person to the page's own private link in a new tab, sending the inbox's address nowhere. A link item SHALL take no taps and SHALL leave the list once its link ends.

#### Scenario: A key is needed

- **WHEN** an agent needs an API key while the inbox is on
- **THEN** the key page opens at its own private link, the inbox lists it with *Open*, and the key never reaches the app

#### Scenario: The link finished

- **WHEN** the person saves the key on the private link
- **THEN** the key's row leaves the inbox

### Requirement: An archived review page opens read-only

An archived review page SHALL open in the same view as a waiting one, showing the same page. It SHALL offer no action and take no notes, and no tap on it SHALL ever reach a chat. Above the page it SHALL say what reached the chat and when, with any notes sent, or that no answer came and when it closed. A page whose answer has just reached the chat SHALL look the same at once, before it moves to the Archive.

#### Scenario: Opening an answered page

- **WHEN** the person opens a page they answered with *Build and publish* and notes
- **THEN** the page shows read-only under the answer, its time and the notes, and offers no button

#### Scenario: Just answered

- **WHEN** the person taps *Approve* on a page in the inbox and the chat gets it
- **THEN** the page shows read-only under *Approve* and its time, with no *Send notes* and no *Remove* on a sent file

#### Scenario: An older page tries to send

- **WHEN** an archived page built before this change sends its notes
- **THEN** nothing reaches the chat, and the page says the link has closed

## ADDED Requirements

### Requirement: No one can open a file sent from the inbox after 24 hours

A file sent with a tap SHALL be kept by the app only for that tap's item and person, until the computer takes it, and SHALL be deleted once the computer has it, or when the tap is cancelled or fails. No one SHALL be able to open a file more than 24 hours after it was sent, and the app SHALL delete that file the next time the Inbox is used. No other person, item, or page SHALL be able to read it. The database's restore history MAY keep deleted data for up to 30 days.

#### Scenario: The computer takes the file

- **WHEN** the computer delivers a tap with a file to its chat
- **THEN** the app deletes the file, and asking for it again finds nothing

#### Scenario: The computer never comes back

- **WHEN** a file waits 24 hours and the computer has not taken it
- **THEN** no one can open it, and the next time the Inbox is used the app deletes it and its tap shows as not delivered
