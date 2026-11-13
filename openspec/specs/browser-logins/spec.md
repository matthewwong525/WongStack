# browser-logins Specification

## Purpose

Let the agent use the person's own web accounts in a personal browser, with each login done once and reused, kept out of preview checks.

## Requirements

### Requirement: The person does each login once

The person SHALL sign in to a site once, in a live view or the browser's window, and the agent SHALL then reuse the browser's session. The agent SHALL NOT ask for a password in the chat, and SHALL NOT read, show, or store a password. It SHALL NOT type one, except a login picked from the person's unlocked password manager after their yes.

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

When a task needs a website to get, create, reveal, copy, rotate, edit permissions for, or revoke an API key or token, the agent SHALL ask the person to do that step in their own browser, providing the service's token-management link and short instructions including required permissions when relevant. When a new or replacement value is to come back, that link and those instructions SHALL be on the private key link's page; for a change needing no new value they SHALL be in the chat. It SHALL NOT use its own browser, screenshots, or page extraction for that token step. The one exception SHALL be connecting a tool, where the person said yes to the agent using their own open Chrome, or the agent uses its own browser by the own-browser connect requirements: the agent MAY then make the key in that browser by the own-browser connect requirements. A newly supplied or replacement value SHALL otherwise use the existing private key link; a change needing no new value SHALL wait for the person's confirmation. The agent SHALL resume dependent work only after the required value is saved or the person confirms completion. Ordinary website tasks, use of stored credentials, and existing authorized token management through APIs SHALL continue unchanged.

#### Scenario: A token request while the browser is signed in

- **WHEN** a task needs a missing API token and the agent's browser is signed in to the service
- **THEN** it sends the private key link, whose page carries the token-management link and steps, without opening the service in its browser, receives the value there, and then resumes

#### Scenario: A token edit during an ordinary browsing task

- **WHEN** an ordinary browsing task reaches a step requiring a token permission change or revocation
- **THEN** the agent stops browser interaction for that step, gives the person the website link and instructions, waits for confirmation without taking token-page pictures or extracting its content, and resumes ordinary work afterward

#### Scenario: Connecting in the person's own Chrome

- **WHEN** the owner connects Stripe and says yes to the agent using their own Chrome
- **THEN** the agent makes the Stripe key in that Chrome, and no key-page picture or reading holds the key

#### Scenario: Connecting in the agent's own browser on a server

- **WHEN** the agent runs on a server and the owner says *connect my Notion*
- **THEN** the agent makes the Notion key there, the owner signs in through a link if asked, and no key-page picture or reading of the agent's holds the key

### Requirement: The agent gets a login code through the chat or email

When a sign-in reaches a one-time code step after the person's turn, the agent SHALL get the code from the person's email when the agent's browser is already signed in to it, else by asking in the chat, naming the site and where the code was sent, and SHALL enter the code itself. An emailed sign-in link SHALL be handled the same way. Reading email, it SHALL open only the newest message from that site, SHALL show no picture of the inbox, and SHALL say in the chat that it took the code from the email. It SHALL NOT sign in to email to fetch a code. A backup or recovery code SHALL be typed by the person in a live view, never the chat. For an approve-on-your-device prompt, it SHALL ask the person in the chat to approve and wait, with no link.

#### Scenario: A code sent by text

- **WHEN** the person handed back after signing in and the site then texts a code to the person
- **THEN** the agent asks for the code in the chat, enters it, and carries on, sending no link

#### Scenario: A code sent to an email the browser is not signed in to

- **WHEN** the site emails a code and the agent's browser is signed out of that email
- **THEN** the agent asks for the code in the chat and does not try to sign in to the email

### Requirement: Logins persist in the personal browser

Once a site accepts the person's login in the personal browser, that login SHALL be saved to the person's home folder at once, outside any repo, and SHALL survive a restart of the browser or the computer, for every repo on the machine. A login SHALL NOT be lost because the browser stopped before the task ended.

