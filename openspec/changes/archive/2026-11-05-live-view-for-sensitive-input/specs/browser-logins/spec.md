## ADDED Requirements

### Requirement: Sensitive input is typed only on the real site in a live view

A payment card, a backup or recovery code, a password, and any other lasting secret a page asks for SHALL be typed by the person on the site's own page, in a live view of the agent's browser, never in the chat and never in a page of the agent's own. The agent SHALL first fill the page's ordinary answers and ask in the chat whether the person is ready, naming what the step is for. The live view SHALL show one short line saying what to do now. The agent SHALL NOT read, picture, or act on its browser from the moment the view opens until the person's turn ends. The turn SHALL end when the site meets the finish the agent named, when the person taps *Hand back*, when the chat closes it, or at its time limit. The agent SHALL learn only how the turn ended, then read the page afresh.

#### Scenario: A sign-in

- **WHEN** a task meets Netflix's login page and the browser is not signed in
- **THEN** the agent asks whether the person is ready, sends a live view whose line says to sign in and tap *Hand back*, the person signs in there, and the agent carries on signed in, never having seen the password

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person types it on the site in a live view, and the stored chat never holds it

### Requirement: The person presses a payment's button

For a card payment, the person SHALL type the card and press the site's own pay button in the live view; the agent SHALL NOT press a button that pays with the person's card. The pay question in the chat, naming the purchase and its total, SHALL come before the view opens. After the turn, the agent SHALL read the page only as text in which every card box is hidden, SHALL take no picture while a card box holds a typed value, and SHALL tell the person whether the site accepted, declined, or can't be told. It SHALL NOT open another payment turn while the payment may have gone through.

#### Scenario: A card from a phone

- **WHEN** the person types a card in the live view, presses the site's *Pay $45.00*, and the site shows its receipt
- **THEN** the view ends by itself, and the chat carries on with a picture of the receipt

#### Scenario: Handed back with no receipt

- **WHEN** the person taps *Hand back* while the site still shows its card page
- **THEN** the agent reads the page as text with the card boxes hidden, takes no picture, and says the payment is not confirmed rather than asking the person to pay again

### Requirement: On a computer with its own screen, the turn happens in the browser's window

On a Mac or Windows computer, the agent's browser SHALL open in a window on the screen by default, and the person's turn SHALL happen in that window: the chat SHALL say what to do and to say *done*, and the turn SHALL end on the finish or on *done*. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. With the window off, a step that needs the person SHALL end with steps to finish in their own browser.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** no link is sent, the chat asks the person to sign in in the browser window and say *done*, and the agent carries on once the page shows them signed in

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

### Requirement: An update stops using saved passwords and offers to delete them

An update that removes saved logins SHALL leave the saved-passwords file unread and untouched by code, and SHALL ask the person once whether to delete it, deleting it only on a yes. The browser's own sign-ins SHALL be kept.

#### Scenario: Updating an install with saved logins

- **WHEN** an install with saved logins takes the update
- **THEN** the person is asked once whether to delete the saved-passwords file, the file stays unless they say yes, and sites already signed in in the browser stay signed in

### Requirement: Every live view shows one line and Hand back

Every live view SHALL show, in one bar under the site, one short line saying what the person should do now, the type box, and one *Hand back* button. *Hand back* SHALL end the turn and return the browser to the agent. When the step is not finished after *Hand back*, the agent SHALL ask in the chat before it takes a further step on that page. A paste anywhere on the view SHALL type into the box the person tapped.

#### Scenario: A stuck step

- **WHEN** the person taps through DigiKey's stuck *Continue* in a live view and taps *Hand back*
- **THEN** the link ends, the chat is told, and the agent reads the page afresh

#### Scenario: Give up on a payment

- **WHEN** the person taps *Hand back* in a payment's live view without pressing Pay, and says in the chat to stop
- **THEN** the link ends, the agent presses nothing on that page, and the chat says the payment was not finished

### Requirement: A private link records what ended it without values

Each private link SHALL record what ended it and how long it was open, on the agent's computer and outside the repo. The record SHALL hold no typed value, and SHALL stay small by keeping only recent entries.

