## MODIFIED Requirements

### Requirement: The person gives sensitive details through a private form

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. Above the boxes, the form SHALL show one picture of the whole site page, taken as the link opens, before anything private is typed; the person SHALL be able to view it full screen, zoom, and move around it. The form SHALL show no other view of the site, and SHALL offer no way to keep its details for next time. Every card payment SHALL go through a private form. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once. When the site does not move on, the form SHALL say so, SHALL NOT send again by itself, and the agent SHALL tell the person what the site said and offer a new form.

#### Scenario: A card from a phone

- **WHEN** the person fills the card number, picks 03 and 2028 for the expiry, types the security code, and taps the form's *Pay $45.00* button on a phone
- **THEN** the site's card fields receive those values, the site's pay action is pressed once, and the chat carries on with a picture of the receipt

#### Scenario: The site rejects the card

- **WHEN** the site keeps the card page and shows an error after the form sends
- **THEN** the form says the details were not accepted, nothing is sent a second time, and the agent tells the person what the site said and offers a new form

#### Scenario: Checking the page before paying

- **WHEN** the person opens a card form on a phone and taps the picture above the boxes
- **THEN** the site's whole page fills the screen with the email the agent typed and the card boxes still empty, and the person can zoom in, move around, and close it to return to the form

### Requirement: The agent never sees what a private form carries

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back or stored. A dropdown pick SHALL be one of the choices the agent named. While a private form is open, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer; when the site keeps the page, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks. The agent SHALL learn only the outcome.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form and the site accepts it
- **THEN** the number reaches the site's card field, appears in no command, file, log, or message the agent can read, and the next payment sends a new private form

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

#### Scenario: A card the site refused

- **WHEN** the site rejects the card the form sent
- **THEN** the card boxes are emptied before the agent looks, and nothing from the form is stored
