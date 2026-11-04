## MODIFIED Requirements

### Requirement: A step that needs the person goes to the chat or a private form

When a browsing step needs something only the person can give, the agent SHALL get it without showing or handing over its browser, except for a check that asks whether a person is present, a stuck login, a site step the agent's click can not get through, a private form's press, a password link's sign-in, and a PayPal approval. An ordinary form answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes; an email a login asks for SHALL follow the password link requirements instead. A sensitive value (payment card details, a backup or recovery code, or another lasting secret the page asks for) SHALL go through the private form. A password SHALL follow the password link requirements, a one-time code the login-code requirement, and an API key or token step the own-browser requirement. A check that asks whether a person is present (a tick box or a picture puzzle), and a stuck login, SHALL follow the live view requirement. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address. For every other step, the agent SHALL NOT offer a live view of its browser or remote control of it, including when the person asks to take over.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a private form for the card details only

#### Scenario: A picture puzzle

- **WHEN** a site shows a picture puzzle
- **THEN** the agent solves nothing, asks whether the person is ready, and sends a live view for the person to do the puzzle

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: A payment the site has not confirmed is never called refused

When a private form's send has pressed the site's action and the site has not reached its finish within one minute, the form SHALL tell the phone and the chat that the site has not finished and that the person should not pay again. It SHALL keep watching the site without touching the page, up to 30 minutes while it shows the site live and ten minutes when it can not, and SHALL report in the chat as sent once the site reaches its finish. A page the browser cannot read SHALL count as unknown, never as the site refusing.

#### Scenario: A slow card network

- **WHEN** the site reaches its confirmation page two minutes after the press
- **THEN** the phone said the site had not finished, the chat first said not to pay again, then said the payment went through, and the card boxes were never emptied

#### Scenario: A page that moved without reaching the finish

- **WHEN** after the press the site goes to another address that is not the named finish, or the browser can no longer read the page, and the watch ends
- **THEN** nothing is emptied or sent again, and the agent says the payment is not confirmed and asks the person to check their email or bank before paying again

### Requirement: A live view gets the person past a robot check or a stuck login

When a site shows a check that asks whether a person is present, or a login stays stuck after the agent's own routes (the page stays on or returns to the login with no error message, no visible check, and no code or approval step), the agent SHALL ask the person whether they are ready and, on a yes, SHALL send a private link that shows its browser on that page and takes the person's taps and typing. A login rejected with a message SHALL instead follow the saved-login requirement. The agent SHALL NOT tick, solve, or otherwise answer a check. While the link is open the agent SHALL act on its browser in no way the person would see and SHALL take no picture, and the link SHALL save nothing the person types. When the site lets the person through, the link SHALL close and the requesting chat SHALL be notified as for any completed private input. Each site SHALL get one live view per task, for a check and a stuck login together; the site shown live by a private form or a password link SHALL NOT count as that view. On a machine that cannot show its browser, the agent SHALL give the person steps for their own device instead.

#### Scenario: A login that keeps reloading

- **WHEN** a site takes the saved email, then reloads its login page with no message or check
- **THEN** the agent asks whether the person is ready, sends a live view, the person signs in there, and once the login page is gone the link closes and the agent carries on signed in

#### Scenario: A check after a sign-in

- **WHEN** a site accepts a saved password and then shows an "I'm not a robot" check
- **THEN** the agent asks whether the person is ready, sends a live view, and once the person passes the check the link closes, the chat is notified, and the agent carries on signed in

#### Scenario: A machine with no screen to show

- **WHEN** a site shows such a check or a stuck login and the personal browser runs where it has no screen to show
- **THEN** the agent sends no link and gives the person steps for their own device

## REMOVED Requirements

### Requirement: The person gives sensitive details through a private form

**Reason**: Its scenario *The site rejects the card* ends a pressed send as not accepted and offers a new form; now a pressed send is never not accepted, and no new form goes while the payment may have gone through. The new requirement "A private form takes sensitive details and shows the site from the press" holds the promise.

**Migration**: None for the person.

### Requirement: The agent never sees what a private form carries

**Reason**: It empties the boxes before the agent looks after the site refuses; now a pressed form never empties a box, because the site may have taken the card. The new requirement "Nothing a private form carries reaches the agent" holds the promise.

**Migration**: None for the person.

## ADDED Requirements

### Requirement: A private form takes sensitive details and shows the site from the press

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. Above the boxes, the form SHALL show one picture of the whole site page, taken as the link opens, before anything private is typed; the person SHALL be able to view it full screen, zoom, and move around it. Until its button is pressed, the form SHALL show no other view of the site; from the press, it SHALL show the site live where a live view can open. It SHALL offer no way to keep its details for next time. Every card payment SHALL go through a private form. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once. The form SHALL end as sent or not confirmed once its button is pressed, and SHALL end as not accepted only when it pressed nothing. It SHALL NOT send again by itself, and the agent SHALL send no new form while the payment may have gone through.

#### Scenario: A card from a phone

- **WHEN** the person fills the card number, picks 03 and 2028 for the expiry, types the security code, and taps the form's *Pay $45.00* button on a phone
- **THEN** the site's card fields receive those values, the site's pay action is pressed once, and the chat carries on with a picture of the receipt

#### Scenario: No answer after the press

- **WHEN** the site keeps the card page with its card boxes for the whole watch after the form sends
- **THEN** the form never says the details were not accepted, nothing is sent a second time, and the agent checks the page before it offers any new form

#### Scenario: Checking the page before paying

- **WHEN** the person opens a card form on a phone and taps the picture above the boxes
- **THEN** the site's whole page fills the screen with the email the agent typed and the card boxes still empty, and the person can zoom in, move around, and close it to return to the form

### Requirement: Nothing a private form carries reaches the agent

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back or stored. A dropdown pick SHALL be one of the choices the agent named. While a private form is open or still watching the site, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer. After the press, the form SHALL empty no box, and the agent SHALL read the page only as text in which every card box is hidden, and take no picture while a box holds a typed value. When nothing was pressed, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks; the form SHALL empty nothing on a page that changed or could not be read. Beyond that text, the agent SHALL learn only the outcome.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form and the site accepts it
- **THEN** the number reaches the site's card field, appears in no command, file, log, or message the agent can read, and the next payment sends a new private form

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

#### Scenario: A card the site kept

- **WHEN** the site keeps the card page after the press
- **THEN** the card boxes keep what was typed, the agent reads the page only as text with every card box hidden, and nothing from the form is stored
