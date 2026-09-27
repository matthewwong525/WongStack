## MODIFIED Requirements

### Requirement: Review controls support keyboard and touch

Jump links, Note buttons, drawing folds, the full-screen view and its zoom controls, note actions, and draft actions SHALL be reachable by keyboard and touch, with visible labels and focus. Enter or Space on a focused item, visual line, or decision SHALL show its "Add note" option. Closing an editor SHALL return focus to its target. Escape SHALL close the full-screen view and return focus to the control that opened it. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer tabs to item 3, presses Enter, adds a note, and closes the editor
- **THEN** each control is reachable, focus is visible, and focus returns to item 3

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the page does not jump to another item

#### Scenario: Leave the full-screen view by keyboard

- **WHEN** a reviewer opens a drawing full screen and presses Escape
- **THEN** the view closes and focus returns to the control that opened it

### Requirement: A visual can be panned and zoomed

Each visual SHALL start folded under its item's text, behind a labeled control that opens it and states how many notes and drafts sit on its lines. Opened, the visual SHALL span the full width of its item and be fitted to that width, so the whole drawing shows. On the page, a drag over it SHALL scroll the page, and it SHALL have no zoom controls. A tap or click on it, or its labeled full-screen control, SHALL open a full-screen view of that drawing. The full-screen view SHALL open fitted to the screen width, which MAY be larger than on the page. Zoom-in, zoom-out, and Fit buttons, a pinch, and a Ctrl or Cmd wheel SHALL change its zoom within fixed bounds. When the zoomed drawing is larger than the view, a drag SHALL move it using the browser's native scrolling, and the page behind SHALL NOT scroll. Closing the view SHALL return the drawing to its item. A frame SHALL NOT make the page scroll sideways.

#### Scenario: A drawing starts folded

- **WHEN** a reviewer opens a page with a drawing in item 3
- **THEN** item 3 shows its text and a closed control to show the drawing
- **AND** opening it shows the whole drawing fitted across the item's full width

#### Scenario: A wide drawing on a phone

- **WHEN** a reviewer opens an item whose drawing is wider than the screen
- **THEN** the drawing shows whole, fitted to its frame

#### Scenario: Zoom in and pan

- **WHEN** the reviewer taps the opened drawing, zooms in, and drags inside the view
- **THEN** the drawing fills the screen, grows, and the drag moves it by native scrolling
- **AND** the page behind does not scroll

#### Scenario: Back to fit

- **WHEN** the reviewer presses Fit in the full-screen view, then closes it
- **THEN** the whole drawing shows again, and back on the page it is fitted in its item and a drag scrolls the page

#### Scenario: A folded drawing holds a note

- **WHEN** a drawing line has a saved note and the drawing is folded
- **THEN** its fold control says it holds one note

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. Each Why paragraph, item text, and decision SHALL show a visible Note control while it has no note or draft; a tap or click on it SHALL open the note editor for that element. Once the element has a note or draft, its numbered pin or Draft pin SHALL take the Note control's place and open the editor. A mouse click without movement on that text, or a tap or click without movement on a line of a visual in the full-screen view, SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A touch tap on text outside a control SHALL NOT show the option. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/why`, `#/<n>`, or `#/decisions/<n>`. A pin whose element no longer matches its saved label SHALL be shown as possibly moved. The Note control SHALL NOT be part of an element's label.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps the Note control of item 2 on a touch screen
- **THEN** the editor opens for item 2 with no second tap

#### Scenario: Tap an item

- **WHEN** the reviewer clicks the text of item 2 without moving
- **THEN** an "Add note" option appears at that text
- **AND** choosing it opens the editor for item 2

#### Scenario: Tap text on a phone

- **WHEN** the reviewer taps the text of item 2 on a touch screen
- **THEN** no "Add note" option appears and nothing else changes

#### Scenario: Scroll across an item

- **WHEN** the reviewer drags across item 2 to scroll
- **THEN** the page scrolls and no "Add note" option appears

#### Scenario: Note a drawing line

- **WHEN** the reviewer opens a drawing full screen, taps line 3, and chooses "Add note"
- **THEN** the full-screen view closes and the editor opens for that drawing line

#### Scenario: Use a zoom control

- **WHEN** the reviewer opens or folds a drawing, or taps a full-screen zoom button
- **THEN** that control acts and no "Add note" option appears

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

### Requirement: The scrolling page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show its content at full width with no horizontal page overflow. Visuals SHALL fit their frames and zoom as defined above. The note editor SHALL dock at the bottom of the visible screen with a text field of at least 16px. The docked editor SHALL stay within the visible screen: its top SHALL NOT rise above the visible top, however little height the keyboard leaves, and its location line SHALL take one line. A bar with the saved-note count and Copy notes SHALL stay reachable while the reviewer scrolls. Text, long tokens, visuals, and note controls SHALL fit from 320px upward. With the editor and the keyboard open, the reviewer SHALL still be able to scroll to the relevant content and reach Save and Discard.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the content fills the width, nothing scrolls sideways, and Copy notes is reachable

#### Scenario: A note on a phone

- **WHEN** the reviewer taps an element's Note control at phone width
- **THEN** the editor docks to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Little room above the keyboard

- **WHEN** the visible screen is only 260px tall while the reviewer edits a note
- **THEN** the whole editor, including its location line, Save, and Discard, is inside the visible screen

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and Discard remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

### Requirement: Each item's text and visual stay together

New review pages SHALL use normal vertical scrolling. Each item's number, text, and visual SHALL stay together in one group; the visual SHALL follow the text and span the item's full width rather than the text column. A token too wide for its column — a path, an identifier, a URL — SHALL wrap in text rather than be clipped or hidden, at every width. A visual SHALL never widen the page. Short content SHALL NOT require an artificial screen-height blank area.

#### Scenario: A bullet names a long path

- **WHEN** a What Changes item contains a path wider than its column
- **THEN** the path wraps onto the next line and every character stays readable

#### Scenario: A short item

- **WHEN** a reviewer reads a short item with a small drawing
- **THEN** its text and drawing stay adjacent with no reserved blank area below

#### Scenario: A drawing uses the item's width

- **WHEN** a reviewer opens an item's drawing
- **THEN** the drawing's frame is as wide as the item, not indented under the item number