#### Scenario: A later visit after a restart

- **WHEN** the person logged in to a site yesterday and the computer restarted overnight
- **THEN** today's task opens the site already logged in

#### Scenario: The browser stops mid-task

- **WHEN** the browser stops right after a login was accepted
- **THEN** the next task still finds that login

### Requirement: Browsing tasks share the personal browser

Two browsing tasks, or a task and a scheduled run, SHALL each use their own tab in one window of the one personal browser and the same sign-ins, without waiting on each other and without one closing the other's tabs. A new task SHALL NOT open a second window. Preview checks SHALL NOT use the personal browser or its sign-ins.

While the person's turn is open in another task's tab, a task SHALL read, click, type, choose and resize in its own tab at once: no step SHALL wait for the turn to end, and no step SHALL be refused because of it. When a step shows that task's tab, the turn's tab the person was on SHALL come back to the front right after the step, and a task's request to show its own tab SHALL leave the person's tab in front. With no turn open, every step SHALL work as before.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run starts while a chat is browsing
- **THEN** both carry on, each in its own tab of the same window, and neither reports the browser busy

#### Scenario: Another chat browses during the person's turn

- **WHEN** a chat reads, types, and resizes its own tab while the person signs in on another chat's tab
- **THEN** each step runs at once in the chat's own tab, and the person's tab is the one shown after each

#### Scenario: Another chat clicks a button during the person's turn

- **WHEN** a chat clicks a button or a link in its own tab while the person signs in on another chat's tab
- **THEN** the button or link acts at once, the chat hears it is done, and the person's tab stays the one shown

#### Scenario: Another chat clicks a mouse-only target during the person's turn

- **WHEN** a chat clicks an element that reacts to no key while the person's turn is open in another chat's tab
- **THEN** the click runs at once, the chat's next step on that tab is not refused, and the person's tab is the one shown

#### Scenario: A preview check

- **WHEN** `/verify` walks a preview
- **THEN** it uses its own temporary browser with none of the person's sign-ins

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

### Requirement: Local proxy upgrades preserve running browsing tasks

An update that changes the proxy default, or a change to the proxy setting, SHALL preserve existing saved logins and SHALL NOT stop a personal browser that a task is using, close another task's tabs, or interrupt private input. The next stop and new start SHALL apply the setting, and stopping a browser that started with the proxy SHALL stop its local forwarding listener too.

#### Scenario: Another task is using the existing browser

- **WHEN** updated browsing code encounters a personal browser already running without the managed local proxy
- **THEN** the task can keep its pages and logins and the new default takes effect at the next browser start

#### Scenario: Stopping the browser

- **WHEN** the person stops a personal browser that started with the local proxy
- **THEN** its forwarding listener closes and its saved logins remain available for the next start

### Requirement: A live view shows the whole page and closes itself

A live view SHALL show the page fitted to the person's screen, on a phone as on a laptop, with the step and its buttons in view, and SHALL put the page back as it was when it closes. It SHALL let the person type and paste into the page from a phone. It SHALL open at a new address through Cloudflare's tunnel with a secret only the link carries, SHALL show and accept nothing without that secret, and SHALL stop working when the person taps *Hand back*, when the chat closes it, or at its time limit, eight hours unless a shorter one is asked, even if the agent's session has ended. It SHALL NOT close because the page reached a signed-in page, a receipt, or any other step. A closed link SHALL never work again.

#### Scenario: A puzzle on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the whole puzzle shows, its button included, and no part of it is cut off

#### Scenario: Nobody finishes

- **WHEN** eight hours pass on a live view without *Hand back*
- **THEN** the link stops working, the page is put back as it was, and the agent tells the person it timed out and offers a new one

#### Scenario: The site lets the person in

- **WHEN** the person signs in during a live view and the site shows its signed-in page
- **THEN** the view stays open, and the person keeps the browser until they tap *Hand back*

