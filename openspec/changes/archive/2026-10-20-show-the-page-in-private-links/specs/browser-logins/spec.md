## MODIFIED Requirements

### Requirement: The person saves logins through a private password link
When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with every private link's safety: a new address and secret key each time, ending private input on successful completion, explicit closure, or after eight hours by default. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list. The add-a-login boxes SHALL come before the place to drop or pick an export, on every password link. Its primary completion action SHALL save the selected pending logins, including a valid filled login not yet added to the list, and return to the requesting task in one tap. Failed saves SHALL stay open for correction and SHALL NOT announce readiness. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps its save-and-continue action
- **THEN** that login is saved and the requesting chat is notified, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps its save-and-continue action once
- **THEN** both logins are saved, and the agent names both sites in the chat

#### Scenario: A password link sent for no one site

- **WHEN** the person asks to save their passwords and opens the link
- **THEN** the add-a-login boxes come first and the place to drop an export comes after them

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. When the agent's browser shows a page on that site as the link opens, the page SHALL open with one picture of that page, taken before the link opens, which the person can view full screen and zoom; a page on another site SHALL give no picture. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

#### Scenario: A first login to a site

- **WHEN** a task meets Netflix's login page and no saved login matches
- **THEN** the person gets the password link with netflix.com already in the website box and a picture of Netflix's login page above it, fills only the username and password, and the agent logs in with them

#### Scenario: A site with only a Sign in with Google button

- **WHEN** the login page offers no password form and no saved Google login matches
- **THEN** the agent opens Google's sign-in and sends the password link with Google's website filled in

#### Scenario: The browser is on another site

- **WHEN** the agent sends a password link for netflix.com while its browser shows a page on another site
- **THEN** the page opens with no picture

### Requirement: The person gives sensitive details through a private form

For a sensitive value, the agent SHALL ask in the chat whether the person is ready, then send a private link to a form holding one box for each value it named, labelled as on the site, with a dropdown offering the site's own choices, a line saying what sending will do, and one button carrying the site's own action label. Each box SHALL carry the kind of value it holds, so a password manager or a phone's autofill can fill the form. Above the boxes, the form SHALL show one picture of the whole site page, taken as the link opens, before anything private is typed; the person SHALL be able to view it full screen, zoom, and move around it. The form SHALL show no other view of the site. The form SHALL offer *Save for next time*, unticked at the start. The person's tap on that button SHALL enter the values in the site's fields and press the site's action once. When the site does not move on, the form SHALL say so, SHALL NOT send again by itself, and the agent SHALL tell the person what the site said and offer a new form.

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

What the person types in a private form SHALL reach the site's fields without appearing in any command, file, log, message, or picture the agent can read, and SHALL NOT be read back. It SHALL be stored only when the person ticked *Save for next time* and the site accepted it, and then only as the saved details requirement says. A dropdown pick SHALL be one of the choices the agent named. While a private form is open, the agent SHALL send its browser no commands. The agent SHALL NOT read or picture the page between the form's send and the site's answer; when the site keeps the page, the boxes the form filled SHALL be emptied, and its dropdowns put back to the site's own choice, before the agent looks. The agent SHALL learn only the outcome, and for saved details, the name they were saved under.

#### Scenario: A card typed into the form

- **WHEN** the person types a card number into the private form
- **THEN** the number reaches the site's card field, and appears in no command, file, log, or message the agent can read

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person gives it through a private form, and the stored chat never holds it

#### Scenario: A card the site refused

- **WHEN** the person ticks *Save for next time* and the site rejects the card
- **THEN** nothing is saved