#### Scenario: A link that closed by itself

- **WHEN** a link closes before anyone opens it
- **THEN** the record names what closed it: a close command, a signal, the person's own close, or the time limit

### Requirement: A step that needs the person goes to the chat or the live view

When a browsing step needs something only the person can give, an ordinary answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value, a sign-in, a check that asks whether a person is present, a site step the agent's click can not get through, and a PayPal approval SHALL go through a live view. A one-time code SHALL follow the login-code requirement, and an API key or token step the own-browser requirement. A step only the person's own device can do (a passkey or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a live view for the card only

#### Scenario: A passkey

- **WHEN** a site asks for a passkey
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: Every private link opens through Cloudflare and closes itself

A key link and a live view SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A key link SHALL default to a 24-hour time limit from opening, a live view to eight hours, and each SHALL honor an explicit time override. A link SHALL stop working on its finish, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person needs to sign in to a site while at the computer the agent runs on
- **THEN** the live view's link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a key link without a save or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: The agent pictures its browsing in the chat, never a typed card

During a browsing task, the agent SHALL show the person a picture of the page in the chat at each key moment: a new page, right before an action that sends, books, or pays for something, and the result. It SHALL NOT show a picture after every action, nor repeat a page that has not changed. It SHALL keep the pictures out of the repo, take none while a live view is open, and take none while a card box holds a typed value.

#### Scenario: A booking

- **WHEN** the agent opens a booking page, fills it, and books
- **THEN** the chat shows the page, the filled form before booking, and the confirmation, each with a line saying what it shows

#### Scenario: A card left on the page

- **WHEN** the person hands back a payment's live view with the card still in the site's boxes
- **THEN** no picture appears until the card boxes are gone or empty

### Requirement: A page reading hides every filled secret box

Every way the agent reads a page's text SHALL show a filled secret box only as filled, never its contents. A box SHALL count as secret when it is a password box, or when its label or kind names a password, passcode, PIN, card number, card expiry, security code, or one-time code, in the page or in any frame, even after the site switches it to plain text. An empty secret box, a dropdown's picked choice, and every other box SHALL read as before.

#### Scenario: A card box the person filled

- **WHEN** the agent reads a checkout page whose card number box still holds the number the person typed in a live view
- **THEN** that box reads as filled and hidden, by the page reading and by asking for that one box's contents

#### Scenario: A frame shows the typed password as text

- **WHEN** the person typed a password into a frame from another site, and the site then shows the box's value as text
- **THEN** the page text shows `[hidden]` for that box

## MODIFIED Requirements

### Requirement: The person does each login once

The person SHALL sign in to a site once, in a live view or the browser's window, and the agent SHALL then reuse the browser's session. The agent SHALL NOT ask for a password in the chat, and SHALL NOT read, show, type, or store a password.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person signed in to
- **THEN** no sign-in step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers a live view to sign in instead

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. A payment with the person's card SHALL be pressed by the person in a live view, after the chat's pay question.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

### Requirement: The agent gets a login code through the chat or email

When a sign-in reaches a one-time code step after the person's turn, the agent SHALL get the code from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent, and SHALL enter the code itself. An emailed sign-in link SHALL be handled the same way. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT sign in to email to fetch a code. A backup or recovery code SHALL be typed by the person in a live view, never the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link.

#### Scenario: A code sent by text

- **WHEN** the person handed back after signing in and the site then texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is signed out of that email
- **THEN** the agent asks for the code in the chat and does not try to sign in to the email

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own pages in the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's pages. Preview checks SHALL NOT use the personal browser or its sign-ins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own pages, and neither reports the browser busy

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins

### Requirement: A live view shows the whole page and closes itself

A live view SHALL show the page fitted to the person's screen, on a phone as on a laptop, with the step and its buttons in view, and SHALL put the page back as it was when it closes. It SHALL let the person type and paste into the page from a phone. It SHALL open at a new address through Cloudflare's tunnel with a secret only the link carries, SHALL show and accept nothing without that secret, and SHALL stop working when the site meets its finish, when the person taps *Hand back*, when the chat closes it, or at its time limit, eight hours unless a shorter one is asked, even if the agent's session has ended. A closed link SHALL never work again.

#### Scenario: A puzzle on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the whole puzzle shows, its button included, and no part of it is cut off

#### Scenario: Nobody finishes

- **WHEN** eight hours pass on a live view without a finish or *Hand back*
- **THEN** the link stops working, the page is put back as it was, and the agent tells the person it timed out and offers a new one

### Requirement: A page stays open while a private link is using it

While a live view is open, the page it shows SHALL stay open for as long as the link does, however long the person leaves it untouched. Keeping it open SHALL type nothing, press nothing, and go to no other address, and SHALL read nothing the person typed.

#### Scenario: A slow card

- **WHEN** the person presses Pay in a live view seven minutes after it opened
- **THEN** the site's page is the one the agent filled, with the person's card in its boxes

#### Scenario: A puzzle left for an hour

- **WHEN** the person comes back to a live view after an hour
- **THEN** it shows the same page, not a blank screen or a page opened afresh

### Requirement: Every private input page starts calm

A key link SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. It SHALL offer *Not now*, which closes the link. It SHALL show when it closes as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in its last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a key link has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock

## REMOVED Requirements

### Requirement: The person saves logins through a private password link

**Reason**: The password link is removed; the person signs in on the real site in a live view.
**Migration**: Sign in once in a live view; the browser keeps the session.

### Requirement: The agent logs in with a saved login

**Reason**: Saved logins are no longer typed.
**Migration**: A logged-out site gets a live view for the person to sign in.

### Requirement: A login with no saved password gets a pre-filled password link

**Reason**: The password link is removed.
**Migration**: A sign-in goes through a live view.

### Requirement: A step that needs the person goes to the chat or a private form

**Reason**: The private form is removed; replaced by *A step that needs the person goes to the chat or the live view*.
**Migration**: A sensitive value goes through a live view.

### Requirement: An update leaves earlier saved logins untouched

**Reason**: Saved logins are no longer used; replaced by *An update stops using saved passwords and offers to delete them*.
**Migration**: None.

### Requirement: A live view gets the person past a robot check or a stuck login

**Reason**: Every sign-in and every sensitive value now uses the live view; replaced by *Sensitive input is typed only on the real site in a live view* and *Every live view shows one line and Hand back*.
**Migration**: None.

### Requirement: A payment the site has not confirmed is never called refused

**Reason**: The form's watch after its press is removed; the person presses Pay and sees the site.
**Migration**: *The person presses a payment's button* keeps the no-second-payment rule.

### Requirement: A private form keeps a timing record without values

**Reason**: The private form is removed; replaced by *A private link records what ended it without values*.
**Migration**: None.

### Requirement: A saved login is typed only on its saved site

**Reason**: Saved logins are no longer typed.
**Migration**: None.

### Requirement: A login reports a next step apart from a wrong password

**Reason**: The saved-login command is removed.
**Migration**: None.

### Requirement: A login may try a sibling subdomain once on request

**Reason**: Saved logins are no longer typed.
**Migration**: None.

### Requirement: A private form takes sensitive details and shows the site from the press

**Reason**: The private form is removed.
**Migration**: A card or a backup code is typed on the site in a live view.

### Requirement: Nothing a private form carries reaches the agent

**Reason**: The private form is removed; *Sensitive input is typed only on the real site in a live view* keeps the agent from seeing it.
**Migration**: None.

### Requirement: Every private link goes through Cloudflare and closes itself

**Reason**: A scenario named a removed form or saved login; replaced by *Every private link opens through Cloudflare and closes itself*.
**Migration**: None.

### Requirement: The agent pictures its browsing in the chat

**Reason**: A scenario named a removed form or saved login; replaced by *The agent pictures its browsing in the chat, never a typed card*.
**Migration**: None.

### Requirement: A page reading never shows what a secret box holds

**Reason**: A scenario named a removed form or saved login; replaced by *A page reading hides every filled secret box*.
**Migration**: None.
