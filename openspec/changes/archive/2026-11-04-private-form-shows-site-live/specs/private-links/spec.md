## ADDED Requirements

### Requirement: A form shows the site live from the press
When the person presses a private form's button and a live view can open on the computer, the same link SHALL show the site's page live at once, with a line saying what is happening and for how long, for the person to watch and tap through. The page SHALL keep its own size while the site works. The link SHALL end as done once the site meets its finish, and SHALL tell the person, and the chat, when the site has not finished within a minute. The agent SHALL send its browser nothing and take no picture while the link is open. Where no live view can open, the form SHALL show the same line with a time counter and keep its watch of the site.

#### Scenario: A site that saves the card in place
- **WHEN** the person presses Pay and the site stays on the same page for a minute
- **THEN** the form's page has shown the site live since the press, its line says not to pay again unless the site shows an error, and the chat is told the same

#### Scenario: No live view possible
- **WHEN** the site has not answered and another chat holds the computer's live view
- **THEN** the form shows a time counter and keeps watching the site as before

### Requirement: The finish ignores hidden parts and may name words
A finish that waits for a part of the page to go SHALL count only parts the person can see. A finish MAY name words that show on the page once the site accepts, and is met only when they show.

#### Scenario: A hidden card frame after the card is saved
- **WHEN** the site hides its card frame and shows the saved card's summary
- **THEN** a finish that waits for the card frame to go is met

#### Scenario: Words that never show
- **WHEN** the finish names *Review your order* and the page never shows it
- **THEN** the finish is not met

### Requirement: A changed page stops the form before typing
When a box the form fills is gone as the person opens the form or presses its button, the form SHALL type and press nothing, SHALL tell the person the site's page changed and nothing was sent, and the agent SHALL be told the same reason. The agent SHALL then make the page ready again and send a new form without asking again.

#### Scenario: The site's page reset
- **WHEN** the card frame is gone by the time the person presses Pay
- **THEN** nothing is typed or pressed, the form says the page changed and nothing was sent, and the chat gets a new form

### Requirement: A form leaves a pressed card alone
After a form's button has been pressed, the form SHALL NOT empty or change any box it typed into, because the site may have taken the card and check it again on its next step. It SHALL put boxes back only when nothing was pressed.

#### Scenario: The site saved the card and keeps its frame
- **WHEN** the person pressed Pay and the site has not met the finish when the link ends
- **THEN** the card boxes keep what was typed, and the agent takes no picture while they hold it

#### Scenario: A fill failed
- **WHEN** a box could not be filled
- **THEN** nothing is pressed and every box the form typed into is emptied

### Requirement: A live view can stay open until the person closes it
A live view opened to stay open SHALL take no finish, and SHALL end only when the person says they are finished on its page, when the chat closes it, or at its time limit. It SHALL stay open through every page change on the site.

#### Scenario: Several steps in one view
- **WHEN** the person taps through two checkout steps in a view that stays open
- **THEN** the view stays open until the person taps *I'm finished*

### Requirement: A click that may not count is reported
When a click reaches the page only through the page's own script, not as a pointer press, the browser tool SHALL say so, so the agent can offer a live view instead of clicking again.

#### Scenario: A script-only click
- **WHEN** the pointer click and the forced click both fail and the script click runs
- **THEN** the click's output says it went through the page's script

### Requirement: The agent checks an unclear payment without seeing the card
After a payment that ended without a clear answer, the agent SHALL read the site's page only as text in which every card box is hidden, and SHALL take no picture while a card box still holds a typed value. It SHALL tell the person whether the site accepted, declined, or can't be told, and SHALL never send a new form while the payment may have gone through. It MAY press a site step that pays nothing; a press that pays SHALL wait for the person's yes that names the purchase.

#### Scenario: The site saved the card and stayed
- **WHEN** a form ended unclear and the page shows the saved card's last digits and a Continue step
- **THEN** the agent says the site saved the card, may press Continue, and asks before placing the order

#### Scenario: No answer on the page
- **WHEN** the page shows neither a receipt nor an error
- **THEN** the agent says the payment is not confirmed, looks for the store's receipt in email when the chat has an email tool, and tells the person not to pay again until it is known

### Requirement: A password link can sign in and turn into a live view
A password link opened for a site that waits on its login, with a finish named, SHALL sign in with the saved login once the person saves it, and, when a live view can open, SHALL show the site live in the same link from the save, for the person to finish signing in. The agent SHALL never see the password.

#### Scenario: A code after the password
- **WHEN** the person saves a password and the site then asks for a code
- **THEN** the same link shows the site live, and it ends as done once the person is signed in

#### Scenario: No finish named
- **WHEN** a password link is opened with no finish
- **THEN** it only saves the login, as before

### Requirement: PayPal through a live view
When a site offers PayPal, the agent's pay question SHALL offer it beside the card. On a yes that names the purchase, the person SHALL sign in to PayPal and approve in a live view; the agent SHALL type no PayPal password and press no PayPal approval itself.

#### Scenario: A site that takes PayPal
- **WHEN** a checkout offers PayPal and a card
- **THEN** the pay question names both, and picking PayPal sends a live view on the PayPal step
