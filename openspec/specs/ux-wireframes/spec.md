# ux-wireframes Specification

## Purpose

The review stage of `/plan` gives every change one self-contained HTML review page — `review.html`, one scrolling document with the proposal's Why, its What Changes items with their text drawings, and its decisions labeled asked or assumed — that a reviewer opens on a laptop or a phone, reads, zooms into, annotates by tapping an item, and copies notes from back into `/continue`. It is committed with the change and archived with it. (The capability keeps its `ux-wireframes` name from when it covered wireframes alone.)
## Requirements
### Requirement: A UI-bearing change carries one wireframe file

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. A change that adds or restructures a user-facing screen SHALL sketch that screen as a low-fidelity text drawing in the bullet that owns it, and SHALL keep a `## UX` section in `design.md`. A UI-less change SHALL have no `## UX` section and SHALL still have the file.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `review.html` exists when the plan is apply-ready and shows a text sketch of that screen in its item
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server running and no network
- **THEN** every section and visual renders and the zoom and note controls work

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why, What Changes, and Decision log, and SHALL render paragraphs, lists, bold, inline code, links, and text visuals. Plan and save SHALL use one shared refresh implementation. A missing or invalid input SHALL be reported as an error, and the last output SHALL be kept. A change without a page SHALL be reported and left untouched. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page shows the proposal's current Why, What Changes, and Decisions

#### Scenario: A decision is appended

- **WHEN** save appends a Decision-log bullet
- **THEN** the refreshed page lists it in Decisions

#### Scenario: A current-format refresh fails

- **WHEN** the proposal is missing or has no `## What Changes` section
- **THEN** refresh keeps the last output and reports the failure

#### Scenario: No file or no markers

- **WHEN** save runs for a change without a page
- **THEN** the page is not created, and the checkpoint reports the limitation and proceeds

### Requirement: The copied block is a `/continue` instruction

When continue receives an instruction beginning with `Review notes from review.html`, it SHALL reconcile those notes into the affected existing artifacts using CLI-provided paths before implementation. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL NOT depend on a generated update skill.

#### Scenario: A review block is pasted

- **WHEN** a reviewer runs continue for a change with a copied review block
- **THEN** the affected proposal (including its visuals), design, specs, and tasks are reconciled before implementation resumes
- **AND** the Decision log records the disposition and the review shows the accepted changes

### Requirement: The file cannot fail silently

The kit SHALL execute no statement at load time that can throw before the first render on `file://`; storage and history access SHALL be guarded with fallbacks. A script error SHALL be written into the panel with its line number. The script SHALL parse in an older embedded engine, using no optional chaining or optional catch binding.

#### Scenario: Storage is refused

- **WHEN** the browser refuses localStorage on `file://`
- **THEN** the file renders, notes work until reload, and no error is shown

#### Scenario: A script error

- **WHEN** a statement in the kit throws at load
- **THEN** the panel shows the message and line instead of a blank stage

### Requirement: A release check reads the planning config

The repository SHALL carry a release check that confirms the OpenSpec CLI can read `openspec/config.yaml`, and it SHALL fail when the CLI reports that it could not. The payload release ritual SHALL name it alongside the link check.

#### Scenario: The config cannot be parsed

- **WHEN** `openspec/config.yaml` contains a line the CLI cannot parse
- **THEN** the check fails and names the file
- **AND** the release does not pass on that state

#### Scenario: The config is readable

- **WHEN** the file parses
- **THEN** the check passes and says so

### Requirement: Unfinished feedback remains a draft

The page SHALL keep unfinished note text separate from saved notes and attached to its target. Scrolling, zooming, closing the editor, or starting a note on another target SHALL retain nonempty drafts. The target and the notes list SHALL show an actionable Draft indicator. Save SHALL commit the draft as a note and remove its draft status. Discard SHALL remove only the draft. Copy notes SHALL include saved notes only, in the existing copy format. Editing a saved note SHALL keep its saved content until the reviewer saves the edit. Empty drafts SHALL NOT appear as notes or drafts.

Drafts SHALL persist across reloads in the same browser when storage is available. If storage is unavailable, they SHALL stay usable during the session and the note controls SHALL state that they are session-only. A draft whose target no longer resolves SHALL stay accessible with a moved-target indication and SHALL NOT attach to another target. Notes and drafts SHALL NOT be written to repository files.

#### Scenario: Leave an unfinished note

- **WHEN** a reviewer types a note on item 2 and starts a note on item 4 without saving
- **THEN** item 2 shows a Draft indicator and its text is kept
- **AND** typing in the second editor does not change the first draft

