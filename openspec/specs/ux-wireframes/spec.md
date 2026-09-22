# ux-wireframes Specification

## Purpose

The review stage of `/plan` gives every change one self-contained HTML review page — `review.html`, whose What Changes list is the navigation and whose stage shows a low-fidelity picture of each change (a screen wireframe, a flow, a diff, a file tree) — that a reviewer opens on a laptop or a phone, walks, annotates, and copies notes from back into `/continue`. It is committed with the change and archived with it. (The capability keeps its `ux-wireframes` name from when it covered wireframes alone.)

## Requirements

### Requirement: A UI-bearing change carries one wireframe file

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. A change that adds or restructures a user-facing screen SHALL draw that screen as a `screen` visual and SHALL keep a `## UX` section in `design.md`; a UI-less change SHALL have no `## UX` section and no `screen` visual, and SHALL still have the file with its other visual kinds.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `review.html` exists when the plan is apply-ready and contains a `screen` visual for it
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server running and no network
- **THEN** every visual and state renders and navigation works

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** `review.html` exists with `flow`, `diff`, `tree`, or text visuals and no `screen`, and `design.md` has no `## UX` section

### Requirement: The wireframe covers the flow at low fidelity

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. Each declared state SHALL render its own markup and no other; state names are not restricted to a fixed set. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL advance to the next screen or state in this same What Changes item. It SHALL NOT select another item. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the file offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the file shows the next screen or state within that same item
- **AND** the outer What Changes selection does not change

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the critic names it, whether or not the markup for that state is present

#### Scenario: Visual links stay local

- **WHEN** a visual contains a link to a different What Changes item
- **THEN** the critic flags it and the author replaces it with a local state or detail action

### Requirement: Screens carry the reasoning beside them

Each `screen` visual SHALL carry a notes block with the use-case brief in one line and numbered callouts that explain the layout choices that matter. Other visual kinds MAY carry a notes block. A reader SHALL get the intent without opening `design.md`.

#### Scenario: A reviewer reads a callout

- **WHEN** a visual marks an element with a numbered callout
- **THEN** the notes block below that visual has a matching numbered entry

### Requirement: The design text links the file instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: The critic reads both

- **WHEN** the critic subagent reviews the review stage output
- **THEN** it reads the `## UX` text, when present, and the file
- **AND** it judges whether every screen serves the stated job from both

### Requirement: Tasks and the PR body point at the wireframe

A task that builds or edits something a visual shows SHALL cite it as a `review.html#/<visual>[/<state>][/<mark>]` anchor. The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it, walk it, annotate, and paste the notes into `/continue`, and SHALL omit the section when it does not.

#### Scenario: A UI task cites its screen

- **WHEN** `/plan` writes a task that builds a screen
- **THEN** the task names the anchor, for example `Build the list view per review.html#/list/default`

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship one review kit that owns the reviewer chrome, routing, panel and landing, four visual kinds and their primitives, callouts, notes, mark highlights, and annotation layer. The design subagent SHALL author only the change-specific visual input with its marks and SHALL NOT restyle the kit, add runtime dependencies, or raise its fidelity. Shared tooling SHALL assemble the kit, visual input, and current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill. A critic SHALL still judge the rendered visuals against their proposal and design after the mechanical checks, with one revision round.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same chrome, panel, primitives, pin and callout styles and differ only in their change-specific content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit, assembly tooling, and relevant authoring instructions arrive together

#### Scenario: A visual author prepares a change

- **WHEN** the author adds a new flow or screen visual
- **THEN** it writes the change-specific input and does not copy or edit the viewer runtime
- **AND** shared tooling produces the required standalone page

### Requirement: The What Changes list is the navigation

