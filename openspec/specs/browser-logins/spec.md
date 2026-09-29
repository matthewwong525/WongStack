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

The agent SHALL hand the browser to the person to log in, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password anywhere but the browser tool's encrypted login store, which only the person fills through the password link.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

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

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready to log in, opens no link until they reply, and the link's 10 minutes start from that reply

### Requirement: A hand-over link closes itself

A hand-over link SHALL stop working when the finish the agent named is reached, when the person says they are done, or after 10 minutes, whichever comes first, even if the agent's session has ended. A closed link SHALL never work again. When the agent named a finish, it SHALL resume the task on reaching it without the person saying they are done.

#### Scenario: The person logs in

- **WHEN** the browser reaches the logged-in address the agent named
- **THEN** the link stops working and the agent resumes the task

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass without reaching the finish or hearing done
- **THEN** the link stops working and the agent tells the person it timed out

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, and dropdown choices to list them for the person, and MAY set a field on the person's action; it SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list

- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

### Requirement: The agent shows its browsing in the chat

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, and take none while the person has the browser.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A hand-over mid-task

- **WHEN** the agent hands the person its browser for a login
- **THEN** no picture appears until the hand-over ends

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer. When the link is open in a window narrower than 800 CSS pixels, the handed page SHALL take that window's width, so the site shows its own narrow layout at full size; a wider window SHALL get 1280×720. When the link closes, however it closes, the page SHALL return to 1280×720 before the agent carries on.

#### Scenario: A card number from a phone

- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab

- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page

#### Scenario: A link opened on a phone

- **WHEN** the person opens the link on a phone 390 points wide
- **THEN** the handed page is 390 wide or less, shows the site's phone layout, and a tap lands on the spot tapped
- **AND** after the link closes, the page is 1280×720 again

### Requirement: The person can fill a handed-over form from a list of its fields

A hand-over page SHALL list the handed page's text fields, dropdowns, and tick boxes, each labelled and in page order, with a dropdown showing the page's own choices. A value the person enters in the list SHALL reach the matching field on the page, as they type or pick it. Each box SHALL carry the kind of value it holds, from the page field's own marking, name, or label, so a password manager or a phone's autofill can fill the list. The list SHALL follow the page as it changes, and a field the list can't show SHALL stay reachable by tapping it on the picture and typing.

#### Scenario: Expiry dropdowns from a phone

- **WHEN** a handed-over card page has dropdowns for expiry month and year, and the person picks 03 and 2028 in the list on a phone
- **THEN** the page's dropdowns show 03 and 2028

#### Scenario: A password manager fills the card

- **WHEN** the person's password manager fills the list's card number, expiry, and security code boxes at once
- **THEN** each value lands in its own field on the page

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. It SHALL NOT hand the browser over to get that answer.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, closing on *Done* or after 10 minutes. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list saved with one *Save*. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps *Save*
- **THEN** that login is saved, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps *Save* once
- **THEN** both logins are saved, and the agent names both sites in the chat

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When it fails, or the site then asks for a code, the agent SHALL hand the browser over as for any login. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, with no hand-over

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and hands the browser over