#### Scenario: Change state or target

- **WHEN** a reviewer types a draft, zooms a visual, and starts a note on another target
- **THEN** the first draft remains available on its original target

#### Scenario: Copy with saved notes and drafts

- **WHEN** a reviewer copies with two saved notes and one draft
- **THEN** the copied count is two and only the saved notes are included

#### Scenario: Copy an unsaved edit

- **WHEN** a reviewer changes the text of a saved note but copies before saving that edit
- **THEN** the copy contains the previously saved text
- **AND** the unsaved edit remains a draft

#### Scenario: Save a draft

- **WHEN** a reviewer saves a draft
- **THEN** it becomes a saved note and its Draft indicator clears

#### Scenario: Discard an edit

- **WHEN** a reviewer discards a draft edit to an existing note
- **THEN** the draft clears and the saved note remains unchanged

#### Scenario: Reload with a draft

- **WHEN** browser storage is available and the reviewer reloads after typing an unfinished note
- **THEN** its text and target are recoverable from the draft list

#### Scenario: A draft target changes

- **WHEN** a page refresh changes or removes the target of a retained draft
- **THEN** the draft text stays accessible with a moved-target indication
- **AND** it is not shown as a note on a different element

#### Scenario: Storage is refused while drafting

- **WHEN** storage access fails and the reviewer writes a draft
- **THEN** the draft stays available during that session and the page still renders
- **AND** the note controls say the draft can not survive a reload

### Requirement: Review controls support keyboard and touch

Jump links, zoom controls, note actions, and draft actions SHALL be reachable by keyboard and touch, with visible labels and focus. Enter or Space on a focused item, visual, or decision SHALL show its "Add note" option. Closing an editor SHALL return focus to its target. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer tabs to item 3, presses Enter, adds a note, and closes the editor
- **THEN** each control is reachable, focus is visible, and focus returns to item 3

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the page does not jump to another item

### Requirement: The revised kit applies to newly created pages

Newly assembled pages SHALL use the current kit. A page of an older format SHALL keep its embedded viewer and receive a proposal-only refresh, and any visual input file beside it SHALL be left in place and unused. Archived pages SHALL NOT be rebuilt.

#### Scenario: A new review is generated

- **WHEN** a plan builds a review from the current kit
- **THEN** the page is one scrolling document with text visuals, decisions, and tap-to-note

#### Scenario: An older page is refreshed

- **WHEN** save refreshes an active change whose page uses an older format
- **THEN** only the proposal block changes, and the page's embedded controls and styles stay

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt

### Requirement: Review assembly is deterministic and preserves authored input

Assembly SHALL read only the shared kit and the current proposal. The proposal text SHALL have no separately maintained copy. Repeated assembly of identical inputs SHALL produce identical output without rewriting it. Invalid inputs SHALL report a useful error and preserve the previous output. Embedded content SHALL be escaped so that proposal text, including a drawing, can not introduce executable markup.

#### Scenario: The inputs do not change

- **WHEN** the same review is assembled twice
- **THEN** the second run makes no byte or modification-time change

#### Scenario: The proposal contains markup delimiters

- **WHEN** a proposal or a drawing includes literal script-closing text or HTML-like examples
- **THEN** the page shows the intended text without running it or breaking the document

#### Scenario: A current-format input is missing

- **WHEN** the proposal lacks its required sections or the kit lacks its markers
- **THEN** assembly returns an error naming the input and does not overwrite the existing review

### Requirement: Review generation preserves portable history

The generated review SHALL remain the primary human review surface, showing the proposal, its visuals, and its decisions without needing adjacent source files. A refresh SHALL keep the note storage identity, so saved notes stay attached. Migration SHALL NOT rebuild archived pages.

#### Scenario: A reviewer opens only the HTML file

- **WHEN** a reviewer opens a generated page without its proposal or kit beside it
- **THEN** the text, visuals, decisions, zoom, and note controls remain available

#### Scenario: A proposal-only refresh preserves annotations

- **WHEN** a review is refreshed after a proposal text edit
- **THEN** the notes saved before the refresh still show

#### Scenario: Existing archives are migrated

- **WHEN** this release is installed
- **THEN** existing archived review pages remain byte-identical

#### Scenario: No browser is available for rendered inspection

- **WHEN** `/plan` runs where no browser is available
- **THEN** the page is built and the change validated
- **AND** nothing in the report claims that the page was inspected in a browser

### Requirement: One visual per change by default