`review.html` SHALL show a panel with the proposal's `## Why` and a numbered list of its `## What Changes` bullets, and a stage that shows one selected item and its visual at a time. The selected item SHALL show its complete What Changes text above its visual, using the same parsed proposal source as the list and omitting only the trailing machine anchor. Selecting an item SHALL bring its text into view below the toolbar. At desktop width, on open with no fragment or with `#/`, the stage SHALL open the first bullet and select it in the panel; at phone width those same routes SHALL open the What Changes list instead, as "The page works on a phone" defines. It SHALL NOT repeat the full Why and change list in the stage. With no bullets, the stage SHALL show a short empty message. Previous SHALL be disabled at the first bullet, and at phone width with no bullet selected. Choosing a bullet SHALL show its visual with its marked elements highlighted and SHALL mark that bullet as current. A bullet with no anchor SHALL open a text stage that shows the bullet in full and says it has no visual. Each bullet with a visual SHALL have its own unique stage visual. The stage SHALL contain no second What Changes list or other control that selects a different bullet. The panel SHALL show each bullet's visual kind beside its anchor.

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

#### Scenario: A long item is selected

- **WHEN** the reviewer selects an item whose text wraps across several lines
- **THEN** the complete item text appears above its visual without clipping or a separate shortened summary
- **AND** the item heading is visible below the toolbar after selection

#### Scenario: Every item has its own view

- **WHEN** the reviewer selects another What Changes item
- **THEN** its own visual and full text open and the outer list marks it current
- **AND** the visual does not show another copy of the change list

#### Scenario: An item changes its own state

- **WHEN** the reviewer follows a control inside the selected visual
- **THEN** only that item's state or details change
- **AND** the item remains current in the outer list

#### Scenario: A link names no item

- **WHEN** a direct fragment names no valid item visual
- **THEN** the page shows its short fallback without selecting an unrelated item

### Requirement: Four visual kinds

The kit SHALL provide four visual kinds, each self-contained: `screen`, the low-fidelity wireframe with its states, marks, and primitives; `flow`, lanes of steps with a today lane and an after lane; `diff`, before and after text with added lines marked; and `tree`, a file list with added, edited, and removed markers. Every kind SHALL accept `data-mark` on its elements and a notes block beside it. The design subagent SHALL choose the kind per bullet and SHALL NOT invent a fifth. Straight workflow steps SHALL be connected block cards in a clear reading order, with no overlapping text or borders. Each card SHALL contain a title, short description, and, for a changed step, an added, changed, or removed text label. A separate Details action SHALL stay inside the card and reveal its actor, action, and outcome there. A workflow with multiple paths SHALL show the shared start, a labeled decision, at least two alternative paths with explicit conditions, a labeled join, and the common outcome. At narrow widths, the alternative paths SHALL stack under a label that says to choose one, with the join after them; they SHALL NOT appear to be steps that all occur in sequence. The page SHALL NOT require horizontal scrolling to read a flow. Color alone SHALL NOT identify a changed step.

#### Scenario: A process change

- **WHEN** a bullet describes a change to a sequence of steps
- **THEN** its visual is a `flow` with today and after sequences of connected cards, and the changed steps carry a mark
- **AND** each step card holds its title, short description, change label when applicable, and Details control inside one border

#### Scenario: A text change

- **WHEN** a bullet describes a change to a rule, a config value, or prose
- **THEN** its visual is a `diff` whose added lines carry a mark

#### Scenario: A files change

- **WHEN** a bullet lists files added, edited, or removed
- **THEN** its visual is a `tree` with one entry per file and its marker

#### Scenario: A reviewer inspects a step

- **WHEN** the reviewer activates a step's Details control
- **THEN** the actor, action, and outcome appear inside that step's card in the normal page flow
- **AND** the control indicates whether its details are expanded

#### Scenario: A workflow on a phone

- **WHEN** a long workflow is viewed at a width of 320px
- **THEN** its steps and any labeled branches remain readable in order by vertical scrolling
- **AND** changed steps have text labels and no page-level horizontal scroll is needed

#### Scenario: A workflow splits into three paths