### Requirement: A page stays open while a private link is using it

While a live view is open, the page it shows SHALL stay open for as long as the link does, however long the person leaves it untouched. Keeping it open SHALL type nothing, press nothing, and go to no other address, and SHALL read nothing the person typed.

#### Scenario: A slow card

- **WHEN** the person presses Pay in a live view seven minutes after it opened
- **THEN** the site's page is the one the agent filled, with the person's card in its boxes

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

A key link SHALL open with a label naming it a private link and, above its first field, one plain line saying that what the person enters stays out of the chat. It SHALL offer *Not now*, which closes the link. It SHALL show when it closes as a time of day on the person's clock, naming the day when it is not today, counted in minutes only in its last ten minutes. A key page with several keys SHALL say how many are saved, and once every key is saved SHALL show that all is set.

#### Scenario: A first-time key

- **WHEN** the person opens a 24-hour key link at 5:30 AM
- **THEN** the page shows a private-link label, the privacy line above the field, *Open until 5:30 AM tomorrow*, and *Not now*

#### Scenario: The last minutes

- **WHEN** a key link has nine minutes left
- **THEN** the page shows *Closes in 9 min*, timed on the watcher's clock

### Requirement: A task no API can do goes to the browser

When no company action or saved key can do a task on a website, the agent SHALL do it in the personal browser as the person, without being asked, and SHALL NOT give the person steps for it before trying. API key and token websites SHALL keep the own-browser requirement.

#### Scenario: An app's settings with no API

- **WHEN** a task needs a setting in a store app that no saved key or action can change
- **THEN** the agent opens the store's admin in the personal browser and makes the change there, asking only for what needs the person

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

### Requirement: A selector that can not read the page says why

A command given a selector the page can not read SHALL fail with a plain reason: a selector reads only the main page, and a box in a frame needs its ref. It SHALL NOT fail with a code error.

#### Scenario: A frame selector

- **WHEN** the agent runs `get count` with a selector that names a box inside a frame
- **THEN** the command fails with that plain reason

### Requirement: Sensitive input is typed only on the real site in a live view

A payment card, a backup or recovery code, a password, and any other lasting secret a page asks for SHALL be typed by the person, except a login picked from the person's unlocked password manager after their yes, on the site's own page, in a live view of the agent's browser, never in the chat and never in a page of the agent's own. The agent SHALL first fill the page's ordinary answers and ask in the chat whether the person is ready, naming what the step is for. The live view SHALL show one short line saying what to do now. The agent SHALL NOT read, picture, or act on its browser from the moment the view opens until the person's turn ends. The turn SHALL end only when the person taps *Hand back*, when the chat closes it, or at its time limit. The agent SHALL learn only how the turn ended, then read the page afresh.

#### Scenario: A sign-in

- **WHEN** a task meets Netflix's login page and the browser is not signed in
- **THEN** the agent asks whether the person is ready, sends a live view whose line says to sign in and tap *Hand back*, the person signs in there and taps *Hand back*, and the agent carries on signed in, never having seen the password

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person types it on the site in a live view, and the stored chat never holds it

#### Scenario: A login from the unlocked password manager

- **WHEN** a site needs a login, the person's unlocked 1Password offers one for it, and the person says yes to the agent's ask
- **THEN** the agent picks it, 1Password fills the site's own page with no live view, and the password never reaches the chat

### Requirement: The person presses a payment's button

For a card payment, the person SHALL type the card and press the site's own pay button in the live view; the agent SHALL NOT press a button that pays with the person's card. The pay question in the chat, naming the purchase and its total, SHALL come before the view opens. After the turn, the agent SHALL read the page only as text in which every card box is hidden, SHALL take no picture while a card box holds a typed value, and SHALL tell the person whether the site accepted, declined, or can't be told. It SHALL NOT open another payment turn while the payment may have gone through.

#### Scenario: A card from a phone

