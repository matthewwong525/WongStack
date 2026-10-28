# browser-logins Specification

## Purpose

Let the agent use the person's own web accounts in a personal browser, with each login done once and reused, kept out of preview checks.

## Requirements

### Requirement: The person does each login once

The agent SHALL log in with a login the person saved, then reuse the session. It SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or write a password. Saved passwords SHALL live in one file in the person's home folder, outside any repo and readable only by their user, which only the password link writes and only the program that types a login reads. The agent SHALL learn only the names of saved logins and whether a login was accepted.

#### Scenario: A later visit

- **WHEN** a later task opens a site the person logged in to
- **THEN** no login step is needed

#### Scenario: A password offered in the chat

- **WHEN** the person starts typing a password into the chat
- **THEN** the agent does not use or save it, and offers the password link instead

### Requirement: The agent confirms an outward browser action in the chat

Before a browsing task publishes, sends, books, pays for, or deletes something, the agent SHALL ask the person in the chat, naming exactly what it will do, and SHALL act only on a yes. The person's own tap on a private form's button, which names the action, SHALL count as that yes for that action alone.

#### Scenario: Publishing a website

- **WHEN** the agent has a website ready and the next click publishes it
- **THEN** the chat asks whether to publish it now, the question waits however long the person takes, and the agent clicks publish only after a yes

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

### Requirement: A login with no saved password gets a pre-filled password link

When a site asks for a password login and no saved login matches, the agent SHALL ask whether the person is ready, then send the password link with the site's website filled in. When the site asks for the email or username on a page of its own before any password, the agent SHALL send that link at the first page, asking for the username and the password together, with the password optional; a login saved with no password SHALL type only the username, and a later password page SHALL get the password link with the username filled in. When the agent's browser shows a page on that site as the link opens, the page SHALL open with one picture of that page, taken before the link opens, which the person can view full screen and zoom; a page on another site SHALL give no picture. The page SHALL keep all its usual ways in, an export included, and SHALL carry the filled-in site and username only in the link, never to the server, a log, or a file. The inbox's listing of the link MAY name the site and carry it in its address, but SHALL never carry the username, so a link opened from the inbox asks for it. Once the person saves and continues, the agent SHALL log in with the saved login and carry on. When a login page offers only another provider's sign-in, the agent SHALL follow it to the provider's own login page and treat that page the same way.

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

#### Scenario: Opened from the inbox

- **WHEN** the password link for a rejected netflix.com login is opened from the inbox
- **THEN** the page has netflix.com filled in and an empty username box, and the app never held the username

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

### Requirement: Every private link goes through Cloudflare and closes itself
A password link, a key link, and a private form SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. Each link SHALL default to a 24-hour time limit from opening and SHALL honor an explicit time override. A link SHALL stop working on successful completion, on closure, or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link, a live view included, SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person asks to save a password while at the computer the agent runs on
- **THEN** the link is a Cloudflare address, the same kind a phone would get

#### Scenario: A card form while the inbox is on

- **WHEN** a payment needs a card and the computer can reach the inbox
- **THEN** the private form opens at a Cloudflare address, the inbox lists it with *Open* until it ends, and the card goes only from the person's device to the computer

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a private form without a send or a close
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

### Requirement: Logins persist in the personal browser

Once a site accepts the person's login in the personal browser, that login SHALL be saved to the person's home folder at once, outside any repo, and SHALL survive a restart of the browser or the computer, for every repo on the machine. A login SHALL NOT be lost because the browser stopped before the task ended.

#### Scenario: A later visit after a restart

- **WHEN** the person logged in to a site yesterday and the computer restarted overnight
- **THEN** today's task opens the site already logged in

#### Scenario: The browser stops mid-task

- **WHEN** the browser stops right after a login was accepted
- **THEN** the next task still finds that login

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own pages in the one personal browser and the same saved logins, without waiting on each other and without one closing the other's pages. Preview checks SHALL NOT use the personal browser or its logins.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own pages, and neither reports the browser busy

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's logins

### Requirement: A site that refuses the browser ends with steps for the person

