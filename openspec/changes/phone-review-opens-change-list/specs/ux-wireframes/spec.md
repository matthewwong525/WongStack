## MODIFIED Requirements

### Requirement: The What Changes list is the navigation

`review.html` SHALL show a panel with the proposal's `## Why` and a numbered list of its `## What Changes` bullets, and a stage that shows one visual at a time. At desktop width, on open with no fragment or with `#/`, the stage SHALL open the first bullet and select it in the panel; at phone width those same routes SHALL open the What Changes list instead, as "The page works on a phone" defines. It SHALL NOT repeat the full Why and change list in the stage. With no bullets, the stage SHALL show a short empty message. Previous SHALL be disabled at the first bullet, and at phone width with no bullet selected. Choosing a bullet SHALL show its visual with its marked elements highlighted and SHALL mark that bullet as current. A bullet with no anchor SHALL open a text stage that shows the bullet in full and says it has no visual. Two bullets MAY share one visual. The panel SHALL show each bullet's visual kind beside its anchor.

#### Scenario: The file opens

- **WHEN** a reviewer opens `review.html` at desktop width from a clone with no server and no network
- **THEN** the panel shows Why and the numbered What Changes list, the first bullet is current, and the stage shows that bullet's visual or text fallback

#### Scenario: A bullet is chosen

- **WHEN** the reviewer clicks bullet 3, whose anchor is `#/receive-flow/after/new`
- **THEN** the stage shows the `receive-flow` visual in its `after` state with every `new` element highlighted, and bullet 3 is marked current

#### Scenario: A bullet has no visual

- **WHEN** the reviewer clicks a bullet with no anchor
- **THEN** the stage shows that bullet's text and says it has no visual, and the bullet is marked current

#### Scenario: A direct link opens

- **WHEN** the file opens with a valid visual, state, and mark fragment
- **THEN** that target opens instead of the first bullet

#### Scenario: The first bullet has no usable visual

- **WHEN** the file opens at desktop width and the first bullet has no anchor or an invalid anchor
- **THEN** the file opens its text fallback and marks the first bullet as current

#### Scenario: The proposal is empty

- **WHEN** the proposal has no What Changes bullets
- **THEN** the stage shows a short empty message, no repeated proposal, and disabled step controls

#### Scenario: Previous at the first change

- **WHEN** the first change is current
- **THEN** Previous is disabled and the left arrow does not show an overview

### Requirement: The page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show the stage at full width with no horizontal overflow, SHALL offer the What Changes list as a full-screen sheet opened from a button in the chrome and closed by choosing a bullet, SHALL offer previous and next controls that step through the bullets and show the position, SHALL dock the note box to the bottom of the screen with a text field of at least 16px, and SHALL stack a `diff`'s columns. On open with no fragment or with `#/`, the sheet SHALL open over the landing stage with no bullet selected and the position SHALL read the change count; every later arrival at `#/` SHALL open it again, because `#/` means no change is chosen. A fragment that names a visual, a state, or a mark SHALL open that target with the sheet closed. Next with no bullet selected SHALL open the first bullet. The stepping controls SHALL also work at desktop width, with the left and right arrow keys. At phone widths of 320px and above, the collapsed toolbar SHALL use one row no taller than 56px, with Changes, Previous, the position, Next, and Tools. Tools SHALL disclose state selection and note actions, expose its expanded state, and allow those controls to wrap. The long change title and desktop hint SHALL not consume phone toolbar space. Desktop controls SHALL remain exposed.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the stage fills the width, nothing scrolls sideways, and the list is behind a Changes button

#### Scenario: A phone opens on the change list

- **WHEN** a reviewer opens `review.html` at phone width with no fragment
- **THEN** the What Changes sheet is open over the landing stage, no bullet is marked current, the position reads the change count, and Previous is disabled

#### Scenario: A change is chosen from the sheet

- **WHEN** the reviewer taps a bullet in that sheet
- **THEN** the sheet closes and the stage shows that bullet's visual or text fallback, with the bullet marked current

#### Scenario: Back to the change list on a phone

- **WHEN** the reviewer returns to `#/` at phone width after opening a change
- **THEN** the sheet opens again over the landing stage with no bullet selected

#### Scenario: A direct link on a phone

- **WHEN** the file is opened at phone width with a valid visual fragment
- **THEN** that visual opens with the sheet closed

#### Scenario: Stepping through changes

- **WHEN** the reviewer taps next twice from bullet 1
- **THEN** the stage shows bullet 3's visual and the chrome reads `3 / <n>`

#### Scenario: A note on a phone

- **WHEN** annotate mode is on at phone width and the reviewer taps an element
- **THEN** the note box appears docked to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Phone tools open and close

- **WHEN** a reviewer opens Tools on a phone
- **THEN** state selection and note actions are reachable, and the Changes sheet starts below the expanded toolbar
- **AND** closing Tools restores the compact row without changing the selected visual