- **WHEN** the person types a card in the live view, presses the site's *Pay $45.00*, the site shows its receipt, and the person taps *Hand back*
- **THEN** the view stays open until that tap, and the chat then carries on with a picture of the receipt

#### Scenario: Handed back with no receipt

- **WHEN** the person taps *Hand back* while the site still shows its card page
- **THEN** the agent reads the page as text with the card boxes hidden, takes no picture, and says the payment is not confirmed rather than asking the person to pay again

### Requirement: An update stops using saved passwords and offers to delete them

An update that removes saved logins SHALL leave the saved-passwords file unread and untouched by code, and SHALL ask the person once whether to delete it, deleting it only on a yes. The browser's own sign-ins SHALL be kept.

#### Scenario: Updating an install with saved logins

- **WHEN** an install with saved logins takes the update
- **THEN** the person is asked once whether to delete the saved-passwords file, the file stays unless they say yes, and sites already signed in in the browser stay signed in

### Requirement: A paste anywhere on a live view types into the browser

In every live view, a paste the person makes on the browser's picture, or in the box under it, SHALL type the pasted text into the part of the browser that has the focus, as if typed. The view SHALL save nothing pasted, and the agent SHALL NOT see it.

#### Scenario: Pasting a password on a laptop

- **WHEN** the person taps Notion's password box in the sign-in link on a laptop and pastes a password from their own password manager onto the browser's picture
- **THEN** the password appears in Notion's box, and nothing pasted reaches the chat, a file, or a log

### Requirement: A private link records what ended it without values

Each private link SHALL record what ended it and how long it was open, on the agent's computer and outside the repo. The record SHALL hold no typed value, and SHALL stay small by keeping only recent entries.

#### Scenario: A link that closed by itself

- **WHEN** a link closes before anyone opens it
- **THEN** the record names what closed it: a close command, a signal, the person's own close, or the time limit

### Requirement: A step that needs the person goes to the chat or the live view

When a browsing step needs something only the person can give, an ordinary answer (an email, a name, an address, a choice, agreeing to terms) SHALL be asked in the chat and entered by the agent, and the agent SHALL NOT agree to terms without the person's yes. A sensitive value, a sign-in, a check that asks whether a person is present, a site step the agent's click can not get through, and a PayPal approval SHALL go through a live view. A one-time code SHALL follow the login-code requirement, and an API key or token step the own-browser requirement. A sign-in while connecting tools in the agent's own browser, and watching it when the person asks, with taking over, SHALL follow the own-browser connect requirements. A passkey saved in the password manager in the agent's browser SHALL follow the password-manager pick requirement. A step only the person's own device can do (a passkey kept on their own phone or computer, or a device check) SHALL NOT be attempted by the agent: the agent SHALL stop that step and hand it back in the chat as numbered steps for the person's own device: one action each, a direct link to the page for each step that has one, the site's own labels, and the details the agent already has, never an invented address.

#### Scenario: A payment page asks for an email, terms, and a card

- **WHEN** a checkout page asks for an email, a terms tick, and card details
- **THEN** the agent asks for the email and the terms in the chat, enters them itself, and sends a live view for the card only

#### Scenario: A passkey

- **WHEN** a site asks for a passkey, and the password manager in the agent's browser offers none
- **THEN** the agent sends no private link, stops that step, and gives the person numbered steps, each with its link, to finish on their own device

### Requirement: Every private link opens through Cloudflare and closes itself

A key link and a live view SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A key link SHALL default to a 24-hour time limit from opening, a live view to eight hours, and each SHALL honor an explicit time override. A key link SHALL stop working on its save, and a live view on *Hand back*; each SHALL also stop on closure or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

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

### Requirement: The local forwarding proxy is a setting on each computer

