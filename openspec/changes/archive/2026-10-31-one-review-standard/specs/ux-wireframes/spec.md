## MODIFIED Requirements

### Requirement: The page is one scrolling review

The page SHALL be one vertical document in the shared review frame: the change name as its ask and the saved-note count, the Why, the numbered What Changes items as cards, each with its full text, its drawing, and OK and Change, and the Decisions. Each Decision-log bullet SHALL be labeled `asked`, `assumed`, `check`, or `log` by its opening word.

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the page labels them `asked` and `assumed`

#### Scenario: A change is a card

- **WHEN** a plan has three What Changes items
- **THEN** the page shows three numbered cards, each with OK and Change

### Requirement: Screen sketches show each state and the change

A change that adds or restructures a screen SHALL show it before and after, side by side where both fit in 640 pixels, else one above the other, with each empty, loading, or error state its flow names. The after SHALL be a picture of the plan's prototype; a sketch SHALL stand in only when no prototype can be made, with one plain line saying why. A screen the person can open today SHALL also get a Before screenshot, or one plain line saying why it can not. A sketch SHALL use real words and the app's parts, with a gray bar only for unknown text, in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows a screenshot of the screen today beside a picture of the prototype, for each state the plan names

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page

### Requirement: A reviewer notes any item

Each Why paragraph, item, decision, drawing line, and picture SHALL take a note, through a visible Note control or a still click, and a drag, pinch, or tap on a link or control SHALL keep its normal action. Selected words in any text SHALL take a note that quotes them. A note on a picture SHALL anchor to its spot and be named `Change #<n>, picture <k>`. Saved notes SHALL show as numbered pins, listed together grouped by card, persist per page in the browser, and never be written to a repository file. A pin whose text changed SHALL show as possibly moved.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps item 2's Note control on a touch screen
- **THEN** the editor opens for item 2

#### Scenario: A note on a picture

- **WHEN** the reviewer taps item 1's picture full screen and saves a note
- **THEN** the note pins to the spot on the picture, and the copied note starts `Change #1, picture 1` with the picture's words

#### Scenario: A note on selected words

- **WHEN** the reviewer selects "Shop now" in card 2's text and saves *say Get 20% off*
- **THEN** the note lists under card 2 and the copied note quotes "Shop now"

### Requirement: Copied notes name the plan and each place

Copy notes SHALL put a block on the clipboard whose first line is `Notes on the plan <change-name> from the review page. Don't build yet.`, then one line per card marked OK, then one bullet per saved note with its place and a short quote. When the page is not on an open reply link, every note save SHALL copy that block too: before a save the page SHALL say that saving copies all notes, and a failed copy on save SHALL keep the note saved and say to tap Copy notes. The page SHALL word notes as either a question or a change, never assuming a change. After a copy, it SHALL say to paste the notes into chat.

#### Scenario: Two notes copied

- **WHEN** the reviewer copies with two saved notes
- **THEN** the block holds the header line and two bullets, each with a place such as `Change #2`

#### Scenario: Saving copies every note

- **WHEN** the reviewer saves a second note on a page opened from disk
- **THEN** the clipboard holds the header line and both bullets, and the page says it saved and copied 2 notes

#### Scenario: An OK is copied

- **WHEN** the reviewer taps OK on change 1 and copies notes
- **THEN** the block holds `Change #1: OK` under the header line
