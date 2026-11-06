# private-links Specification

## Purpose
Say how many private links (key links, password links, private forms, and live views) can be open at once on one computer and in one chat, and what the agent hears when a link can't open.

## Requirements

### Requirement: One link per chat, several chats at once

Each chat SHALL have its own private-link place, named by its folder. A link from one chat SHALL open while another chat's link is open, and neither SHALL close, replace, or read the other. `wait` and `close` SHALL act only on the calling chat's link, and a finished link SHALL wake only the chat that opened it.

#### Scenario: Two chats

- **WHEN** chat A has a live view open and chat B opens a key link
- **THEN** both links are open, and saving the key wakes only chat B

#### Scenario: Close is per chat

- **WHEN** chat A has a key link open and chat B runs `close` during its `/close`
- **THEN** chat A's key link stays open

### Requirement: Same-chat replacement as before

In one chat, a new key link SHALL replace that chat's earlier key link only when nobody has opened it, and the earlier link's `wait` SHALL report `closed` with `HANDOVER_REPLACED_BY=` naming that same chat. Any other open link in the same chat SHALL block the new one until it closes.

#### Scenario: Unopened key link in the same chat

- **WHEN** a chat's key link is unopened, another chat's unopened key link is also open, and the first chat opens a new key link
- **THEN** the first chat's old link closes and its new one opens, and the other chat's link stays open

### Requirement: One live view on the computer

A live view SHALL NOT open while another live view is open or starting in any chat.

#### Scenario: Second live view

- **WHEN** chat A has a live view open and chat B asks for one
- **THEN** chat B's open fails with a message that names chat A, and chat A's view stays open

#### Scenario: Two views start at once

- **WHEN** chat A is starting a live view and chat B asks for one before chat A's link is ready
- **THEN** chat B's open fails with a message that names chat A

### Requirement: A blocked open names its holder

When a link can't open, the message SHALL name the chat folder that holds the place.

#### Scenario: Same chat busy

- **WHEN** a chat with an open live view asks for a key link
- **THEN** the open fails and the message names that chat

### Requirement: Older links are left alone

A link opened by an older copy of the tool, in the shared place, SHALL keep working until it closes. A new link SHALL NOT read, close, or replace it, except that a live view SHALL still count an older live view as open. `wait` and `close` from a chat with no link of its own SHALL act on the shared place only when its live link's state names that chat by folder or session; they SHALL NOT touch another chat's older link.

#### Scenario: Older form open

- **WHEN** an older chat's form holds the shared place and a new chat opens a key link
- **THEN** the key link opens and the older form stays open

#### Scenario: A chat closes its own older link

- **WHEN** the shared place holds a live link whose state names chat A, and chat A runs `wait` or `close`
- **THEN** `wait` reports that link's result, and `close` closes it and reports `closed`

#### Scenario: Another chat's older link

- **WHEN** the shared place holds a live link whose state names chat A, and chat B, with no link of its own, runs `wait` or `close`
- **THEN** chat B hears that no private link is open, and chat A's link stays open

### Requirement: The finish ignores hidden parts and may name words
A finish that waits for a part of the page to go SHALL count only parts the person can see. A finish MAY name words that show on the page once the site accepts, and is met only when they show.

#### Scenario: A hidden card frame after the card is saved
- **WHEN** the site hides its card frame and shows the saved card's summary
- **THEN** a finish that waits for the card frame to go is met

#### Scenario: Words that never show
- **WHEN** the finish names *Review your order* and the page never shows it
- **THEN** the finish is not met

### Requirement: A live view can stay open until the person closes it

A live view opened to stay open SHALL take no finish, and SHALL end only when the person taps *Hand back* on its page, when the chat closes it, or at its time limit. It SHALL stay open through every page change on the site.

#### Scenario: Several steps in one view

- **WHEN** the person taps through two checkout steps in a view that stays open
- **THEN** the view stays open until the person taps *Hand back*

### Requirement: A click that may not count is reported
When a click reaches the page only through the page's own script, not as a pointer press, the browser tool SHALL say so, so the agent can offer a live view instead of clicking again.

#### Scenario: A script-only click
- **WHEN** the pointer click and the forced click both fail and the script click runs
- **THEN** the click's output says it went through the page's script

### Requirement: The agent checks an unclear payment without seeing the card

After a payment turn that ended without a clear answer, the agent SHALL read the site's page only as text in which every card box is hidden, and SHALL take no picture while a card box still holds a typed value. It SHALL tell the person whether the site accepted, declined, or can't be told, and SHALL never open a new payment turn while the payment may have gone through. It MAY press a site step that pays nothing; a press that pays SHALL be the person's, in a live view, after a pay question that names the purchase.

#### Scenario: The site saved the card and stayed

- **WHEN** the person handed back and the page shows the saved card's last digits and a Continue step
- **THEN** the agent says the site saved the card, may press Continue, and asks before the person places the order

#### Scenario: No answer on the page

- **WHEN** the page shows neither a receipt nor an error
- **THEN** the agent says the payment is not confirmed, looks for the store's receipt in email when the chat has an email tool, and tells the person not to pay again until it is known

### Requirement: PayPal through a live view
When a site offers PayPal, the agent's pay question SHALL offer it beside the card. On a yes that names the purchase, the person SHALL sign in to PayPal and approve in a live view; the agent SHALL type no PayPal password and press no PayPal approval itself.

#### Scenario: A site that takes PayPal
- **WHEN** a checkout offers PayPal and a card
- **THEN** the pay question names both, and picking PayPal sends a live view on the PayPal step
