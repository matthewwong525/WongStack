## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Every live view shows one line and Hand back

**Reason**: The live view's bar now lists every open turn's step and has no *Hand back* of its own; one *Hand back* in the browser's toolbar ends every turn.
**Migration**: "A bell marks each tab that waits on the person, and one Hand back ends them all" and "Chats that need the person share one live view" carry it.

### Requirement: Chats that need the person share one live view, a tab each

**Reason**: The view's row of chat names is gone, and *Hand back* no longer ends one tab at a time; bells on the browser's own tabs label the turns.
**Migration**: "Chats that need the person share one live view" replaces it.