- **WHEN** a workflow has three different paths after one decision
- **THEN** the review shows the shared start, the decision, three condition-labeled alternatives, their common join, and the common outcome
- **AND** each branch's Details control explains its own action and result without selecting another What Changes item

#### Scenario: A branch flow narrows to a phone

- **WHEN** the three-path workflow is viewed at a width of 320px
- **THEN** the alternatives stack under a label that says to choose one path and the join follows the last alternative
- **AND** no step box or Details control overlaps another or forces page-level horizontal scrolling

### Requirement: A bullet links its visual

A What Changes bullet with a visual SHALL end with `(review.html#/<visual>[/<state>][/<mark>])`. A bullet MAY wrap across lines: the page SHALL read each bullet as the whole list item, so the anchor SHALL be taken from the end of the bullet rather than the end of a line, and the bullet's text SHALL be shown in full. A line that follows a bullet with no blank line between SHALL belong to that bullet, whether or not it is indented; a blank line SHALL end the bullet, so a paragraph below the list SHALL stay a paragraph. When the segment after the visual names one of its states it SHALL be read as the state; otherwise it SHALL be read as a mark and the state SHALL default. A mark SHALL NOT share a name with a state of the same visual. The panel SHALL render the bullet as a link and SHALL show an anchor that names no visual, state, or mark as dead with the reason. The URL fragment SHALL accept the same form so a view is addressable.

#### Scenario: The state is omitted

- **WHEN** a bullet's anchor is `#/list/search` and `search` is not a state of `list`
- **THEN** choosing it shows `list` in its default state with the `search` elements highlighted

#### Scenario: A deep link

- **WHEN** the file is opened at `review.html#/list/empty/create`
- **THEN** the `list` screen shows its empty state with the `create` elements highlighted and the matching bullet is current

#### Scenario: A dead anchor

- **WHEN** a bullet's anchor names a mark no element in that visual carries
- **THEN** the panel shows the anchor struck through with the reason and the critic names the bullet

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped so its `(review.html#/…)` anchor falls on the last of several lines, indented or not
- **THEN** the panel lists one bullet carrying its full text, the anchor resolves to its visual, and no continuation line appears below the list

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the bullet count is unchanged

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why and What Changes and SHALL render paragraphs, lists, bold, inline code, and links. Plan and save SHALL use one shared refresh implementation. Current-format pages SHALL be assembled from their inputs. Legacy pages with `proposal:start` and `proposal:end` markers SHALL receive the existing proposal-only refresh; legacy pages without supported markers and older changes without a page SHALL be reported and left untouched. A new-format missing input SHALL be reported as an error, not a legacy skip. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page displays the proposal's current Why and What Changes

#### Scenario: No file or no markers

- **WHEN** save runs for an older change without a page or supported proposal markers
- **THEN** the legacy page is not rewritten and the checkpoint reports the limitation and proceeds

#### Scenario: A current-format refresh fails

- **WHEN** the new page's required visual input is missing
- **THEN** refresh preserves the last output and reports the failure
- **AND** the checkpoint does not claim the review is current

### Requirement: A reviewer annotates in place and copies the notes

