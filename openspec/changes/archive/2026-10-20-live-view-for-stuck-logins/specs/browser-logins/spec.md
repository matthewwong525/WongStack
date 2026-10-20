## ADDED Requirements

### Requirement: A task no API can do goes to the browser

When no company action or saved key can do a task on a website, the agent SHALL do it in the personal browser as the person, without being asked, and SHALL NOT give the person steps for it before trying. API key and token websites SHALL keep the own-browser requirement.

#### Scenario: An app's settings with no API

- **WHEN** a task needs a setting in a store app that no saved key or action can change
- **THEN** the agent opens the store's admin in the personal browser and makes the change there, asking only for what needs the person

### Requirement: A live view gets the person past a robot check or a stuck login

When a site shows a check that asks whether a person is present, or a login stays stuck after the agent's own routes (the page stays on or returns to the login with no error message, no visible check, and no code or approval step), the agent SHALL ask the person whether they are ready and, on a yes, SHALL send a private link that shows its browser on that page and takes the person's taps and typing. A login rejected with a message SHALL instead follow the saved-login requirement. The agent SHALL NOT tick, solve, or otherwise answer a check. While the link is open the agent SHALL act on its browser in no way the person would see and SHALL take no picture, and the link SHALL save nothing the person types. When the site lets the person through, the link SHALL close and the requesting chat SHALL be notified as for any completed private input. Each site SHALL get one live view per task, for a check and a stuck login together. On a machine that cannot show its browser, the agent SHALL give the person steps for their own device instead.

#### Scenario: A login that keeps reloading

- **WHEN** a site takes the saved email, then reloads its login page with no message or check
- **THEN** the agent asks whether the person is ready, sends a live view, the person signs in there, and once the login page is gone the link closes and the agent carries on signed in

#### Scenario: A check after a sign-in

- **WHEN** a site accepts a saved password and then shows an "I'm not a robot" check
- **THEN** the agent asks whether the person is ready, sends a live view, and once the person passes the check the link closes, the chat is notified, and the agent carries on signed in

#### Scenario: A machine with no screen to show

- **WHEN** a site shows such a check or a stuck login and the personal browser runs where it has no screen to show
- **THEN** the agent sends no link and gives the person steps for their own device

### Requirement: Steps for the person carry only the steps

When the agent gives the person steps to finish a task on their own device, the reply SHALL hold one line on what stopped it, the numbered steps, and a last step saying what to tell the agent and what it does next. It SHALL NOT add an explanation of how things work behind the steps, or offer other routes.

#### Scenario: A site that refused the browser

- **WHEN** a site still refuses after the person's try in a live view
- **THEN** the reply is one line on the refusal, numbered steps with their links, and what to say when done, with nothing else

## MODIFIED Requirements

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. When the site asks for the email or username on a page of its own before any password, the agent SHALL send that link at the first page, asking for the username and the password together, with the password optional; a login saved with no password SHALL type only the username, and a later password page SHALL get the password link with the username filled in. When the agent's browser shows a page on that site as the link opens, the page SHALL open with one picture of that page, taken before the link opens, which the person can view full screen and zoom; a page on another site SHALL give no picture. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box and a picture of Netflix's login page above it, fills only the username and password, and the agent logs in with them

#### Scenario: A login that asks for the email first

- **WHEN** a site's first login page shows only an email box and no saved login matches
- **THEN** the agent asks nothing in the chat and sends one password link where the password is optional, then types the email, and the password too when one was given

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form and no saved Google login matches
- **THEN** the agent opens Google's sign-in and sends the password link with Google's website filled in

#### Scenario: The browser is on another site

- **WHEN** the agent sends a password link for netflix.com while its browser shows a page on another site
- **THEN** the page opens with no picture

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present or a stuck login. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes; an email a login asks for SHALL follow the password link requirements instead. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle), and a stuck login, SHALL follow the live view requirement. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every step but such a check or a stuck login, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent solves nothing, asks whether the person is ready, and sends a live view for the person to do the puzzle

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: A site that refuses the browser ends with steps for the person

When a site refuses the personal browser, or shows a check or a stuck login that the person's own try in a live view does not clear, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. A check that asks whether a person is present, and a stuck login, SHALL first get one live view, on a machine that can show one. The agent SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page after the person's try in a live view
- **THEN** the agent sends no second link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and offers a live view for the person to do it themselves

## REMOVED Requirements

### Requirement: The person passes a robot check in a live view

**Reason**: A stuck login now opens the same live view, so the requirement is renamed to cover both.

**Migration**: See "A live view gets the person past a robot check or a stuck login", which keeps every rule and scenario here.
