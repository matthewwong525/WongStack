## MODIFIED Requirements

### Requirement: A bullet carries its whole text and drawing

Each item SHALL carry its bullet's full text, including hard-wrapped lines and a drawing with blank lines inside its fence, and a blank line outside a fence SHALL end the bullet. On a screen narrower than 900 pixels, an item whose text runs past about two lines SHALL show its bold first sentence and the first lines, with a *More* control at the end of those lines that shows the rest in place; on a screen 900 pixels or wider, the whole text SHALL show, with no *More*. Each item SHALL be addressable as `#/<n>`.

#### Scenario: A direct link

- **WHEN** the file opens at `review.html#/3`
- **THEN** the page scrolls to item 3

#### Scenario: A long item

- **WHEN** an item's text is six lines long on a 390 pixel wide screen
- **THEN** the card shows its first lines ending in *More*, a tap on *More* shows the whole text ending in *Less*, and a note on the hidden words still finds them

#### Scenario: The same item on a computer

- **WHEN** the same item opens at 1280 pixels wide
- **THEN** the card shows all six lines and no *More*

### Requirement: A drawing opens full screen and zooms

Each drawing SHALL show in its card beside the card's other pictures, labelled by the text after the fence's language, or by its kind when there is none, with a control that says how many notes and drafts it holds. A click or tap on it SHALL open it full screen, where zoom buttons, a pinch, or a Ctrl or Cmd wheel zoom it and a drag pans it without scrolling the page behind. A background tap in full screen SHALL NOT close it.

#### Scenario: Zoom and pan on a phone

- **WHEN** the reviewer opens a wide drawing full screen, zooms in, and drags
- **THEN** the drawing moves and the page behind does not scroll

#### Scenario: Two flows in one item

- **WHEN** an item holds a `mermaid Today` fence and a `mermaid After` fence
- **THEN** the card shows *Today* and *After* side by side, each labelled, and a click on *After* opens it full screen with both labels above it

### Requirement: A reviewer notes any item

Each Why paragraph, item, decision, drawing line, and picture SHALL take a note, through a visible Note control or a still click, and a drag, pinch, or tap on a link or control SHALL keep its normal action. Selected words in any text SHALL take a note that quotes them. A tap on a picture, drawing, ad, or page full screen SHALL place a note on that spot, named `Change #<n>, picture <k>`; a clickable sample SHALL keep its own taps and take notes through *Note*. Saved notes SHALL show as numbered pins on the spot, full screen and on the card's picture, listed together grouped by card, persist per page in the browser, and never be written to a repository file. A pin whose text changed SHALL show as possibly moved.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps item 2's Note control on a touch screen
- **THEN** the editor opens for item 2

#### Scenario: A note on a picture

- **WHEN** the reviewer opens item 1's *After* picture full screen, taps a spot, and saves a note
- **THEN** the note pins to the spot full screen and on the card's picture, and the copied note starts `Change #1, picture 1` with the picture's words

#### Scenario: A note on selected words

- **WHEN** the reviewer selects "Shop now" in card 2's text and saves *say Get 20% off*
- **THEN** the note lists under card 2 and the copied note quotes "Shop now"

### Requirement: Screen sketches show each state and the change

A change that adds or restructures a screen SHALL show it before and after, each as its own labelled picture side by side in the card, with each empty, loading, or error state its flow names. The after SHALL be a picture of the plan's prototype; a sketch SHALL stand in only when no prototype can be made, with one plain line saying why. A screen the person can open today SHALL also get a Before screenshot, or one plain line saying why it can not. A sketch SHALL use real words and the app's parts, with a gray bar only for unknown text, in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows a screenshot of the screen today and a picture of the prototype, for each state the plan names, side by side

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page
