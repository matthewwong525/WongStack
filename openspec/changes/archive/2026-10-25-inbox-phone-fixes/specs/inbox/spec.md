## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: A plan fills the screen

A plan opened in the inbox SHALL fill the screen below its top row, edge to edge and down to the bottom, with no border or corners of its own, and the page around it SHALL NOT scroll. The plan's own bar SHALL sit on the screen's bottom edge, and its notes and full-screen drawings SHALL work as on the page opened on its own. While the person scrolls down a plan, the app's bar and the plan's top row SHALL hide and the plan SHALL fill the whole screen; scrolling up, or reaching the plan's top, SHALL bring them back.

#### Scenario: Opening a plan

- **WHEN** the person opens a plan from the inbox on a phone or a wide screen
- **THEN** the plan spans the window's full width and reaches its bottom, its *Send notes* bar sits on the bottom edge, and only the plan scrolls

#### Scenario: A tap waiting

- **WHEN** a plan shows the line about a sent tap above it
- **THEN** the plan still reaches the bottom of the screen without the page scrolling

#### Scenario: Reading down a plan

- **WHEN** the person scrolls down a plan on a phone, then scrolls back up
- **THEN** the app's bar and *Back* hide while they read down, with the plan's bar still on the bottom edge, and return when they scroll up