A change SHALL draw one text visual by default, in the What Changes bullet that carries the change. A change that adds or restructures user-facing screens SHALL sketch each such screen. A further visual SHALL be added only where a bullet can not be understood without a picture. A bullet without a visual SHALL stay text.

#### Scenario: A process change

- **WHEN** a change alters a workflow without adding a screen
- **THEN** its proposal carries one drawing and the other bullets are text only

#### Scenario: Two screens are added

- **WHEN** a change adds two user-facing screens
- **THEN** its proposal carries a sketch of each

#### Scenario: A second visual without a reason

- **WHEN** a change that adds no screen has a second bullet that reads clearly as text
- **THEN** that bullet carries no drawing

### Requirement: The design text links the review page instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and name the What Changes items that sketch its screens. It SHALL NOT repeat the sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: A reviewer reads both

- **WHEN** a reviewer opens a UI-bearing change
- **THEN** the `## UX` text names the job and the review page shows each screen sketch in its item

### Requirement: The page is one scrolling review

`review.html` SHALL be one vertically scrolling document. In order, it SHALL show the change name and the saved-note count, the proposal's Why, the What Changes items numbered with each item's full text and its visual when it has one, and the Decisions. Decisions SHALL list each bullet of the proposal's `## Decision log`, labeled `asked` when its text after the date starts with "Asked", `assumed` when it starts with "Assumed", and `log` otherwise. A short jump list at the top SHALL link the three sections. The page SHALL have no side panel, no stage, no Previous or Next control, and no change-list sheet.

#### Scenario: Open the page on a phone

- **WHEN** a reviewer opens `review.html` at a width of 320px
- **THEN** Why, the numbered What Changes items, and the Decisions follow in one vertical order
- **AND** nothing makes the page scroll sideways

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the Decisions section shows them labeled `asked` and `assumed`

#### Scenario: No Decision log yet

- **WHEN** the proposal has no `## Decision log` section
- **THEN** the Decisions section says that no decision is recorded

### Requirement: A visual is a narrow text drawing

A What Changes visual SHALL be a fenced `text` code block inside its bullet in `proposal.md`, drawn with plain characters by the agent that writes the proposal. The planning guidance SHALL ask for drawings that read top to bottom and are about 40 columns wide. The builder SHALL warn, naming the item and line, when a visual line is wider than 60 columns, and SHALL still build the page. The page SHALL show each visual inside its item.

#### Scenario: A drawing in a bullet

- **WHEN** a What Changes bullet contains a fenced `text` block
- **THEN** the page shows that drawing inside that item, with its characters and spacing unchanged
- **AND** the same block reads as a drawing where a Markdown renderer shows `proposal.md`

#### Scenario: A wide line

- **WHEN** a drawing has a line of 72 columns
- **THEN** the builder warns with the item number and line and still writes the page

### Requirement: A visual can be panned and zoomed

Each visual SHALL open fitted to its frame's width, so the whole drawing shows. Zoom-in, zoom-out, and Fit buttons, a pinch, and a Ctrl or Cmd wheel SHALL change its zoom within fixed bounds. While the drawing is zoomed past fit, a drag inside its frame SHALL pan it. At fit, a drag SHALL scroll the page. A frame SHALL NOT make the page scroll sideways.

#### Scenario: A wide drawing on a phone

- **WHEN** a reviewer opens an item whose drawing is wider than the screen
- **THEN** the drawing shows whole, fitted to its frame

#### Scenario: Zoom in and pan

- **WHEN** the reviewer pinches out on the drawing and then drags inside its frame
- **THEN** the drawing grows and the drag moves it inside the frame
- **AND** the page does not scroll with that drag

#### Scenario: Back to fit

- **WHEN** the reviewer presses Fit
- **THEN** the whole drawing shows again and a drag scrolls the page

### Requirement: The PR body links the review page

The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it, annotate, and paste the notes into `/continue`, and SHALL omit the section when it does not. Tasks SHALL NOT need review anchors.

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: The page is built from a fixed kit and the proposal

The plan skill SHALL ship one review kit that owns the page layout, the visual frame with its zoom and pan, and the notes, drafts, and copy behavior. The agent that writes the proposal SHALL write only proposal text, including its text visuals. There SHALL be no separate visual author, visual input file, or design subagent. Shared tooling SHALL assemble the kit and the current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same layout, frames, and note controls and differ only in their proposal content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit and assembly tooling arrive together

#### Scenario: No subagent draws

- **WHEN** `/plan` produces a review page
- **THEN** the visuals come from the proposal the planning agent wrote, and no other agent was started to draw them

### Requirement: A bullet carries its visual