`review.html` SHALL offer an annotate mode that is off when the file opens. When it is off, a click SHALL navigate as before. When it is on, a click on an annotatable element of the active visual SHALL open a note box near that element without following its mock product navigation. Review controls SHALL keep their normal action: change-list labels, Previous, Next, Changes, Tools, local state controls, Details, and saved-note or draft actions SHALL remain operable. The entire outer What Changes panel, including its labels and background, SHALL be navigation and reading space only; no click there SHALL create a note. A draft indicator on a list item MAY navigate to that item and reopen its draft in the visual. The annotation setting SHALL remain active across change and state navigation. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone as defined by the phone requirement. Saving SHALL attach a numbered pin to the element and list the note in the panel. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/<visual>[/<state>]` or the panel. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Annotate mode intercepts a click

- **WHEN** annotate mode is on and the reviewer clicks a mock product button in the active visual that carries a navigation target
- **THEN** a note box opens beside the button and the stage does not change

#### Scenario: A note on a non-screen visual

- **WHEN** the reviewer saves a note on a step of a `flow`
- **THEN** a pin appears on that step and the note's location is the flow's anchor

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there and annotate mode is off

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

#### Scenario: Switch items while annotation is active

- **WHEN** annotation is on and the reviewer selects another change-list label or uses Next or Previous
- **THEN** the selected item opens and annotation stays on
- **AND** that navigation click does not open a new note editor

#### Scenario: Click the change panel during annotation

- **WHEN** annotation is on and the reviewer clicks a change label or panel background
- **THEN** a label selects its item and background does nothing
- **AND** neither click opens a note editor

#### Scenario: Inspect a step while annotation is active

- **WHEN** annotation is on and the reviewer activates a step's Details action
- **THEN** the details expand or collapse without starting a note or turning annotation off

#### Scenario: Tap the step body while annotation is active

- **WHEN** annotation is on and the reviewer clicks or taps the step body instead of Details
- **THEN** a note editor opens for that step without changing the selected item

#### Scenario: Scroll on a phone while annotation is active

- **WHEN** the reviewer scrolls by dragging across an annotatable step
- **THEN** the page scrolls without creating a note from the scroll gesture

### Requirement: The copied block is a `/continue` instruction

When continue receives an instruction beginning with `Review notes from review.html`, it SHALL reconcile those notes into the affected existing artifacts using CLI-provided paths before implementation. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL not depend on a generated update skill.

#### Scenario: A review block is pasted

- **WHEN** a reviewer runs continue for a change with a copied review block
- **THEN** the affected proposal, design, specs, tasks, and visual input are reconciled before implementation resumes
- **AND** the Decision log records the disposition and the review displays the accepted changes

### Requirement: The page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show the stage at full width with no horizontal overflow, SHALL offer the What Changes list as a full-screen sheet opened from a button in the chrome and closed by choosing a bullet, SHALL offer previous and next controls that step through the bullets and show the position, SHALL dock the note box to the bottom of the screen with a text field of at least 16px, and SHALL stack a `diff`'s columns. On open with no fragment or with `#/`, the sheet SHALL open over the landing stage with no bullet selected and the position SHALL read the change count; every later arrival at `#/` SHALL open it again, because `#/` means no change is chosen. A fragment that names a visual, a state, or a mark SHALL open that target with the sheet closed. Next with no bullet selected SHALL open the first bullet. The stepping controls SHALL also work at desktop width, with the left and right arrow keys. At phone widths of 320px and above, the collapsed toolbar SHALL use one row no taller than 56px, with Changes, Previous, the position, Next, and Tools. Tools SHALL disclose state selection and note actions, expose its expanded state, and allow those controls to wrap. The long change title and desktop hint SHALL not consume phone toolbar space. Desktop controls SHALL remain exposed. After an item is selected, its full text SHALL wrap above its visual. Step details, long tokens, change-list items, and note controls SHALL fit from 320px upward. With the editor open, the reviewer SHALL still be able to scroll to the relevant content and reach editor actions. Opening details SHALL preserve the current reading position.

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

#### Scenario: Read the selected item on a phone

- **WHEN** the reviewer chooses a long proposal item from the Changes sheet
- **THEN** the sheet closes and the complete text appears above its visual
- **AND** the text, visual, and supporting details follow one vertical reading order

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and close or discard actions remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

### Requirement: A screen can be walked at phone width

A `screen` visual SHALL be walkable at phone width. The chrome SHALL offer a View toggle, Desktop or Phone, whenever the active visual is a screen; at phone width the phone view SHALL apply without the toggle. The kit SHALL provide `phone-only` and `desktop-only` helpers so one screen carries both layouts. When the use-case brief says the job is done on a phone, the review stage SHALL draw the phone layout first and the critic SHALL check the screen at phone width.

#### Scenario: Phone view from a desktop

