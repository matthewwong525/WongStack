## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: An older plan keeps its pinned Back

A plan whose page was built before it carried its own *Back* SHALL show *Back* and its workspace pinned above the plan, with the app's bar above them, until its chat rebuilds it.

#### Scenario: Opening an older plan

- **WHEN** the person opens a plan built before this change
- **THEN** *Back* and the workspace sit above the plan and stay there while it scrolls, and nothing hides or slides