When a site refuses the personal browser, or shows a check or a stuck login that the person's own try in a live view does not clear, the agent SHALL say so in one line, SHALL stop browsing that site, and SHALL give the person its link and numbered steps to finish on their own device. A check that asks whether a person is present, and a stuck login, SHALL first get one live view, on a machine that can show one. The agent SHALL NOT try a second browser, SHALL NOT route its traffic through a hired or borrowed network address, SHALL NOT use a check-solving service, and SHALL NOT solve a check that asks whether a person is present.

#### Scenario: A store behind a check

- **WHEN** a DoorDash store stays on a "Verify you are human" page after the person's try in a live view
- **THEN** the agent sends no second link and gives the store's link and the steps for the person's phone

#### Scenario: The person asks the agent to solve the puzzle

- **WHEN** the person asks the agent to solve a picture puzzle for them
- **THEN** the agent declines and offers a live view for the person to do it themselves

### Requirement: The personal browser reports nothing to its makers

The agent SHALL run the personal browser with its usage and failure reporting switched off, every time it starts it, and the browser SHALL listen only on the computer it runs on.

#### Scenario: A page fails to load

- **WHEN** a site hangs or crashes a page during a task
- **THEN** no report naming the site, even in hashed form, leaves the computer

### Requirement: An update leaves earlier saved logins untouched

An update that moves personal browsing to a new browser SHALL NOT delete, read, or copy the passwords and sessions the earlier browser held. The first task that meets a login on each site SHALL treat it as a site with no saved login.

#### Scenario: A first errand after the update

- **WHEN** a task opens a site the person had saved a login for before the update
- **THEN** the agent asks whether they are ready and sends the password link with the site filled in, and the earlier store is unchanged

### Requirement: Personal browsing starts its own local forwarding proxy

Every new personal-browser start SHALL automatically use a forwarding proxy on the same computer, using that computer's existing network connection. It SHALL require no additional installation, proxy account, Paseo relay, or WARP connection, and SHALL NOT claim to select a country or use the person's phone connection. The proxy SHALL listen only on loopback, SHALL keep no browsing logs, and SHALL tunnel secure website traffic without decrypting it. If the proxy cannot start, the browser SHALL report the failure rather than silently start without it.

#### Scenario: A fresh browser start after installation

- **WHEN** a person starts their first personal browsing task with the browser installed and no proxy or VPN configured
- **THEN** a local forwarding proxy starts automatically, the browser uses it through the computer's own connection, and secure traffic remains encrypted

#### Scenario: The local proxy cannot start

- **WHEN** the local forwarding proxy fails during personal-browser startup
- **THEN** the task receives a startup error and no direct browser starts as a fallback

### Requirement: Local proxy upgrades preserve running browsing tasks

An update adding the local proxy SHALL preserve existing saved logins and SHALL NOT automatically stop an already-running personal browser, close another task's pages, or interrupt private input. Its next deliberate stop and new start SHALL activate the proxy, and stopping that browser SHALL stop its local forwarding listener too.

#### Scenario: Another task is using the existing browser

- **WHEN** updated browsing code encounters a personal browser already running without the managed local proxy
- **THEN** the task can keep its pages and logins and the new default takes effect at the next deliberate browser restart

#### Scenario: Stopping the browser

- **WHEN** the person stops a personal browser that started with the local proxy
- **THEN** its forwarding listener closes and its saved logins remain available for the next start

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

### Requirement: The personal browser starts even when a first start fails

When a start of the personal browser dies before it answers, the agent SHALL try again on a new local port, up to three starts in all, before it reports that the browser did not start. A start that is still running but slow SHALL NOT be tried again. A browsing task waiting on another task's start SHALL start the browser itself when that start ends with no browser answering, rather than wait out its start wait.

#### Scenario: The chosen port is taken

- **WHEN** the first start of the browser dies at once because its port was taken
- **THEN** the next start uses a new port, the task opens its page, and it reports no error

#### Scenario: The other task's start fails

- **WHEN** a task waits while another task starts the browser, and that start fails
- **THEN** the waiting task starts the browser itself and opens its page

### Requirement: Every private input page starts calm

A key link, a password link, and a private form SHALL share one look. Each SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. Each SHALL offer *Not now*, which closes the link as closing it does today. A key link and a private form SHALL show when they close as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in their last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a private form has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock

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