- **WHEN** a reviewer on a desktop chooses Phone with a screen on the stage
- **THEN** the frame narrows to phone width, `desktop-only` elements hide, and `phone-only` elements show

#### Scenario: A phone-first brief

- **WHEN** a design's brief says operators use the screen on a phone
- **THEN** the screen visual carries a phone layout, and the critic reports any state that overflows at phone width

### Requirement: The file cannot fail silently

The kit SHALL execute no statement at load time that can throw before the first render on `file://`; storage and history access SHALL be guarded with fallbacks. A script error SHALL be written into the panel with its line number. The script SHALL parse in an older embedded engine, using no optional chaining or optional catch binding.

#### Scenario: Storage is refused

- **WHEN** the browser refuses localStorage on `file://`
- **THEN** the file renders, notes work until reload, and no error is shown

#### Scenario: A script error

- **WHEN** a statement in the kit throws at load
- **THEN** the panel shows the message and line instead of a blank stage

### Requirement: A state may carry any name

A `screen` visual's `data-states` SHALL accept any state name, not a fixed vocabulary. The state whose name is current SHALL render and every other state SHALL be hidden, whatever those names are. A state that is declared, has markup, and still renders nothing is a defect.

#### Scenario: A state outside the common four

- **WHEN** a screen declares `data-states="default annotating phone"` and carries a block for each
- **THEN** choosing `annotating` renders that block and hides the others
- **AND** choosing `phone` renders that block instead

#### Scenario: The common four still work

- **WHEN** a screen declares `data-states="default empty loading error"`
- **THEN** each state renders as before

### Requirement: A bullet with no visual clears the highlight

When a What Changes bullet with no anchor opens the text stage, any highlight left by the previously shown visual SHALL be cleared.

#### Scenario: From a highlighted visual to a text bullet

- **WHEN** a reviewer opens a bullet whose mark highlights elements, then opens a bullet with no visual
- **THEN** no element anywhere in the page is left highlighted

### Requirement: A release check reads the planning config

The repository SHALL carry a release check that confirms the OpenSpec CLI can read `openspec/config.yaml`, and it SHALL fail when the CLI reports that it could not. The payload release ritual SHALL name it alongside the link check.

#### Scenario: The config cannot be parsed

- **WHEN** `openspec/config.yaml` contains a line the CLI cannot parse
- **THEN** the check fails and names the file
- **AND** the release does not pass on that state

#### Scenario: The config is readable

- **WHEN** the file parses
- **THEN** the check passes and says so

### Requirement: Review layout keeps each item's content together

New review pages SHALL use normal vertical scrolling and consistent alignment for the selected item's text, caption, visual, and reasoning. A token too wide for its column — a path, an identifier, a URL — SHALL wrap rather than be clipped or hidden, at every width, in the change list and in the selected item's text. They SHALL show no inactive visual or its caption. Visual-kind styling SHALL NOT expose an inactive section or split the section's caption away from its frame. Short content SHALL NOT require an artificial screen-height blank area. Workflow steps and comparison columns SHALL stack when necessary to remain readable. Reviewers SHALL NOT need pan, zoom, or content rearrangement controls to read the page.

#### Scenario: Inactive comparison beside a text-only item

- **WHEN** a text-only item is selected and another section carries comparison layout classes
- **THEN** only the selected item's text and fallback explanation are visible
- **AND** no caption, comparison, or reasoning from the inactive section appears

#### Scenario: Read a short comparison

- **WHEN** a reviewer selects a short before-and-after comparison
- **THEN** its caption, frame, and reasoning remain aligned and adjacent in one content group
- **AND** the layout does not reserve an empty screen-height area below it

#### Scenario: A bullet names a long path

- **WHEN** a What Changes bullet contains a path wider than the change list's column
- **THEN** the path wraps onto the next line and every character stays readable
- **AND** the list needs no horizontal scrolling at desktop or phone width

### Requirement: Unfinished feedback remains a draft