A What Changes bullet's visual SHALL be the fenced text block inside that bullet. A bullet MAY wrap across lines: the page SHALL read each bullet as the whole list item and show its text in full. A line that follows a bullet with no blank line between SHALL belong to that bullet, whether or not it is indented. A fenced block inside a bullet SHALL belong to it, and a blank line inside the fence SHALL NOT end the bullet. A blank line outside a fence SHALL end the bullet, so a paragraph below the list SHALL stay a paragraph. A trailing `(review.html#/…)` anchor from an older plan SHALL be hidden from the shown text. Each item SHALL be addressable by the fragment `#/<n>`, where `n` is its number.

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped across several lines, indented or not
- **THEN** the page shows one item carrying its full text, and no continuation line appears below the list

#### Scenario: A drawing with a blank line

- **WHEN** a fenced drawing inside a bullet contains a blank line
- **THEN** the whole drawing stays in that item

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the item count is unchanged

#### Scenario: An older anchor

- **WHEN** a bullet ends with `(review.html#/list/empty)`
- **THEN** the item's shown text omits that anchor

#### Scenario: A direct link

- **WHEN** the file opens at `review.html#/3`
- **THEN** the page scrolls to item 3

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. A tap or click without movement on the Why text, an item's text, a line of a visual, or a decision SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock at the bottom on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/why`, `#/<n>`, or `#/decisions/<n>`. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Tap an item

- **WHEN** the reviewer taps the text of item 2 without moving
- **THEN** an "Add note" option appears at that text
- **AND** choosing it opens the editor for item 2

#### Scenario: Scroll across an item

- **WHEN** the reviewer drags across item 2 to scroll
- **THEN** the page scrolls and no "Add note" option appears

#### Scenario: Use a zoom control

- **WHEN** the reviewer taps a visual's zoom-in button
- **THEN** the drawing zooms and no "Add note" option appears

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

### Requirement: The scrolling page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show its content at full width with no horizontal page overflow. Visuals SHALL fit their frames and zoom as defined above. The note editor SHALL dock to the bottom of the screen with a text field of at least 16px. A bar with the saved-note count and Copy notes SHALL stay reachable while the reviewer scrolls. Text, long tokens, visuals, and note controls SHALL fit from 320px upward. With the editor and the keyboard open, the reviewer SHALL still be able to scroll to the relevant content and reach Save and Discard.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the content fills the width, nothing scrolls sideways, and Copy notes is reachable

#### Scenario: A note on a phone

- **WHEN** the reviewer taps an element at phone width and chooses "Add note"
- **THEN** the editor docks to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and Discard remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

### Requirement: Each item's text and visual stay together

New review pages SHALL use normal vertical scrolling. Each item's number, text, and visual SHALL stay together in one group. A token too wide for its column — a path, an identifier, a URL — SHALL wrap in text rather than be clipped or hidden, at every width. A visual SHALL never widen the page. Short content SHALL NOT require an artificial screen-height blank area.

#### Scenario: A bullet names a long path

- **WHEN** a What Changes item contains a path wider than its column
- **THEN** the path wraps onto the next line and every character stays readable

#### Scenario: A short item

- **WHEN** a reviewer reads a short item with a small drawing
- **THEN** its text and drawing stay adjacent with no reserved blank area below

### Requirement: The builder names mechanical defects

The builder SHALL report, naming the item and line: a missing `## Why` or `## What Changes` section, an unclosed fence, a fenced block outside any bullet, and a kit without its markers, each as an error that keeps the previous output. It SHALL report a visual line wider than 60 columns as a warning. A clean build SHALL NOT be reported as proof that the visuals explain the change.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item, writes nothing, and keeps the previous page

#### Scenario: A valid build still shows the wrong change

- **WHEN** the build passes but a drawing does not explain its bullet
- **THEN** the reviewer annotates the drawing on the page
- **AND** the copied notes return to the change through `/continue` before implementation

### Requirement: The planning agent draws the visuals in one pass

`/plan` SHALL write the visuals itself while it drafts the proposal, then assemble the page once. It SHALL NOT start a visual author, a critic pass, a revision round, or a browser check. On a plan update it SHALL rebuild the page from the current proposal.

#### Scenario: A plan is drafted

- **WHEN** `/plan` reaches an apply-ready state
- **THEN** the page was assembled from the proposal the planning agent wrote
- **AND** no other agent and no browser ran for it

#### Scenario: A plan is updated

- **WHEN** `/plan` re-enters an existing change and edits its proposal
- **THEN** the page is rebuilt from the current proposal

