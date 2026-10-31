# inbox Specification

## Purpose
One inbox in the live app that opens on the person's week board, where they mark, move and delete their tasks, and where a plan's link still opens its page.

## Requirements

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

#### Scenario: A section link on the page

- **WHEN** the person taps *Changes* at the top of a plan in the inbox
- **THEN** the plan scrolls to its list of changes and stays in the frame

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

A plan item SHALL close once a tap on it, notes or an action, reaches its chat, when its link's time runs out, or when its chat closes. A plan whose tap did not arrive SHALL stay open. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave the list. A plan the chat updates and opens again SHALL come back as a new item.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox

#### Scenario: Notes on a plan arrived

- **WHEN** the person sends notes on a plan and the chat gets them
- **THEN** the plan leaves the inbox, and its updated version shows under *Needs you* once the chat opens it again

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

### Requirement: A plan fills the screen

A plan opened in the inbox SHALL fill the screen below the app's bar, edge to edge and down to the bottom, with no border or corners of its own, and the page around it SHALL NOT scroll. The plan's own bar SHALL sit on the screen's bottom edge, and its notes and full-screen drawings SHALL work as on the page opened on its own. The app's bar SHALL stay at the top while the person reads, never hiding or sliding back, and the plan SHALL keep its size as they scroll. *Back* and the plan's workspace SHALL sit at the top of the plan's own page and scroll away with it. A plan whose page has no *Back* of its own SHALL show *Back* pinned above it.

#### Scenario: Opening a plan

- **WHEN** the person opens a plan from the inbox on a phone or a wide screen
- **THEN** the plan spans the window's full width and reaches its bottom, its *Send notes* bar sits on the bottom edge, and only the plan scrolls

#### Scenario: A tap waiting

- **WHEN** a plan shows the line about a sent tap above it
- **THEN** the plan still reaches the bottom of the screen without the page scrolling

#### Scenario: Reading down a plan

- **WHEN** the person scrolls down a plan on a phone, then scrolls back up partway
- **THEN** the app's bar stays at the top the whole time, *Back* and the workspace scroll up and away with the plan's words, and the plan never moves or changes size on its own

#### Scenario: Back at the top

- **WHEN** the person scrolls a plan back to its top and taps *Back*
- **THEN** *Back* and the workspace show above the plan's title, and the tap opens the week board

### Requirement: The inbox opens on the person's week

The inbox mini app SHALL open on the signed-in person's week board, where they tick, move, drag, delete and add tasks. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo opens the inbox
- **THEN** Jo sees this week's days with their tasks, and the backlog

#### Scenario: A plan's link

- **WHEN** Jo opens a plan's link from a chat
- **THEN** the plan opens in the inbox as before

### Requirement: An older plan keeps its pinned Back

A plan whose page was built before it carried its own *Back* SHALL show *Back* and its workspace pinned above the plan, with the app's bar above them, until its chat rebuilds it.

#### Scenario: Opening an older plan

- **WHEN** the person opens a plan built before this change
- **THEN** *Back* and the workspace sit above the plan and stay there while it scrolls, and nothing hides or slides
