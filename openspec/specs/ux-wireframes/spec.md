# ux-wireframes Specification

## Purpose

Every change `/plan` drafts gets one standalone review page, `review.html`: the proposal's Why, its numbered What Changes items with their text drawings, and its decisions, which a reviewer reads on a laptop or a phone, annotates, and pastes back into chat to update the plan. (The capability keeps its name from when it covered wireframes alone.)

## Requirements

### Requirement: Every change carries a standalone review page

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`, committed and archived with the change. The page SHALL load nothing from the network and SHALL work opened from disk. A change that adds or restructures a screen SHALL also keep a `## UX` section in `design.md` that links the page rather than repeating its sketches.

#### Scenario: Opened from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** every section, drawing, zoom, and note control works

#### Scenario: A change with no screen

- **WHEN** `/plan` drafts a worker, CLI, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: The page is one scrolling review

The page SHALL be one vertical document: the change name and saved-note count, the Why, the numbered What Changes items each with its full text and drawing, and the Decisions. Each Decision-log bullet SHALL be labeled `asked`, `assumed`, `check`, or `log` by its opening word.

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the page labels them `asked` and `assumed`

### Requirement: The page is rebuilt from the proposal

The page SHALL be built from the plan skill's fixed kit and the current proposal alone, with no second copy of the proposal text, and `/save` SHALL refresh it. A rebuild SHALL keep saved notes attached, identical inputs SHALL leave the file untouched, and archived pages SHALL never be rebuilt. The kit SHALL reach every repo that installs the plan skill.

#### Scenario: The proposal changes

- **WHEN** What Changes or the Decision log is edited and `/save` runs
- **THEN** the page shows the current text, and notes saved before still show

#### Scenario: An archived page

- **WHEN** the kit changes
- **THEN** archived review pages stay byte-identical

### Requirement: A failed build keeps the last page

The builder SHALL name the item and line of a missing `## Why` or `## What Changes`, an unclosed fence, or a fenced block outside any bullet, and SHALL keep the previous page. A clean build SHALL NOT be reported as proof that a drawing explains its bullet.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item and keeps the previous page

### Requirement: Proposal text never runs as code

The page SHALL escape all proposal text, drawings included, so script-closing text or HTML examples show as written and never execute.

#### Scenario: Markup in a proposal

- **WHEN** a proposal quotes a literal `</script>` tag
- **THEN** the page shows the text intact

### Requirement: A visual is a narrow text drawing

A visual SHALL be a fenced `text` block inside its What Changes bullet, drawn by the planning agent in the same pass with no other agent and no browser. A change SHALL draw one visual by default, plus a sketch of each screen it adds or restructures. The builder SHALL warn about a line wider than 60 columns and still build.

#### Scenario: A wide line

- **WHEN** a drawing has a 72-column line
- **THEN** the builder warns with the item and line and still writes the page

### Requirement: A bullet carries its whole text and drawing

Each item SHALL show its bullet's full text, including hard-wrapped lines and a drawing with blank lines inside its fence, and a blank line outside a fence SHALL end the bullet. Each item SHALL be addressable as `#/<n>`.

#### Scenario: A direct link

- **WHEN** the file opens at `review.html#/3`
- **THEN** the page scrolls to item 3

### Requirement: A drawing opens full screen and zooms

Each drawing SHALL start folded under its item, behind a control that says how many notes and drafts it holds, and SHALL open fitted to the item's full width. A tap SHALL open it full screen, where zoom buttons, a pinch, or a Ctrl or Cmd wheel zoom it and a drag pans it without scrolling the page behind.

#### Scenario: Zoom and pan on a phone

- **WHEN** the reviewer opens a wide drawing full screen, zooms in, and drags
- **THEN** the drawing moves and the page behind does not scroll

### Requirement: A reviewer notes any item

Each Why paragraph, item, decision, and drawing line SHALL take a note, through a visible Note control or a still click, and a drag, pinch, or tap on a link or control SHALL keep its normal action. Saved notes SHALL show as numbered pins, persist per change in the browser, and never be written to a repository file. A pin whose text changed SHALL show as possibly moved.

#### Scenario: Tap Note on a phone

- **WHEN** the reviewer taps item 2's Note control on a touch screen
- **THEN** the editor opens for item 2

### Requirement: Copied notes name the plan and each place

Copy notes, and every note save, SHALL put a block on the clipboard whose first line is `Update the plan <change-name> with these notes from the review page. Don't build yet.`, then one bullet per saved note with its place and a short quote. Before a save, the page SHALL say that saving copies all notes; after a copy, it SHALL say to paste the notes into chat. A failed copy on save SHALL keep the note saved and say to tap Copy notes.

#### Scenario: Two notes copied

- **WHEN** the reviewer copies with two saved notes
- **THEN** the block holds the header line and two bullets, each with a place such as `Change #2`

#### Scenario: Saving copies every note

- **WHEN** the reviewer saves a second note
- **THEN** the clipboard holds the header line and both bullets, and the page says it saved and copied 2 notes

### Requirement: Unfinished notes stay drafts

Unsaved note text SHALL stay a draft on its target, marked Draft, through scrolling, zooming, and starting another note, and SHALL survive a reload when storage allows. Copy SHALL include saved notes only, and a draft whose target moved SHALL never attach to another element.

#### Scenario: Storage is refused

- **WHEN** the browser refuses storage
- **THEN** drafts work for the session and the note controls say they will not survive a reload

### Requirement: The page never fails blank

The page SHALL render when storage or history is refused, and SHALL show a script error with its line in place of a blank page. Its script SHALL run in older embedded browsers.

#### Scenario: A script error

- **WHEN** a statement in the kit throws at load
- **THEN** the page shows the message and line

### Requirement: Every control works by keyboard, touch, and phone

Every control SHALL work by keyboard and touch with visible labels and focus, and closing an editor or view SHALL return focus to what opened it. From 320px wide the page SHALL never scroll sideways, and the note editor SHALL dock on screen with Save and Discard above the keyboard.

#### Scenario: Keyboard review

- **WHEN** a reviewer tabs to item 3, presses Enter, adds a note, and closes the editor
- **THEN** each step is reachable and focus returns to item 3

#### Scenario: Little room above the keyboard

- **WHEN** the visible screen is 260px tall while the reviewer edits a note
- **THEN** the whole editor, with Save and Discard, is on screen

### Requirement: Pasted notes update the plan and stop

Pasted notes SHALL update that change's artifacts with no question round, log what each note changed or why it was declined, rebuild the page, and end with the plan's link and whether to build now. They SHALL build nothing, and SHALL change nothing when the change is not in this checkout.

#### Scenario: Notes pasted

- **WHEN** a reviewer pastes copied notes for a change
- **THEN** the proposal, design, specs, and tasks reflect them, and no task is implemented

#### Scenario: The change is not here

- **WHEN** the change is not in the current checkout
- **THEN** the reply says so, and nothing changes

### Requirement: The PR body links the review page

The PR body `/save` writes SHALL carry a `## Review` section linking the change's `review.html` when it exists, and none when it does not.

#### Scenario: A change with a page

- **WHEN** `/save` writes the PR body for a change with `review.html`
- **THEN** its `## Review` link resolves to the file on the branch

### Requirement: The builder flags a technical summary

The builder SHALL warn when Why and What Changes together hold more than 12 code spans, naming the count, and SHALL still write the page.

#### Scenario: A summary full of file names

- **WHEN** a proposal's Why and What Changes hold 38 code spans
- **THEN** the builder warns with the count and writes the page

#### Scenario: A plain summary

- **WHEN** they hold 12 or fewer
- **THEN** the builder prints no such warning
