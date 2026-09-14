## Purpose

The UX stage of `/plan` gives every UI-bearing change one clickable, low-fidelity HTML wireframe that a reviewer can open and walk, committed with the change and archived with it.

## ADDED Requirements

### Requirement: A UI-bearing change carries one wireframe file

When the UX stage runs for a change that adds or meaningfully restructures a user-facing screen, `/plan` SHALL produce `openspec/changes/<name>/wireframe.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. UI-less changes SHALL carry no wireframe file and no `### Wireframes` content.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `openspec/changes/<name>/wireframe.html` exists when the plan is apply-ready
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `wireframe.html` from a clone with no server running and no network
- **THEN** every screen and state renders and navigation works

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** no `wireframe.html` is created and `design.md` has no `## UX` section

### Requirement: The wireframe covers the flow at low fidelity

The wireframe SHALL contain every screen in the design's flow. Each screen SHALL show its empty, loading, and error states where the design names them. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

#### Scenario: Every state is reachable

- **WHEN** the design's flow names a list screen with empty and error states
- **THEN** the wireframe offers a state switch for that screen that shows each state
- **AND** each state is addressable by URL fragment `#/<screen>/<state>`

#### Scenario: The primary action navigates

- **WHEN** a reviewer clicks the screen's one primary action
- **THEN** the wireframe shows the screen the flow says comes next

#### Scenario: Two filled buttons in one state

- **WHEN** a screen's header carries a primary action and its empty state adds an inline one
- **THEN** the critic counts two primary actions visible in the empty state
- **AND** the critique names it as a hierarchy violation and the revision round removes one

### Requirement: Screens carry the reasoning beside them

Each screen SHALL carry a notes block with the use-case brief in one line and numbered callouts that explain the layout choices that matter, so a reviewer reads the intent without opening `design.md`.

#### Scenario: A reviewer reads a callout

- **WHEN** a screen marks an element with a numbered callout
- **THEN** the notes block below that screen has a matching numbered entry

### Requirement: The design text links the file instead of sketching

The `### Wireframes` subsection of a UI-bearing `design.md` SHALL link `wireframe.html` and list its screens and states by anchor. It SHALL NOT contain ASCII sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: The critic reads both

- **WHEN** the critic subagent reviews the UX stage output
- **THEN** it reads the `## UX` text and the wireframe file
- **AND** it judges whether every screen serves the stated job from both

### Requirement: Tasks and the PR body point at the wireframe

A UI task in `tasks.md` SHALL cite the screen and state it implements as a `wireframe.html#/<screen>/<state>` anchor. The PR body that `/save` regenerates SHALL carry a `## Wireframe` section linking `openspec/changes/<name>/wireframe.html` on the branch when the file exists, and SHALL omit the section when it does not.

#### Scenario: A UI task cites its screen

- **WHEN** `/plan` writes a task that builds a screen
- **THEN** the task names the anchor, for example `Build the list view per wireframe.html#/list/default`

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with a wireframe file
- **THEN** the body has a `## Wireframe` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without a wireframe file
- **THEN** the body has no `## Wireframe` section

### Requirement: The wireframe is filled from a fixed kit

The plan skill SHALL ship a wireframe kit that owns the reviewer chrome, the routing, the lo-fi primitives, and the callout and notes conventions. The design subagent SHALL fill the kit with screens and SHALL NOT restyle it, add dependencies to it, or raise its fidelity. The kit SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two different changes produce wireframes from the kit
- **THEN** both show the same chrome, primitives, and callout style, and differ only in screens

#### Scenario: The kit installs with the skill

- **WHEN** `/wong-sync` copies or adapts the plan skill into a target
- **THEN** the kit arrives with it under the skill's `references/` directory