The personal browser SHALL go straight to sites by default. The person SHALL be able to turn a local forwarding proxy on or off, and the choice SHALL apply from the browser's next start. When on, the proxy SHALL run on the same computer through its existing connection, SHALL need no added install, account, Paseo relay, or WARP connection, SHALL listen only on loopback, SHALL keep no browsing logs, and SHALL tunnel secure traffic without decrypting it; if it cannot start, the browser SHALL report the failure rather than start without it.

#### Scenario: A fresh browser start after installation

- **WHEN** a person starts their first personal browsing task and has never turned the proxy on
- **THEN** the browser starts with no proxy and reaches sites through the computer's own connection

#### Scenario: The proxy is on but cannot start

- **WHEN** the proxy setting is on and the proxy fails during the browser's start
- **THEN** the task receives a startup error and no direct browser starts as a fallback

### Requirement: The proxy goes through saved proxies, in order

While the proxy setting is on, the personal browser SHALL send each connection to a site through the person's saved first proxy, then their saved backup proxy when the first fails, then the computer's own connection when both fail. A first proxy that failed while the backup worked SHALL be skipped for about a minute, then tried again. Addresses on the computer itself SHALL go direct. A plain (not secure) request SHALL move to the next route only when a route refused or never took it, and SHALL never be sent twice. The saved proxies SHALL be kept on the computer, readable only by the person, so a start from any repo uses them, and a proxy saved in a repo's keys SHALL replace the computer's copy at the next start. The browser SHALL never see a proxy address or login, only the local proxy. With the proxy off, the browser SHALL go straight to sites and the saved proxies SHALL stay for a later start.

#### Scenario: The home proxy is off

- **WHEN** the proxy is on, a first and a backup proxy are saved, and the first proxy does not answer
- **THEN** pages load through the backup proxy, and new connections in the next minute go straight to the backup

#### Scenario: Another repo starts the browser

- **WHEN** the proxies were saved from one repo and a task in another repo on the same computer starts the browser
- **THEN** the browser goes through the same saved proxies

### Requirement: The browser's status names its route

The browser's status SHALL say which route the running browser uses: the first proxy, the backup proxy, the computer's own connection because every proxy failed, the computer's own connection because no proxy is saved, or that no browser runs. It SHALL never show a proxy address or login.

#### Scenario: The browser is on the backup

- **WHEN** the first proxy failed and the backup proxy carries the browser's connections
- **THEN** the status names the backup route, so the agent can tell the person to check their home proxy

### Requirement: Browser settings stay on the computer

The window or link setting and the proxy setting SHALL be kept on the computer, outside every repo, so no commit carries them and each computer keeps its own. A setting SHALL apply to every repo on that computer.

#### Scenario: A teammate pulls the repo

- **WHEN** a teammate pulls a repo after the person turned on the link setting and the proxy
- **THEN** the teammate's computer keeps its own settings, and no repo file changed

### Requirement: On Linux, the link setting sends the browser as a live view

A Linux computer SHALL use a live-view link for the person's turn when its link setting is on, or when it has no screen. The link SHALL come by itself for a sign-in, a payment or backup code, a robot check, or a stuck step, and also whenever the person asks for the browser; a link asked for SHALL show the chat's own tab and stay open until the person hands it back or its time limit passes. On a computer that shows a window, asking for the browser SHALL bring the chat's own tab to the front and send no link.

#### Scenario: The person asks for the browser

- **WHEN** the person on a Linux server says *send me the browser* during a task
- **THEN** the agent sends a live-view link to that chat's tab, which stays open until they tap *Hand back*

#### Scenario: Asking on a Mac

- **WHEN** the person on a Mac with the window on asks to see the browser
- **THEN** the chat's tab comes to the front of the browser window and no link is sent

### Requirement: On a computer with its own screen, the turn happens in the shown browser window

