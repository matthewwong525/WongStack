## MODIFIED Requirements

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

### Requirement: Sensitive input is typed only on the real site in a live view

A payment card, a backup or recovery code, a password, and any other lasting secret a page asks for SHALL be typed by the person on the site's own page, in a live view of the agent's browser, never in the chat and never in a page of the agent's own. The agent SHALL first fill the page's ordinary answers and ask in the chat whether the person is ready, naming what the step is for. The live view SHALL show one short line saying what to do now. The agent SHALL NOT read, picture, or act on its browser from the moment the view opens until the person's turn ends. The turn SHALL end only when the person taps *Hand back*, when the chat closes it, or at its time limit. The agent SHALL learn only how the turn ended, then read the page afresh.

#### Scenario: A sign-in

- **WHEN** a task meets Netflix's login page and the browser is not signed in
- **THEN** the agent asks whether the person is ready, sends a live view whose line says to sign in and tap *Hand back*, the person signs in there and taps *Hand back*, and the agent carries on signed in, never having seen the password

#### Scenario: A backup code

- **WHEN** a site asks for a backup code
- **THEN** the agent does not ask for it in the chat, the person types it on the site in a live view, and the stored chat never holds it

### Requirement: The person presses a payment's button

For a card payment, the person SHALL type the card and press the site's own pay button in the live view; the agent SHALL NOT press a button that pays with the person's card. The pay question in the chat, naming the purchase and its total, SHALL come before the view opens. After the turn, the agent SHALL read the page only as text in which every card box is hidden, SHALL take no picture while a card box holds a typed value, and SHALL tell the person whether the site accepted, declined, or can't be told. It SHALL NOT open another payment turn while the payment may have gone through.

#### Scenario: A card from a phone

- **WHEN** the person types a card in the live view, presses the site's *Pay $45.00*, the site shows its receipt, and the person taps *Hand back*
- **THEN** the view stays open until that tap, and the chat then carries on with a picture of the receipt

#### Scenario: Handed back with no receipt

- **WHEN** the person taps *Hand back* while the site still shows its card page
- **THEN** the agent reads the page as text with the card boxes hidden, takes no picture, and says the payment is not confirmed rather than asking the person to pay again

### Requirement: Every private link opens through Cloudflare and closes itself

A key link and a live view SHALL each open at a new address through Cloudflare's tunnel, with a secret key only the link carries, including when the person is at the computer the agent runs on. The agent SHALL give the person a link only once it answers from outside that computer. A key link SHALL default to a 24-hour time limit from opening, a live view to eight hours, and each SHALL honor an explicit time override. A key link SHALL stop working on its save, and a live view on *Hand back*; each SHALL also stop on closure or at its time limit, even if the agent's session has ended, and a closed link SHALL never work again. When the computer can reach the person's inbox, every private link SHALL also be listed there while it is open, with its title, kind, closing time and address only; nothing typed into it SHALL pass through the app, and opening the link SHALL never wait on the listing.

#### Scenario: The person sits at the agent's computer

- **WHEN** the person needs to sign in to a site while at the computer the agent runs on
- **THEN** the live view's link is a Cloudflare address, the same kind a phone would get

#### Scenario: Nobody finishes

- **WHEN** 24 hours pass on a key link without a save or a close
- **THEN** the link stops working, and the agent tells the person it timed out and offers a new one

### Requirement: On a computer with its own screen, the turn happens in the shown browser window

On a Mac or Windows computer, and on a Linux computer with a screen and the link setting off, the agent's browser SHALL open in a window on the screen by default, and the window SHALL stay shown while the agent works: it SHALL never hide by itself. The person's turn SHALL happen in that window, on the task's own tab: the chat SHALL say what to do and to say *done*, and the turn SHALL end only on *done*, a close, or the time limit, never because the page changed. The person SHALL be able to turn the window off, taking effect at the next browser start, never by restarting a running browser. On a Mac or Windows computer with the window off, a step that needs the person SHALL end with steps to finish in their own browser.

#### Scenario: A sign-in on a Mac

- **WHEN** a task on a Mac with the window on meets a login page
- **THEN** the window, already shown, brings that task's tab to the front, no link is sent, the chat asks the person to sign in in the browser window and say *done*, and the agent carries on only after *done*

#### Scenario: The window turned off

- **WHEN** the person on a Mac has turned the window off and a site asks them to sign in
- **THEN** the agent sends no link and gives them steps to finish in their own browser

#### Scenario: A Linux computer with a screen

- **WHEN** a task on a Linux computer with a screen and the link setting off meets a login page
- **THEN** the browser shows in a window there, and the turn goes as on a Mac, with no link
