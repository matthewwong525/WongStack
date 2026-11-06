## MODIFIED Requirements

### Requirement: One link per chat, several chats at once

Each chat SHALL have its own private-link place, named by its folder. A link from one chat SHALL open while another chat's link is open, and neither SHALL close, replace, or read the other. `wait` and `close` SHALL act only on the calling chat's link, and a finished link SHALL wake only the chat that opened it.

#### Scenario: Two chats

- **WHEN** chat A has a live view open and chat B opens a key link
- **THEN** both links are open, and saving the key wakes only chat B

#### Scenario: Close is per chat

- **WHEN** chat A has a key link open and chat B runs `close` during its `/close`
- **THEN** chat A's key link stays open

### Requirement: A blocked open names its holder

When a link can't open, the message SHALL name the chat folder that holds the place.

#### Scenario: Same chat busy

- **WHEN** a chat with an open live view asks for a key link
- **THEN** the open fails and the message names that chat

### Requirement: A live view can stay open until the person closes it

A live view opened to stay open SHALL take no finish, and SHALL end only when the person taps *Hand back* on its page, when the chat closes it, or at its time limit. It SHALL stay open through every page change on the site.

#### Scenario: Several steps in one view

- **WHEN** the person taps through two checkout steps in a view that stays open
- **THEN** the view stays open until the person taps *Hand back*

### Requirement: The agent checks an unclear payment without seeing the card

After a payment turn that ended without a clear answer, the agent SHALL read the site's page only as text in which every card box is hidden, and SHALL take no picture while a card box still holds a typed value. It SHALL tell the person whether the site accepted, declined, or can't be told, and SHALL never open a new payment turn while the payment may have gone through. It MAY press a site step that pays nothing; a press that pays SHALL be the person's, in a live view, after a pay question that names the purchase.

#### Scenario: The site saved the card and stayed

- **WHEN** the person handed back and the page shows the saved card's last digits and a Continue step
- **THEN** the agent says the site saved the card, may press Continue, and asks before the person places the order

#### Scenario: No answer on the page

- **WHEN** the page shows neither a receipt nor an error
- **THEN** the agent says the payment is not confirmed, looks for the store's receipt in email when the chat has an email tool, and tells the person not to pay again until it is known

## REMOVED Requirements

### Requirement: A form shows the site live from the press

**Reason**: The private form is removed; the person sees the site in the live view from the start.
**Migration**: None.

### Requirement: A changed page stops the form before typing

**Reason**: The private form is removed; the person types on the site's own page.
**Migration**: None.

### Requirement: A form leaves a pressed card alone

**Reason**: The private form is removed; nothing but the person types in the card boxes.
**Migration**: None.

### Requirement: A password link can sign in and turn into a live view

**Reason**: The password link is removed; a sign-in is a live view from the start.
**Migration**: None.
