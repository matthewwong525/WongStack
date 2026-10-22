# inbox Specification

## Purpose
One inbox in the live app where each person sees and answers the plans, approvals and questions waiting on them, with taps their computer delivers to the chat that made each item.

## Requirements

### Requirement: The inbox lists what waits on the signed-in person

The live app SHALL offer an inbox mini app, behind the company sign-in, that lists the signed-in person's open items in three groups: questions that need them, approvals, and plans to review. It SHALL list only items sent by a computer signed in as that same person, and SHALL never show one person's item to another. The inbox SHALL refresh itself while it is open.

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

No page that collects a password, key, card or other secret SHALL ever become an inbox item, and the inbox SHALL offer no way to enter one.

#### Scenario: A key is needed

- **WHEN** an agent needs an API key while the inbox is on
- **THEN** the key page opens at its own private link, as before, and nothing about it appears in the inbox
