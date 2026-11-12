## MODIFIED Requirements

### Requirement: Every live view shows one line and Hand back

Every live view SHALL show, in one bar under the site, one short line saying what the person should do now, the type box, and one *Hand back* button, for the chat whose tab is shown. *Hand back* SHALL end that chat's turn and return its page to the agent. When the step is not finished after *Hand back*, the agent SHALL ask in the chat before it takes a further step on that page.

#### Scenario: A stuck step

- **WHEN** the person taps through DigiKey's stuck *Continue* in a live view and taps *Hand back*
- **THEN** that chat's turn ends, the chat is told, and the agent reads the page afresh

#### Scenario: Give up on a payment

- **WHEN** the person taps *Hand back* in a payment's live view without pressing Pay, and says in the chat to stop
- **THEN** that chat's turn ends, the agent presses nothing on that page, and the chat says the payment was not finished

## ADDED Requirements

### Requirement: Chats that need the person share one live view, a tab each

On a computer that shows the person's turn by a live-view link, a chat that needs a turn while a live view is open SHALL join that view as a tab of its own and send the same link, and SHALL NOT be refused because another chat's turn is open. The view SHALL show a row of tabs, one per chat with an open turn, each named for its chat. Tapping a tab SHALL show that chat's page and line; each page SHALL stay as the person left it. A newly joined tab SHALL NOT take the screen from the tab shown. *Hand back*, a close, or a time limit on one tab SHALL end only that chat's turn and SHALL tell only that chat; the view SHALL then show the oldest tab still open, and the link SHALL close when no tab is left. The watch link SHALL take no tab.

#### Scenario: Two chats need the person at once

- **WHEN** one chat's sign-in view is open and another chat needs the person to type a card
- **THEN** the second chat's tab appears in the same view, marked new, its chat sends the same link, and the person's sign-in page stays shown until they tap the new tab

#### Scenario: Hand back on one tab

- **WHEN** the person taps *Hand back* on the card tab while the sign-in tab is still open
- **THEN** only the card's chat is told and carries on, the view shows the sign-in tab, and the link stays open
