## ADDED Requirements

### Requirement: The What Changes list is the navigation

`review.html` SHALL show a panel with the proposal's `## Why` and a numbered list of its `## What Changes` bullets, and a stage that shows one visual at a time. On open with no fragment the stage SHALL show the Why and the numbered list. Choosing a bullet SHALL show its visual with its marked elements highlighted and SHALL mark that bullet as current. A bullet with no anchor SHALL open a text stage that shows the bullet in full and says it has no visual. Two bullets MAY share one visual. The panel SHALL show each bullet's visual kind beside its anchor.

#### Scenario: The file opens

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** the panel shows Why and the numbered What Changes list, and the stage shows the Why and the list

#### Scenario: A bullet is chosen

- **WHEN** the reviewer clicks bullet 3, whose anchor is `#/receive-flow/after/new`
- **THEN** the stage shows the `receive-flow` visual in its `after` state with every `new` element highlighted, and bullet 3 is marked current

#### Scenario: A bullet has no visual

- **WHEN** the reviewer clicks a bullet with no anchor
- **THEN** the stage shows that bullet's text and says it has no visual, and the bullet is marked current

### Requirement: Four visual kinds

The kit SHALL provide four visual kinds, each self-contained: `screen`, the low-fidelity wireframe with its states, marks, and primitives; `flow`, lanes of steps with a today lane and an after lane; `diff`, before and after text with added lines marked; and `tree`, a file list with added, edited, and removed markers. Every kind SHALL accept `data-mark` on its elements and a notes block beside it. The design subagent SHALL choose the kind per bullet and SHALL NOT invent a fifth.

#### Scenario: A process change

- **WHEN** a bullet describes a change to a sequence of steps
- **THEN** its visual is a `flow` with a today lane and an after lane, and the changed steps carry a mark

#### Scenario: A text change

- **WHEN** a bullet describes a change to a rule, a config value, or prose
- **THEN** its visual is a `diff` whose added lines carry a mark

#### Scenario: A files change

- **WHEN** a bullet lists files added, edited, or removed
- **THEN** its visual is a `tree` with one entry per file and its marker

### Requirement: A bullet links its visual

A What Changes bullet with a visual SHALL end with `(review.html#/<visual>[/<state>][/<mark>])`. When the segment after the visual names one of its states it SHALL be read as the state; otherwise it SHALL be read as a mark and the state SHALL default. A mark SHALL NOT share a name with a state of the same visual. The panel SHALL render the bullet as a link and SHALL show an anchor that names no visual, state, or mark as dead with the reason. The URL fragment SHALL accept the same form so a view is addressable.

#### Scenario: The state is omitted

- **WHEN** a bullet's anchor is `#/list/search` and `search` is not a state of `list`
- **THEN** choosing it shows `list` in its default state with the `search` elements highlighted

#### Scenario: A deep link

- **WHEN** the file is opened at `review.html#/list/empty/create`
- **THEN** the `list` screen shows its empty state with the `create` elements highlighted and the matching bullet is current

#### Scenario: A dead anchor

- **WHEN** a bullet's anchor names a mark no element in that visual carries
- **THEN** the panel shows the anchor struck through with the reason and the critic names the bullet

### Requirement: The proposal text is resynced by `/save`

`review.html` SHALL carry the proposal's `## Why` and `## What Changes` as Markdown between a `proposal:start` marker and a `proposal:end` marker. The kit SHALL render paragraphs, bullet lists, bold, inline code, and links. `/save` SHALL replace the text between the markers with the current sections of `proposal.md` on every checkpoint whose change has the file, and SHALL report and change nothing when the file or the markers are absent. `/plan` SHALL fill the block once the file is written.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during `/apply` and `/save` runs
- **THEN** the text between the markers equals the proposal's current Why and What Changes

#### Scenario: No file or no markers

- **WHEN** `/save` runs for a change without `review.html`, or with one that has no markers
- **THEN** nothing is written and the checkpoint reports it and proceeds

### Requirement: A reviewer annotates in place and copies the notes

`review.html` SHALL offer an annotate mode that is off when the file opens. When it is off, a click SHALL navigate as before. When it is on, a click on an element of the active visual or of the panel SHALL open a note box beside that element, never over it, without navigating, and the state switcher SHALL keep working. Saving SHALL attach a numbered pin to the element and list the note in the panel. Notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per note as `<location> · <element label> — <text>`, where the location is `#/<visual>[/<state>]` or the panel. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Annotate mode intercepts a click

- **WHEN** annotate mode is on and the reviewer clicks a button that carries a navigation target
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

### Requirement: The copied block is a `/continue` instruction

When `/continue <name>` receives an instruction that begins with `Review notes from review.html`, it SHALL fold the notes into the change's artifacts through the update step before working any task, and SHALL record in the Decision log which notes changed what.

#### Scenario: A review block is pasted

- **WHEN** the user runs `/continue add-po-search` followed by a copied review block
- **THEN** the change's proposal, design, or tasks are revised for the notes before implementation resumes, and the Decision log records it

### Requirement: The page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show the stage at full width with no horizontal overflow, SHALL offer the What Changes list as a full-screen sheet opened from a button in the chrome and closed by choosing a bullet, SHALL offer previous and next controls that step through the bullets and show the position, SHALL dock the note box to the bottom of the screen with a text field of at least 16px, and SHALL stack a `diff`'s columns. The stepping controls SHALL also work at desktop width, with the left and right arrow keys.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the stage fills the width, nothing scrolls sideways, and the list is behind a Changes button

#### Scenario: Stepping through changes

- **WHEN** the reviewer taps next twice from bullet 1
- **THEN** the stage shows bullet 3's visual and the chrome reads `3 / <n>`

#### Scenario: A note on a phone

- **WHEN** annotate mode is on at phone width and the reviewer taps an element
- **THEN** the note box appears docked to the bottom of the screen and the keyboard does not zoom the page

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

## MODIFIED Requirements

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

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the file offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the file shows the screen the flow says comes next

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

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

The plan skill SHALL ship a review kit that owns the reviewer chrome, the routing, the panel and landing, the four visual kinds and their primitives, the callout and notes conventions, the mark highlight, and the annotate layer. The design subagent SHALL fill the kit with visuals and `data-mark` tags and SHALL NOT restyle it, add dependencies to it, or raise its fidelity. The proposal block SHALL be filled by the sync script, not by hand. The kit SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two different changes produce review files from the kit
- **THEN** both show the same chrome, panel, primitives, pin and callout style, and differ only in visuals, marks, and proposal text

#### Scenario: The kit installs with the skill

- **WHEN** `/wong-sync` copies or adapts the plan skill into a target
- **THEN** the kit arrives with it under the skill's `references/` directory
