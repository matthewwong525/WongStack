# Spec Delta

## MODIFIED Requirements

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle) SHALL follow the live view requirement. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every step but such a check, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

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

When a site refuses the personal browser, or shows a check that the person's own try in a live view does not clear, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. A check that asks whether a person is present SHALL first get one live view, on a machine that can show one. The agent SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page after the person's try in a live view
- **THEN** the agent sends no second link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and offers a live view for the person to do it themselves

## ADDED Requirements

### Requirement: The person passes a robot check in a live view

When a site shows a check that asks whether a person is present, the agent SHALL ask the person whether they are ready and, on a yes, SHALL send a private link that shows its browser on that page and takes the person's taps and typing. The agent SHALL NOT tick, solve, or otherwise answer the check. While the link is open the agent SHALL act on its browser in no way the person would see and SHALL take no picture. When the site lets the person through, the link SHALL close and the requesting chat SHALL be notified as for any completed private input. Each site SHALL get one live view per task. On a machine that cannot show its browser, the agent SHALL give the person steps for their own device instead.

#### Scenario: A check after a sign-in

- **WHEN** a site accepts a saved password and then shows an "I'm not a robot" check
- **THEN** the agent asks whether the person is ready, sends a live view, and once the person passes the check the link closes, the chat is notified, and the agent carries on signed in

#### Scenario: A machine with no screen to show

- **WHEN** a site shows such a check and the personal browser runs where it has no screen to show
- **THEN** the agent sends no link and gives the person steps for their own device

### Requirement: A live view shows the whole page and closes itself

A live view SHALL show the page fitted to the person's screen, on a phone as on a laptop, with the check and its buttons in view, and SHALL put the page back as it was when it closes. It SHALL let the person type and paste into the page from a phone. It SHALL open at a new address through Cloudflare's tunnel with a secret only the link carries, SHALL show and accept nothing without that secret, and SHALL stop working when the site lets the person through, when the person closes it, or at its time limit, eight hours unless a shorter one is asked, even if the agent's session has ended. A closed link SHALL never work again.

#### Scenario: A puzzle on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the whole puzzle shows, its button included, and no part of it is cut off

#### Scenario: Nobody finishes

- **WHEN** eight hours pass on a live view without the site letting the person through
- **THEN** the link stops working, the page is put back as it was, and the agent tells the person it timed out and offers a new one

### Requirement: A page stays open while a private link is using it

While a private form or a live view is open, the page it works on SHALL stay open for as long as the link does, however long the person leaves it untouched. Keeping it open SHALL type nothing, press nothing, and go to no other address, and SHALL read nothing the person typed.

#### Scenario: A slow card

- **WHEN** the person sends a private form seven minutes after it opened
- **THEN** the details reach the site's fields on the page the form was made for

#### Scenario: A puzzle left for an hour

- **WHEN** the person comes back to a live view after an hour
- **THEN** it shows the same page, not a blank screen or a page opened afresh
