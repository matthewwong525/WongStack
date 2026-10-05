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

The agent SHALL log in with a login the person saved, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password anywhere but the browser tool's encrypted login store, which only the person fills through the password link.

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

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. The person's own tap on a private form's button, which names the action, SHALL count as that yes for that action alone.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with every private link's safety: a new address and secret key each time, ending private input on successful completion, explicit closure, or after 10 minutes. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list. Its primary completion action SHALL save the selected pending logins, including a valid filled login not yet added to the list, and return to the requesting task in one tap. Failed saves SHALL stay open for correction and SHALL NOT announce readiness. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps its save-and-continue action
- **THEN** that login is saved and the requesting chat is notified, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps its save-and-continue action once
- **THEN** both logins are saved, and the agent names both sites in the chat

### Requirement: The agent logs in with a saved login

When a site asks for a login and a saved login matches the site, the agent SHALL use it without asking. When the site then asks for a one-time code or an app approval, the agent SHALL follow the login-code requirement. When the saved login is rejected, the agent SHALL send the password link with the site and that username filled in, so a new password replaces the old. When two saved logins match, it SHALL ask in the chat which to use.

#### Scenario: A site logged the person out

- **WHEN** a task finds a login page for a site with one saved login
- **THEN** the agent logs in with it and carries on, asking the person nothing

#### Scenario: A wrong saved password

- **WHEN** the saved login is rejected
- **THEN** the agent asks whether the person is ready and sends the password link with the site and username filled in

### Requirement: Completed private input wakes the originating workspace

A successful private-input completion opened by an identifiable workspace SHALL make one automatic notification attempt to that same workspace, even when its chat is idle. The notification SHALL contain only completion identity, outcome, and saved-entry names, never credentials, private addresses, or page content. The agent SHALL handle the same completion once if both a waiting tool call and the notification report it. An expired, cancelled, or incomplete input SHALL NOT declare the task ready. A failed or unavailable notification SHALL preserve saved inputs and tell the person how to return to the chat manually.

#### Scenario: The chat stopped waiting

- **WHEN** the person successfully finishes a private-input step whose originating chat is idle
- **THEN** the private input ends and its workspace receives a result-only notification that starts the chat on the existing task without another message from the person
- **AND** a waiting tool call reporting the same completion does not cause the task to run twice

#### Scenario: Workspace notification is unavailable

- **WHEN** entries have been saved but there is no identifiable originating workspace or the notification is unconfirmed
- **THEN** the entries stay saved, the result remains available, and the page directs the person back to the chat without claiming the assistant was notified

### Requirement: People handle API token websites in their own browser

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use browser automation, saved logins, screenshots, page extraction, or a private form for that token step. A newly supplied or replacement value SHALL use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request with a saved service login

- **WHEN** a task needs a missing API token and the agent has a saved login for the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

### Requirement: A site that blocks the agent's browser moves to the cloud browser

When a site shows a bot check the agent's own browser can't pass, or refuses it, the agent SHALL carry on in Cloudflare's cloud browser, saying so in one line in the chat, without retrying in its own browser. When the cloud browser is refused too, the agent SHALL stop browsing that site and give the person its link and the steps to do on their own device. Saved logins and private forms SHALL work in whichever browser the task uses.

#### Scenario: An order page behind a check

- **WHEN** the agent's own browser stays on a "Verify you are human" page for a restaurant's Uber Eats store
- **THEN** the chat says the site blocked the agent's browser, and the store's menu opens in the cloud browser with no tap from the person

#### Scenario: Both browsers are refused

- **WHEN** a DoorDash store refuses both browsers
- **THEN** the agent sends no private link and gives the store's link and the steps for the person's phone

### Requirement: A site's login carries over between the browsers

Before a site moves to the cloud browser, the agent SHALL copy only that site's login from its own browser into the cloud browser, and after the task SHALL copy any refreshed login for that site back. It SHALL NOT copy another site's login, or any cookie a bot check issued, and SHALL keep no copy after the switch. When the copied login is rejected, the agent SHALL log in there as for any login: a saved login, the password link, or a code through the chat.

