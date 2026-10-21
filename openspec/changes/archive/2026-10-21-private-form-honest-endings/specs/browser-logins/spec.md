# Spec Delta

## MODIFIED Requirements

### Requirement: The person gives sensitive details through a private form

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. Above the boxes, the form SHALL show one picture of the whole site page, taken as the link opens, before anything private is typed; the person SHALL be able to view it full screen, zoom, and move around it. The form SHALL show no other view of the site, and SHALL offer no way to keep its details for next time. Every card payment SHALL go through a private form. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once, and while it does, the form SHALL show which step it is on. The form SHALL end as sent, not accepted, or still checking, and SHALL NOT send again by itself. When the site kept its page, the agent SHALL tell the person what the site said and offer a new form.

#### Scenario: A card from a phone

- **WHEN** the person fills the card number, picks 03 and 2028 for the expiry, types the security code, and taps the form's *Pay $45.00* button on a phone
- **THEN** the site's card fields receive those values, the site's pay action is pressed once, and the chat carries on with a picture of the receipt

#### Scenario: The site rejects the card

- **WHEN** the site keeps the card page with its card boxes for the whole watch after the form sends
- **THEN** the form says the details were not accepted without saying nothing was charged, nothing is sent a second time, and the agent tells the person what the site said and offers a new form

#### Scenario: Checking the page before paying

- **WHEN** the person opens a card form on a phone and taps the picture above the boxes
- **THEN** the site's whole page fills the screen with the email the agent typed and the card boxes still empty, and the person can zoom in, move around, and close it to return to the form

### Requirement: The agent never sees what a private form carries

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back or stored. A dropdown pick SHALL be one of the choices the agent named. While a private form is open or still watching the site, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer; when the site keeps the page, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks. The form SHALL empty nothing on a page that changed or could not be read, nor while the site may still be taking the payment. The agent SHALL learn only the outcome.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form and the site accepts it
- **THEN** the number reaches the site's card field, appears in no command, file, log, or message the agent can read, and the next payment sends a new private form

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

#### Scenario: A card the site refused

- **WHEN** the site rejects the card the form sent
- **THEN** the card boxes are emptied before the agent looks, and nothing from the form is stored

## ADDED Requirements

### Requirement: A payment the site has not confirmed is never called refused

When a private form's send has pressed the site's action and the site has not reached its finish within one minute, the form SHALL tell the phone and the chat that it is still checking and that the person should not pay again. It SHALL keep watching the site for ten minutes without touching the page, and SHALL report in the chat as sent once the site reaches its finish. A page the browser cannot read SHALL count as unknown, never as the site refusing.

#### Scenario: A slow card network

- **WHEN** the site reaches its confirmation page two minutes after the press
- **THEN** the phone said still checking, the chat first said not to pay again, then said the payment went through, and the card boxes were never emptied

#### Scenario: A page that moved without reaching the finish

- **WHEN** after the press the site goes to another address that is not the named finish, or the browser can no longer read the page, and ten minutes pass
- **THEN** nothing is emptied or sent again, and the agent says the payment is not confirmed and asks the person to check their email or bank before paying again

### Requirement: A private form keeps a timing record without values

Each private form send SHALL record how long each step took (each box, the press, and the wait for the site) and each private link SHALL record what ended it, on the agent's computer and outside the repo. The record SHALL hold no typed value, and it SHALL stay small by keeping only recent entries.

#### Scenario: A slow send

- **WHEN** a card send takes forty seconds
- **THEN** the record shows which step took the time, and holds no digit of the card

#### Scenario: A link that closed by itself

- **WHEN** a link closes before anyone opens it
- **THEN** the record names what closed it: a close command, a signal, the person's own close, or the time limit
