# inbox Specification

## Purpose
One inbox in the live app where each person sees and answers the plans, approvals and questions waiting on them, with taps their computer delivers to the chat that made each item.

## Requirements

### Requirement: The inbox lists what waits on the signed-in person

The live app SHALL offer an inbox mini app, behind the company sign-in, that lists the signed-in person's open items in three groups: what needs them (questions, and the private links and forms waiting on them), approvals, and plans to review. It SHALL list only items sent by a computer signed in as that same person, and SHALL never show one person's item to another. The inbox SHALL refresh itself while it is open.

#### Scenario: Two people on one team

- **WHEN** Sam's computer sends a plan and Jo opens the inbox
- **THEN** Jo does not see Sam's plan, and Sam sees it under *Plans to review*

#### Scenario: Nothing is waiting

- **WHEN** the person opens the inbox with no open items
- **THEN** it says nothing is waiting and how items arrive, not a blank page

### Requirement: A plan opens inside the inbox without reaching the app

A plan item SHALL show the same review page the plan's file holds, with its notes and its actions. The page SHALL run sealed from the app: it SHALL be unable to read the person's sign-in, call the app, or change anything but its own notes and the actions its item offers.

#### Scenario: The person reviews a plan

- **WHEN** the person opens a plan item and taps *Build it*
- **THEN** the build request is queued for that plan's chat, carrying the version of the page they saw

#### Scenario: The page tries to reach the app

- **WHEN** a script on a plan's page tries to call the app or read its cookies
- **THEN** the call fails and nothing in the app changes

#### Scenario: A link on the page

- **WHEN** the person taps a link in a plan's page
- **THEN** it opens in a new tab, and the frame keeps the plan; a page that later loads in the frame can't tap or read notes

### Requirement: A tap is sent only once its chat has it

A tap on an item SHALL wait in the app until the person's computer delivers it to the chat that made the item. The inbox SHALL show *Sent* only after the computer reports the chat received it, and SHALL say when delivery failed or the page changed since the person loaded it. Each action SHALL be delivered at most once per version of its item.

#### Scenario: Delivered

- **WHEN** the person taps *Approve* and the computer wakes the daily chat with it
- **THEN** the inbox marks the tap *Sent*

#### Scenario: The chat is gone

- **WHEN** the computer can't reach the chat that made the item
- **THEN** the inbox says the answer did not arrive, keeps the person's text to copy, and never shows *Sent*

### Requirement: A tap waits while the computer is away, and can be taken back

When the person's computer has not checked in recently, the inbox SHALL say it is offline. A tap made then SHALL show as waiting and SHALL offer *Cancel* until the computer takes it. A waiting tap SHALL never be delivered once its item has closed or the tap was cancelled. A taken tap SHALL be delivered at most once: one whose result doesn't come back in time SHALL show as not arrived and SHALL never be handed out again.

#### Scenario: Cancelled before the computer returns

- **WHEN** the computer is offline, the person taps *Build and publish*, then *Cancel*, and the computer comes back
- **THEN** nothing reaches the chat

#### Scenario: The computer took it and went quiet

- **WHEN** the computer takes a tap and its result never comes back
- **THEN** after 2 minutes the inbox says the answer did not arrive, and the tap is never delivered again

#### Scenario: The item closed while waiting

- **WHEN** a plan's 24 hours run out before the computer picks up a waiting tap
- **THEN** the tap is never delivered and the inbox says so

### Requirement: Items close on their own

A plan item SHALL close when its link's time runs out or its chat closes. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave the list.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox

### Requirement: The inbox never holds a secret

No page that collects a password, key, card or other secret, and no form other than a plan, SHALL ever be shown inside the inbox, and the inbox SHALL offer no way to enter a secret. Such a page MAY be listed as a link item holding only its title, its kind, its closing time and its address. *Open* SHALL take the person to the page's own private link in a new tab, sending the inbox's address nowhere. A link item SHALL take no taps and SHALL leave the list once its link ends.

#### Scenario: A key is needed

- **WHEN** an agent needs an API key while the inbox is on
- **THEN** the key page opens at its own private link, the inbox lists it with *Open*, and the key never reaches the app

#### Scenario: The link finished

- **WHEN** the person saves the key on the private link
- **THEN** the key's row leaves the inbox

### Requirement: A plan follows the app's light or dark look

A plan opened in the inbox SHALL show the app's light or dark look and SHALL offer one switch for it, the app's own. Switching SHALL change the plan's page too, without reloading it or losing its notes. The same review page opened outside the inbox SHALL keep its own switch.

#### Scenario: Dark mode on a plan

- **WHEN** the person has the app in dark mode and opens a plan, then switches to light
- **THEN** the plan opens dark with no second switch, and turns light in place with its notes kept

#### Scenario: The page opened on its own

- **WHEN** the person opens the same review page from its private link
- **THEN** it shows its own light and dark switch, as before

### Requirement: A decision takes a choice or the person's own words

Each question and approval SHALL offer its choices and one box for the person's own answer, and no separate note. On a pick-one decision, typing in the box SHALL replace any picked choice, and the person's words SHALL be sent as the whole answer. A question MAY allow several choices; then each choice SHALL be a box to tick, typing SHALL untick nothing, and the ticked choices and the person's words SHALL be sent together.

#### Scenario: Typing instead of picking

- **WHEN** the person picks *Acme*, then types *ask Boxco for a second quote first* and sends
- **THEN** the agent receives only *ask Boxco for a second quote first*

#### Scenario: Ticking several and typing

- **WHEN** a question allows several choices, and the person ticks *Acme* and *Boxco*, then types *and check Crateco*
- **THEN** the agent receives *Acme*, *Boxco* and *and check Crateco* together

#### Scenario: Typed words on an approval

- **WHEN** the person types *only to Kim, not the whole list* on an approval
- **THEN** the chief receives those words as the answer, not as *Approve*

### Requirement: Links in a decision open

A web address in a question or one of its choices SHALL show as a link that opens in a new tab, and tapping it SHALL not pick that choice. Only `http` and `https` addresses SHALL become links.

#### Scenario: A quote's address in an approval

- **WHEN** an approval reads *Use this quote? https://acme.example/q/42* and the person taps the address
- **THEN** the quote opens in a new tab and nothing is picked