#### Scenario: An order from a logged-in account

- **WHEN** the person is logged in to Uber Eats in the agent's browser and the Uber Eats store moves to the cloud browser
- **THEN** the cloud browser opens the store logged in, and no other site's login and no check's pass cookie is in it

#### Scenario: A login tied to one device

- **WHEN** a site rejects the copied login and asks for a code
- **THEN** the agent asks for the code in the chat and enters it in the cloud browser

### Requirement: The agent never disguises its browser

The agent SHALL NOT hide that its browser is automated, change the browser's identity to pass a check, send its traffic through another person's or a hired network address, use a check-solving service, or move a check's pass from one browser to another. This SHALL hold even when the person asks.

#### Scenario: The person offers to tap the check

- **WHEN** the person asks the agent to turn off its automated flag so a check passes
- **THEN** the agent declines and offers the cloud browser or the step on the person's own device

### Requirement: One setting picks the first browser

A machine-wide setting SHALL choose which browser a task tries first: the agent's own browser by default, or the cloud browser. The other browser SHALL remain the fallback.

#### Scenario: The person flips the default

- **WHEN** the person asks to use the cloud browser first
- **THEN** later tasks open sites in the cloud browser first, and a site that refuses it moves to the agent's own browser

### Requirement: A cloud browser session ends with its task

A cloud browser session SHALL close when its task finishes or fails, and SHALL close by itself after a bounded time even if the agent's session ends. When the account's cloud browser allowance is used up, the agent SHALL say so plainly and give the person the step to do on their own device.

#### Scenario: The chat stops mid-task

- **WHEN** the agent's session ends while a cloud browser session is open
- **THEN** the cloud browser session closes by itself within its time bound

#### Scenario: The daily allowance runs out

- **WHEN** a free-plan account has used its daily cloud browser minutes
- **THEN** the agent names the limit in plain words and gives the person the site's link and steps

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box, fills only the username and password, and the agent logs in with them

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form and no saved Google login matches
- **THEN** the agent opens Google's sign-in and sends the password link with Google's website filled in

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A step only the person can do on the page (a picture puzzle, a passkey or device check) SHALL NOT be attempted by the agent: where a bot check stops its own browser the site SHALL first move to the cloud browser, and otherwise the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. The agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle that the cloud browser does not clear
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: The person gives sensitive details through a private form

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once. The form SHALL never show the site's page. When the site does not move on, the form SHALL say so, SHALL NOT send again by itself, and the agent SHALL tell the person what the site said and offer a new form.

#### Scenario: A card from a phone

- **WHEN** the person fills the card number, picks 03 and 2028 for the expiry, types the security code, and taps the form's *Pay $45.00* button on a phone
- **THEN** the site's card fields receive those values, the site's pay action is pressed once, and the chat carries on with a picture of the receipt

#### Scenario: The site rejects the card

- **WHEN** the site keeps the card page and shows an error after the form sends
- **THEN** the form says the details were not accepted, nothing is sent a second time, and the agent tells the person what the site said and offers a new form

### Requirement: The agent never sees what a private form carries

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back or stored. A dropdown pick SHALL be one of the choices the agent named. While a private form is open, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer; when the site keeps the page, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks. The agent SHALL learn only the outcome.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form
- **THEN** the number reaches the site's card field, and appears in no command, file, log, or message the agent can read

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

### Requirement: Every private link goes through Cloudflare and closes itself

A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 10 minutes pass on a private form without a send or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: The agent pictures its browsing in the chat

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, and take none while a private form is open.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A card form mid-task

- **WHEN** a private form is open for a payment's card details
- **THEN** no picture appears until the site has answered

### Requirement: The agent gets a login code through the chat or email

When a login the agent submitted reaches a one-time code step, the agent SHALL get the code from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent, and SHALL enter the code itself. An emailed sign-in link SHALL be handled the same way. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT log in to email to fetch a code. A backup or recovery code SHALL go through the private form, never the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link.

#### Scenario: A code sent by text

- **WHEN** the agent logs in with a saved password and the site texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is logged out of that email
- **THEN** the agent asks for the code in the chat and does not try to log in to the email
