# inbox Specification

## Purpose
One inbox in the live app where each person sees and answers the plans, approvals and questions waiting on them, with taps their computer delivers to the chat that made each item.

## Requirements

### Requirement: The inbox lists what waits on the signed-in person

The live app SHALL offer an inbox mini app, behind the company sign-in, that lists the signed-in person's agents, one card each, in three groups: *Needs you*, for an agent with anything waiting on the person's answer; *Working*, for an agent that is working with nothing waiting; and *Done*, for an agent whose proof was checked. Every open item SHALL show inside the card of the agent or chat that sent it, and an item from a chat nothing watches SHALL get a card of its own under that chat's name. It SHALL list only items sent by a computer signed in as that same person, and SHALL never show one person's item to another. The inbox SHALL refresh itself while it is open.

#### Scenario: Two people on one team

- **WHEN** Sam's computer sends a plan and Jo opens the inbox
- **THEN** Jo does not see Sam's plan, and Sam sees it inside its agent's card under *Needs you*

#### Scenario: Nothing is waiting

- **WHEN** the person opens the inbox with no open items
- **THEN** it says nothing is waiting and how items arrive, not a blank page

#### Scenario: An agent asks, then goes back to work

- **WHEN** a working agent asks the person a question, and the person answers it
- **THEN** its card moves to *Needs you* with the question inside, then back to *Working* once the answer reaches it

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

### Requirement: A morning plan card takes Go or Not today

An agent's morning plan SHALL show in its card under *Needs you*: what it will do, what it needs from the person, what it will ask first, its questions with room for the person's own answer, *Go* or *Not today*, and a note for the agent. Every plan card SHALL start on *Go*. A card whose agent is still planning, or has no plan, SHALL say so and still take *Go* or *Not today*. The inbox SHALL show no hours count. The one send button SHALL send every plan card's choice, note and answers with the person's other answers, one tap per card, delivered by the same rules as any other tap. A plan and its questions SHALL show as plain text, never as a page or a script.

#### Scenario: Starting the day

- **WHEN** the person sets one plan card to *Not today*, answers another card's question, and taps the send button
- **THEN** a tap for each plan card waits for the daily chat, and each shows *Sent* once the chat has it

#### Scenario: A plan with markup

- **WHEN** an agent's plan holds HTML or a script tag
- **THEN** the card shows those characters as text and nothing runs

### Requirement: A working agent shows where it stands

A *Working* card SHALL show the agent's latest step in one line and the chief's last action on it, as the person's computer last reported them. A *Done* card SHALL show the proof the chief checked. When the computer is offline, the cards SHALL keep the last report and the inbox SHALL say the computer is offline. *Done* cards SHALL clear when the next day's watch starts.

#### Scenario: An agent finishes

- **WHEN** the chief checks a landing-page agent's proof and reports it done
- **THEN** its card moves to *Done* with a link to the page

### Requirement: A plan fills the screen

A plan opened in the inbox SHALL fill the screen below its top row, edge to edge and down to the bottom, with no border or corners of its own, and the page around it SHALL NOT scroll. The plan's own bar SHALL sit on the screen's bottom edge, and its notes and full-screen drawings SHALL work as on the page opened on its own. While the person scrolls down a plan, the app's bar and the plan's top row SHALL hide and the plan SHALL fill the whole screen. Scrolling up SHALL bring back only the app's bar, laid over the plan so the plan does not move; the top row SHALL return only when the plan reaches its top. A plan whose page does not say when it is at its top SHALL bring both back on scroll up.

#### Scenario: Opening a plan

- **WHEN** the person opens a plan from the inbox on a phone or a wide screen
- **THEN** the plan spans the window's full width and reaches its bottom, its *Send notes* bar sits on the bottom edge, and only the plan scrolls

#### Scenario: A tap waiting

- **WHEN** a plan shows the line about a sent tap above it
- **THEN** the plan still reaches the bottom of the screen without the page scrolling

#### Scenario: Reading down a plan

- **WHEN** the person scrolls down a plan on a phone, then scrolls back up partway
- **THEN** the app's bar and *Back* hide while they read down, with the plan's bar still on the bottom edge; on the way up only the app's bar returns, over the plan, which stays where it was

#### Scenario: Back at the top

- **WHEN** the person scrolls a plan back to its top
- **THEN** the app's bar and *Back* show above the plan, as when it opened

### Requirement: An item opened by its own link shows its card

An item opened by its own link SHALL show the same card the inbox list shows for it, never its raw body. A question or approval SHALL offer its choices, the box for the person's own answer and *Send*, and SHALL be answered as it is from the list. A plan SHALL still open as its review page.

#### Scenario: A question from the daily's link

- **WHEN** the person opens a question's link whose words carry two paragraphs and three options
- **THEN** they see the question with both paragraphs, three answer buttons and *Or type your own answer*, with no braces, quote marks or `\n` shown

#### Scenario: The item closed first

- **WHEN** the person opens a question's link after its answer already reached the chat
- **THEN** the page says it has closed and offers *Back*

### Requirement: A decision's choices fit a phone

Each choice on a question or approval SHALL wrap onto as many lines as its words need and SHALL stay inside its card and the screen, at any width from a 390 px phone up.

#### Scenario: A long option on a phone

- **WHEN** a question offers an option of about 200 characters and the person views it on a screen 390 px wide
- **THEN** the option's button wraps onto several lines inside the card, and the page does not scroll sideways
