## MODIFIED Requirements

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
