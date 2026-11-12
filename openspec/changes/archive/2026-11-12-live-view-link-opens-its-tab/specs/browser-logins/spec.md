## MODIFIED Requirements

### Requirement: Chats that need the person share one live view, a tab each

On a computer that shows the person's turn by a live-view link, a chat that needs a turn while a live view is open SHALL join that view as a tab of its own and send the view's link, naming its own tab, and SHALL NOT be refused because another chat's turn is open. The view SHALL show a row of tabs, one per chat with an open turn, each named for its chat. Tapping a tab SHALL show that chat's page and line; each page SHALL stay as the person left it. Opening a chat's link SHALL show that chat's tab while its turn is open, and the view as it is otherwise. A newly joined tab SHALL NOT take the screen from the tab shown. *Hand back*, a close, or a time limit on one tab SHALL end only that chat's turn and SHALL tell only that chat; the view SHALL then show the oldest tab still open, and the link SHALL close when no tab is left. The watch link SHALL take no tab.

#### Scenario: Two chats need the person at once

- **WHEN** one chat's sign-in view is open and another chat needs the person to type a card
- **THEN** the second chat's tab appears in the same view, marked new, its chat sends the view's link naming its tab, and the person's sign-in page stays shown until they tap the new tab or open its link

#### Scenario: Opening the second chat's link

- **WHEN** the sign-in tab is shown and the person opens the link the card's chat sent
- **THEN** the view opens on the card tab, its line shows, and the sign-in tab stays open as the person left it

#### Scenario: Opening a link whose tab has ended

- **WHEN** the person opens a chat's link after they handed that chat's tab back, while another tab is still open
- **THEN** the view opens on the tab shown now

#### Scenario: Hand back on one tab

- **WHEN** the person taps *Hand back* on the card tab while the sign-in tab is still open
- **THEN** only the card's chat is told and carries on, the view shows the sign-in tab, and the link stays open