### Requirement: Same-named boxes in embedded frames get their own refs

When a page the personal browser reads holds an embedded frame, such as a payment box, with a field of the same role and name as a field elsewhere on the page, the page read SHALL give each field the ref that acts on that field. When the browser cannot confirm which ref belongs to which field, it SHALL print no ref on those fields and SHALL say so in the page read. It SHALL NOT print a ref that acts on a different field than the line it marks. Pages without embedded frames SHALL read as before.

#### Scenario: The page's Email and a payment box's Email

- **WHEN** a page has an *Email* text box and an embedded payment frame that also has an *Email* text box, and the agent types into the page's *Email* ref from the newest page read
- **THEN** the text lands in the page's *Email* box, and the frame's *Email* box is unchanged

#### Scenario: The frame's own box

- **WHEN** the agent types into the ref printed on the frame's *Email* line
- **THEN** the text lands in the frame's *Email* box

#### Scenario: The browser can't confirm the refs

- **WHEN** the browser's count of fields differs from the count it was given for the same read
- **THEN** each same-named field in more than one frame prints no ref, other fields keep theirs, and the read holds one line saying some boxes have no ref

### Requirement: A click on a tick box is checked

When the agent clicks a tick box, a radio choice, or a switch by its ref or a CSS selector, the personal browser SHALL read whether it changed. When it did not, the browser SHALL focus it and press Space once, then read again. When it still did not change, the click SHALL fail with `BROWSE_ERROR=the box did not change`, not report done. A click by ref on any other element SHALL take no extra step; a click by CSS selector SHALL make one read first, to learn whether it targets a tick box.

#### Scenario: A click that doesn't tick

- **WHEN** the agent clicks an unticked tick box whose page ignores the click but takes the Space key
- **THEN** the box ends ticked and the click reports done

#### Scenario: A box nothing ticks

- **WHEN** neither the click nor Space changes the box
- **THEN** the click prints `BROWSE_ERROR=the box did not change` and exits 1

#### Scenario: A plain button

- **WHEN** the agent clicks a button by its ref
- **THEN** the browser clicks once and reads nothing more

#### Scenario: A button by CSS selector

- **WHEN** the agent clicks a button by a CSS selector
- **THEN** the browser reads that element once, then clicks once and reads nothing more

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

### Requirement: A saved login is typed only on its saved site

The browser SHALL type a saved login's username or password only while the tab's page is on that login's saved host: the same host, `www.` dropped, or one sitting under the other. For a box in a frame, the frame's own site SHALL match the same way; a frame whose site can not be read SHALL count as another site. It SHALL check right before each value it types, so a page that moves to another site between the username and the password gets no password. On any other host it SHALL type nothing, submit nothing, and report `wrong-site`; the agent SHALL then treat the page as having no saved login.

#### Scenario: A look-alike site

- **WHEN** a login is saved for `bank.example` and the agent runs it on a page at `bank.example.attacker.example`
- **THEN** the browser reports `wrong-site`, and neither the username nor the password is typed

#### Scenario: The page moves after the email step

- **WHEN** the username is typed on the saved site and the page is on another host before the password is typed
- **THEN** the browser reports `wrong-site`, and the password is not typed

#### Scenario: A box in the login site's own frame

- **WHEN** a login is saved for `example.com` and its box is in a frame from `login.example.com` on a `shop.example.com` page
- **THEN** the browser types into the box

#### Scenario: A box in another site's frame

- **WHEN** the page is on the login's site but the password box is in a frame from another site, or from a site that can not be read
- **THEN** nothing is typed and the browser reports `wrong-site`

### Requirement: A page reading never shows what a secret box holds

Every way the agent reads a page's text SHALL show a filled secret box only as filled, never its contents. A box SHALL count as secret when it is a password box, when its label or kind names a password, passcode, PIN, card number, card expiry, security code, or one-time code, or when the agent's saved-login step typed a password into it, in the page or in any frame, even after the site switches it to plain text. The browser SHALL NOT keep a typed password in plain text or in a form that can be guessed back without the browser's private key. An empty secret box, a dropdown's picked choice, and every other box SHALL read as before.

