## MODIFIED Requirements

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

## ADDED Requirements

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
