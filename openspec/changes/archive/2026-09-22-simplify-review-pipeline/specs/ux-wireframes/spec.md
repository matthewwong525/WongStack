## ADDED Requirements

### Requirement: The review page is produced in one authoring pass

`/plan` SHALL produce `review.html` with one visual-author pass, one assembly, and one structural check. It SHALL NOT run a critic pass or a revision round over the rendered page. On a plan update it SHALL run the author again only when an anchored bullet or its visual changes; other edits SHALL only rebuild the page. The visual author SHALL start after the proposal draft and SHALL run while the design and tasks are drafted; anchors SHALL be placed and the page assembled after the author returns its bullet-to-anchor map. When a browser is available the structural check SHALL run once in it; when none is available the report SHALL name the rendered check as unverified.

#### Scenario: A plan is drafted with a browser available

- **WHEN** `/plan` reaches an apply-ready state
- **THEN** the page was assembled once from the returned fragment and the structural check ran once in a browser
- **AND** no critic findings or revision round were produced

#### Scenario: The author is still running when tasks are written

- **WHEN** the visual author has not returned while the main thread drafts tasks
- **THEN** tasks that cite a review anchor are completed after the map returns
- **AND** the proposal bullets receive their anchors before assembly

#### Scenario: A plan is updated without touching the drawn bullet

- **WHEN** `/plan` re-enters an existing change and the edits touch no anchored bullet and no visual
- **THEN** the page is rebuilt from the existing fragment and the author is not run again

#### Scenario: A plan update changes the drawn bullet

- **WHEN** `/plan` re-enters an existing change and an anchored bullet or its visual changes
- **THEN** the author runs once more for that visual and the page is rebuilt and checked once

#### Scenario: No browser is available

- **WHEN** the structural check cannot run in a browser
- **THEN** assembly and validation still run
- **AND** the report names the rendered check as unverified rather than passed

### Requirement: One visual per change by default

A change SHALL draw one visual by default: the `flow`, `screen`, `diff`, or `tree` that carries the change, anchored from the one What Changes bullet it explains. A visual SHALL have one owning bullet. A change that adds or restructures user-facing screens SHALL draw each such screen. Any further visual SHALL be justified by a reason the author states in its hand-back. A bullet without a visual SHALL stay text.

#### Scenario: A process change

- **WHEN** a change alters a workflow without adding a screen
- **THEN** its page carries one `flow`, `diff`, or `tree` visual and the other bullets show text only

#### Scenario: Two screens are added

- **WHEN** a change adds two user-facing screens
- **THEN** its page carries a `screen` visual for each

#### Scenario: A second visual without a reason

- **WHEN** the author returns two visuals for a change that adds no screen and states no reason for the second
- **THEN** the main thread keeps the one that carries the change and leaves the other bullet as text

### Requirement: The design text links the review page instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: A reviewer reads both

- **WHEN** a reviewer opens a UI-bearing change
- **THEN** the `## UX` text names the job and the page shows each screen and state by anchor
- **AND** the reviewer can judge whether every screen serves the stated job from the two together

## MODIFIED Requirements

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
- **THEN** the structural check reports two primary actions visible in the empty state

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the reviewer can annotate the empty frame on the page

#### Scenario: Visual links stay local

- **WHEN** a visual contains a link to a different What Changes item
- **THEN** the structural check reports the invalid navigation target

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship one review kit that owns the reviewer chrome, routing, panel and landing, four visual kinds and their primitives, callouts, notes, mark highlights, and annotation layer. The design subagent SHALL author only the change-specific visual input with its marks and SHALL NOT restyle the kit, add runtime dependencies, or raise its fidelity. Shared tooling SHALL assemble the kit, visual input, and current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill. The reviewer SHALL use page annotations to report meaning or layout issues after the structural check.

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
- **THEN** the panel shows the anchor struck through with the reason and the structural check names the bullet

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped so its `(review.html#/…)` anchor falls on the last of several lines, indented or not
- **THEN** the panel lists one bullet carrying its full text, the anchor resolves to its visual, and no continuation line appears below the list

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the bullet count is unchanged

### Requirement: A screen can be walked at phone width

A `screen` visual SHALL be walkable at phone width. The chrome SHALL offer a View toggle, Desktop or Phone, whenever the active visual is a screen; at phone width the phone view SHALL apply without the toggle. The kit SHALL provide `phone-only` and `desktop-only` helpers so one screen carries both layouts. When the use-case brief says the job is done on a phone, the review stage SHALL draw the phone layout first. The reviewer SHALL be able to annotate overflow on the page.

#### Scenario: Phone view from a desktop

- **WHEN** a reviewer on a desktop chooses Phone with a screen on the stage
- **THEN** the frame narrows to phone width, `desktop-only` elements hide, and `phone-only` elements show

#### Scenario: A phone-first brief

- **WHEN** a design's brief says operators use the screen on a phone
- **THEN** the screen visual carries a phone layout and the reviewer can annotate overflow on the page

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
- **THEN** the reviewer annotates the visual on the page
- **AND** the copied notes return to the change through `/continue` before implementation

## REMOVED Requirements

### Requirement: The design text links the file instead of sketching

**Reason**: Its only scenario described the critic subagent, which `/plan` no longer runs.

**Migration**: The same rule continues as "The design text links the review page instead of sketching", whose scenario names the reviewer instead of the critic. No design file changes.