The page SHALL keep unfinished note text separate from saved notes and attached to its originating proposal item, visual, state, and target. Navigation, opening details, closing the editor, or moving to another target SHALL retain nonempty drafts. The originating item and notes list SHALL expose an actionable Draft indicator. Save SHALL commit the draft as feedback and remove its draft status. Discard SHALL remove only the draft. Copy notes SHALL include saved notes only, and SHALL preserve the existing copy format. Editing a saved note SHALL keep its previously saved content until the reviewer explicitly saves the edit. Empty new drafts SHALL NOT appear as feedback or pending drafts.

Drafts SHALL persist across reloads in the same browser when storage is available. If storage is unavailable, they SHALL remain usable during the current session and the note controls SHALL state that they are session-only. A draft whose original target no longer resolves SHALL remain accessible with a moved-target indication and SHALL NOT silently attach to another target. Notes and drafts SHALL NOT be written to repository files.

#### Scenario: Leave an unfinished note

- **WHEN** a reviewer types a note on a step and selects another item without saving
- **THEN** the new item opens, the original item shows a Draft indicator, and the unfinished text remains attached to the original step
- **AND** activating the draft restores its original item, state, target context, and text

#### Scenario: Change state or target

- **WHEN** a reviewer types a draft and changes the screen state or starts a note on another target
- **THEN** the first draft remains available on its original state and target
- **AND** typing in the second editor does not overwrite the first draft

#### Scenario: Copy with saved notes and drafts

- **WHEN** a reviewer copies feedback with two saved notes and one unfinished draft
- **THEN** the copied count is two and only the saved notes are included

#### Scenario: Copy an unsaved edit

- **WHEN** a reviewer changes the text of a saved note but copies feedback before saving that edit
- **THEN** the copy contains the previously saved note text
- **AND** the unsaved edit remains a draft

#### Scenario: Save a draft

- **WHEN** a reviewer saves a draft
- **THEN** it becomes saved feedback and its Draft indicator clears

#### Scenario: Discard an edit

- **WHEN** a reviewer discards a draft edit to an existing note
- **THEN** the draft clears and the previously saved note remains unchanged

#### Scenario: Reload with a draft

- **WHEN** browser storage is available and the reviewer reloads after typing an unfinished note
- **THEN** its text and original context are recoverable from the draft list
- **AND** annotation mode starts off, as it does for saved notes

#### Scenario: Storage is refused while drafting

- **WHEN** storage access fails and the reviewer writes a draft and changes items
- **THEN** the draft remains available during that session and the page still renders
- **AND** the note controls explain that the draft cannot survive a reload

#### Scenario: A draft target changes

- **WHEN** a page revision changes or removes the target of a retained draft
- **THEN** the draft text remains accessible with a moved-target indication
- **AND** it is not silently shown as a note on a different element

### Requirement: Review controls support keyboard and touch

Navigation, step details, comment actions, and draft actions SHALL be reachable by keyboard and touch with visible labels and focus. Expanded controls SHALL expose their state. Selecting an item SHALL place focus on its heading without hiding it beneath the toolbar. Closing a disclosure or editor SHALL return focus to its trigger when that trigger remains available. Arrow shortcuts SHALL NOT change items while the reviewer edits text. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer uses the keyboard to choose an item, expand a step, start a note, and return to navigation
- **THEN** each control is reachable, focus is visible, and focus follows the selected content or returns to the corresponding trigger

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the selected proposal item does not change

### Requirement: The revised kit applies to newly created pages

The focused layout, local controls, connected workflow cards, and draft-note behavior SHALL live in the shared kit used for newly assembled review pages. The builder SHALL combine that kit with the current proposal and change-specific visual fragment. Generated pages SHALL remain self-contained without an external runtime. Refreshing a selected current-format change MAY rebuild its embedded viewer from the shared kit; marked older pages SHALL receive proposal-only refresh, and archived pages SHALL NOT be bulk regenerated.

#### Scenario: A new review is generated