#### Scenario: A rejected login leaves the password typed

- **WHEN** a saved login is rejected and the agent reads the login page, with the password still in its box
- **THEN** the reading shows the password box as filled and hidden, and shows the username as typed

#### Scenario: A card box the private form filled

- **WHEN** the agent reads a checkout page whose card number box still holds the number the person sent through the private form
- **THEN** that box reads as filled and hidden, by the page reading and by asking for that one box's contents

#### Scenario: A frame shows the typed password as text

- **WHEN** a login typed a password into a frame from another site, and the site then shows the box's value as text
- **THEN** the page text shows `[hidden]` for that box

### Requirement: The link reaches the person in the turn's last message
When `open` succeeds, it SHALL print, directly after the `HANDOVER_LINK=` line, one `HANDOVER_SEND=` line that tells the agent to run `wait` in the background and then end its turn with the link on its own line. The reminder SHALL hold no part of the link or its key. The agent SHALL put the `HANDOVER_LINK` value in the final message of the turn that opened it, and SHALL NOT send it only in text between tool calls. A failed or refused `open` SHALL print neither line.

#### Scenario: A link opens
- **WHEN** `hand-over.mjs open` prints `HANDOVER_LINK=<url>`
- **THEN** the next line is `HANDOVER_SEND=` with the reminder, holding no address, key, or Cloudflare name, and the agent's last message of the turn holds the link on its own line

#### Scenario: Open is refused
- **WHEN** `open` exits non-zero, such as while another link is open or when the address never answers
- **THEN** it prints neither `HANDOVER_LINK=` nor `HANDOVER_SEND=`

### Requirement: Boxes in a frame from another site name their site

The page text SHALL include the boxes of a frame from another site with their refs, and SHALL say on its first line that frame boxes follow, naming each such frame and its site. Each frame's header SHALL name the frame's site, or say the site is unknown.

#### Scenario: A sign-in box in another site's frame

- **WHEN** the agent reads a page on `shop.example.com` whose sign-in box is a frame from `login.example.com`
- **THEN** the first line says frame boxes are at the end and names `login.example.com`, and the frame's header names `login.example.com` above the email box and its ref

#### Scenario: A page with no frame boxes

- **WHEN** the page has no frame with boxes
- **THEN** the page text has no frame note

### Requirement: A login reports a next step apart from a wrong password

After a password, a login SHALL report `accepted` when the page's address leaves the login page, `next-step` when it stays but the password box is gone, and `rejected` when it stays and the password box is still there.

#### Scenario: A code page after the password

- **WHEN** the page stays on the same address after the password and shows a code page with no password box
- **THEN** the login reports `next-step`, not `rejected`

#### Scenario: A wrong password

- **WHEN** the page stays on the same address and still shows the password box
- **THEN** the login reports `rejected`

### Requirement: A selector that can not read the page says why

A command given a selector the page can not read SHALL fail with a plain reason: a selector reads only the main page, and a box in a frame needs its ref. It SHALL NOT fail with a code error.

#### Scenario: A frame selector

- **WHEN** the agent runs `get count` with a selector that names a box inside a frame
- **THEN** the command fails with that plain reason

### Requirement: A login may try a sibling subdomain once on request

When the agent passes `--main-domain`, the browser SHALL also type a saved login on a host that shares the saved host's main domain: its last two labels, or its last three under a country's own second level such as `co.uk`. It SHALL apply the same check to the tab and to each box's frame. A host with another main domain SHALL still get nothing and `wrong-site`. Without the flag, the saved-site rule SHALL apply unchanged.

#### Scenario: A sibling subdomain with the flag

- **WHEN** a login is saved for `clinic.janeapp.com` and the agent runs it with `--main-domain` on `myodetox.janeapp.com`
- **THEN** the browser types the login

#### Scenario: A sibling subdomain without the flag

- **WHEN** the agent runs the same login on `myodetox.janeapp.com` without the flag
- **THEN** the browser reports `wrong-site` and types nothing

#### Scenario: Another main domain with the flag

- **WHEN** the agent runs the login with `--main-domain` on `janeapp.attacker.example`
- **THEN** the browser reports `wrong-site` and types nothing
