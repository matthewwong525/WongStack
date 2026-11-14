## MODIFIED Requirements

### Requirement: A bell marks each tab that waits on the person, and one Hand back ends them all

While a chat's turn is open, in a live view or in the browser window, that chat's tab title SHALL begin with a bell, kept through page changes and removed when the turn ends; no other tab SHALL show a bell. The browser SHALL show one *Hand back* button in its own toolbar, which no site can see, with the number of open turns. The button SHALL show as a green check mark, never a bell, and SHALL be grey and do nothing while no turn is open. Every line that gives the person the browser, in a live view or in the chat for the browser window, SHALL tell them, in as few words as it can, to tap or click the green check when they are done, and where it is; a watch link's line SHALL name its own *Hand back* instead. Clicking it SHALL end every open turn and SHALL tell each of their chats, and each agent SHALL read its page afresh and ask in the chat before a further step on a page whose step is not finished. *Done* in a chat, a close, or a time limit SHALL end only that chat's turn. The watch link SHALL take no bell, and the toolbar *Hand back* SHALL NOT end it.

#### Scenario: Two chats wait, one Hand back

- **WHEN** one chat waits on a sign-in and another on a card, each tab with its bell, and the person finishes both and clicks *Hand back* in the toolbar
- **THEN** both bells go, both chats are told and carry on, and each reads its page afresh

#### Scenario: Hand back before a step is done

- **WHEN** the person clicks *Hand back* while the card tab still shows its card page
- **THEN** the card's chat presses nothing on that page and asks in the chat what to do

#### Scenario: The line names the green check

- **WHEN** a chat gives the person the browser to sign in to Netflix
- **THEN** its line tells them in one short line to sign in, then to tap the green check at the top right, and the toolbar shows a green check with the count 1