- **WHEN** a future plan builds a review from the shared kit and its visual fragment
- **THEN** the page provides full selected-item text, responsive layout, annotation-safe navigation, and drafts without an external runtime load

#### Scenario: An older page is refreshed

- **WHEN** save refreshes a marked page that has no visual fragment
- **THEN** it updates only the proposal block and preserves that page's embedded controls and styles

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt merely because the kit changed

### Requirement: Review assembly is deterministic and preserves authored input

Assembly SHALL read the shared template, current proposal sections, and authored visual input. The proposal text SHALL have no separately maintained copy. Repeated assembly of identical inputs SHALL produce identical output without rewriting it. Invalid inputs SHALL report a useful error and preserve the previous output. Embedded content SHALL be escaped so proposal text cannot introduce executable markup.

#### Scenario: The inputs do not change

- **WHEN** the same review is assembled twice
- **THEN** the second invocation makes no byte or modification-time change

#### Scenario: The proposal contains markup delimiters

- **WHEN** a proposal includes literal script-closing text or HTML-like examples
- **THEN** the page displays the intended text without executing it or breaking the document

#### Scenario: A current-format input is missing

- **WHEN** a current-format change lacks its required visual input or has invalid template boundaries
- **THEN** assembly returns an error identifying the input and does not overwrite its existing review

### Requirement: Mechanical defects have deterministic diagnostics

Review checks SHALL identify duplicate visual IDs, unresolved anchors, missing declared screen states, state/mark collisions, invalid navigation targets, unreferenced visuals or marks, excess primary actions per screen state, unauthorized template changes, and prohibited resource loads or executable visual input. Checks SHALL respect the existing visual-kind semantics, including flow lanes for today/after states. Diagnostics SHALL identify the affected visual or source. A structural pass SHALL NOT be reported as proof of semantic or visual correctness.

#### Scenario: An anchor does not exist

- **WHEN** a proposal bullet names a missing visual, state, or mark
- **THEN** the check reports that bullet's target as invalid

#### Scenario: A shared header creates two primary actions

- **WHEN** a screen has a primary action outside its state blocks and another inside its empty state
- **THEN** the check reports two primary actions for the empty state

#### Scenario: Visual input changes shared behavior

- **WHEN** a fragment adds a script, an event handler, a style override, or a remote automatically loaded resource
- **THEN** the check rejects that input with a named diagnostic

#### Scenario: The unchanged viewer applies its own inline styles

- **WHEN** the shared runtime sets flow opacity or toolbar sizing after loading valid visual input
- **THEN** author-input checks do not reject those runtime-generated styles
- **AND** styles introduced by the visual author are still rejected before execution

#### Scenario: A valid structure still shows the wrong change

- **WHEN** the structural checks pass but a visual does not explain its proposal bullet
- **THEN** the critic can still reject the visual and require the single revision round

### Requirement: Review generation preserves portable history

The generated review SHALL remain the primary human review surface, showing the proposal and visual explanations without needing adjacent source files. It SHALL preserve the existing interaction and annotation identity when a page is refreshed. Migration SHALL NOT bulk regenerate archived pages. A structural or source-only check SHALL NOT be reported as a completed rendered review.

#### Scenario: A reviewer opens only the HTML file

- **WHEN** a reviewer opens a generated page without its proposal, template, or visual-input file beside it
- **THEN** the explanation, visuals, navigation, and annotation controls remain available

#### Scenario: A proposal-only refresh preserves annotations

- **WHEN** a current-format review is refreshed after a proposal text edit
- **THEN** stable visual identifiers and annotation storage identity remain unchanged

#### Scenario: Existing archives are migrated

- **WHEN** the WongStack integration is migrated
- **THEN** existing archived review pages remain byte-identical and readable without the new authoring tooling

#### Scenario: No browser is available for rendered inspection

- **WHEN** source checks complete but rendered browser inspection cannot run
- **THEN** the report names the rendered checks as unverified rather than claiming that every state was inspected