On a Mac or Windows computer, and on a Linux computer with a screen and the link setting off, the agent's browser SHALL open in a window on the screen by default, and the window SHALL stay shown while the agent works: it SHALL never hide by itself. The person's turn SHALL happen in that window, on the task's own tab, with its bell: the chat SHALL say what to do, on the bell tab, and to click *Hand back* in the browser's toolbar. The turn SHALL end only on that *Hand back*, on *done* in its chat, a close, or the time limit, never because the page changed. Several chats' turns SHALL be open in the window at once, and a turn SHALL NOT be refused because another chat's window turn is open. A turn's tab SHALL come to the front when it opens only if no other turn is open. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. On a Mac or Windows computer with the window off, a step that needs the person SHALL end with steps to finish in their own browser.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** the window, already shown, brings that task's tab to the front with its bell, no link is sent, the chat asks the person to sign in on the bell tab and click *Hand back*, and the agent carries on only after the turn ends

#### Scenario: Two chats need the person at once on a Mac

- **WHEN** one chat's sign-in turn is open in the window and another chat needs the person to type a card
- **THEN** the card's tab gets a bell and stays behind the sign-in tab, and neither chat is told the person is busy

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

#### Scenario: A Linux computer with a screen

- **WHEN** a task on a Linux computer with a screen and the link setting off meets a login page
- **THEN** the browser shows in a window there, and the turn goes as on a Mac, with no link

### Requirement: A bell marks each tab that waits on the person, and one Hand back ends them all

While a chat's turn is open, in a live view or in the browser window, that chat's tab title SHALL begin with a bell, kept through page changes and removed when the turn ends; no other tab SHALL show a bell. The browser SHALL show one *Hand back* button in its own toolbar, which no site can see, with the number of open turns. Clicking it SHALL end every open turn and SHALL tell each of their chats, and each agent SHALL read its page afresh and ask in the chat before a further step on a page whose step is not finished. *Done* in a chat, a close, or a time limit SHALL end only that chat's turn. The watch link SHALL take no bell, and the toolbar *Hand back* SHALL NOT end it.

#### Scenario: Two chats wait, one Hand back

- **WHEN** one chat waits on a sign-in and another on a card, each tab with its bell, and the person finishes both and clicks *Hand back* in the toolbar
- **THEN** both bells go, both chats are told and carry on, and each reads its page afresh

#### Scenario: Hand back before a step is done

- **WHEN** the person clicks *Hand back* while the card tab still shows its card page
- **THEN** the card's chat presses nothing on that page and asks in the chat what to do

### Requirement: Chats that need the person share one live view

On a computer that shows the person's turn by a live-view link, a chat that needs a turn while a live view is open SHALL join that view and send its link, and SHALL NOT be refused because another chat's turn is open. The view SHALL show the browser's whole window, its own tabs included, and SHALL show no row of its own. The bar under the browser SHALL list what each open turn asks, each beside its bell, and the type box; it SHALL show no *Hand back* of its own on a turn view. A newly joined turn SHALL NOT take the screen from the tab shown; opening a chat's link SHALL bring that chat's tab to the front while its turn is open. The link SHALL close when no turn is left.

#### Scenario: A second chat joins

- **WHEN** one chat's sign-in view is open and another chat needs the person to type a card
- **THEN** the card's tab gets a bell and stays behind the sign-in page, the bar lists both steps, and that chat sends the view's link

#### Scenario: The last turn ends

- **WHEN** the person clicks *Hand back* in the toolbar with two turns open
- **THEN** both chats are told and the link closes

### Requirement: An updated browser starts by itself

A running personal browser whose own code changed after it started SHALL stop by itself once no task has a tab open or opening in it and no turn is open, so the next browser command starts the new code. It SHALL never stop while a task uses it.

#### Scenario: Idle after an update

- **WHEN** a fix to the browser lands and the last task's tab closes
- **THEN** the browser stops, and the next task's browser command starts the fixed one

#### Scenario: A task still uses the browser

- **WHEN** the browser's code changed while a task has its tab open
- **THEN** the browser keeps running, with that task's page and logins
