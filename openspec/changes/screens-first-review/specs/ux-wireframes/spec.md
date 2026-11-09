## MODIFIED Requirements

### Requirement: A bullet carries its whole text and drawing

Each item SHALL carry its bullet's full text, including hard-wrapped lines and a drawing with blank lines inside its fence, and a blank line outside a fence SHALL end the bullet. An item whose text runs past about two lines SHALL show its bold first sentence and the first lines, with the rest behind a *More* control that shows it in place. Each item SHALL be addressable as `#/<n>`.

#### Scenario: A direct link

- **WHEN** the file opens at `review.html#/3`
- **THEN** the page scrolls to item 3

#### Scenario: A long item

- **WHEN** an item's text is six lines long
- **THEN** the card shows its first lines and *More*, and a tap on *More* shows the whole text, and a note on the hidden words still finds them

### Requirement: A drawing opens full screen and zooms

Each drawing SHALL show open in its card's view, with a control that says how many notes and drafts it holds. Two or more drawings in one item SHALL each get a tab, named by the text after the fence's language, or by its kind when there is none. A tap SHALL open the shown drawing full screen, where zoom buttons, a pinch, or a Ctrl or Cmd wheel zoom it and a drag pans it without scrolling the page behind.

#### Scenario: Zoom and pan on a phone

- **WHEN** the reviewer opens a wide drawing full screen, zooms in, and drags
- **THEN** the drawing moves and the page behind does not scroll

#### Scenario: Two flows in one item

- **WHEN** an item holds a `mermaid Today` fence and a `mermaid After` fence
- **THEN** the card shows one view with *Today* and *After* tabs, *After* first

### Requirement: Screen sketches show each state and the change

A change that adds or restructures a screen SHALL show it before and after, each as its own tab, with a control that shows the two side by side, and with each empty, loading, or error state its flow names. The after SHALL be a picture of the plan's prototype; a sketch SHALL stand in only when no prototype can be made, with one plain line saying why. A screen the person can open today SHALL also get a Before screenshot, or one plain line saying why it can not. A sketch SHALL use real words and the app's parts, with a gray bar only for unknown text, in the page's colors; the builder SHALL warn, and still build, about a fill or stroke color that is not one of the kit's named colors.

#### Scenario: A changed screen

- **WHEN** a plan changes an existing screen's layout
- **THEN** its review page shows a screenshot of the screen today and a picture of the prototype, for each state the plan names, and the two side by side on request

#### Scenario: A fixed color

- **WHEN** an `svg` fence paints a box `fill="#ffffff"`
- **THEN** the builder warns with the item and picture that the color will not follow dark mode, and still writes the page
