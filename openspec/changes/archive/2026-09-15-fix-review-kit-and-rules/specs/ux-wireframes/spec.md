## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: The wireframe covers the flow at low fidelity

A `screen` visual SHALL follow the design's flow: every screen in the flow appears, each with its empty, loading, and error states where the design names them. Each declared state SHALL render its own markup and no other; state names are not restricted to a fixed set. At most one primary action SHALL be visible at a time, counted per state rather than per screen, because markup outside a state block shows in every state; clicking it SHALL navigate to the next screen in the flow. The rendering SHALL be grey-box: no brand colours, no design-system tokens, no product typography.

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

#### Scenario: A declared state renders nothing

- **WHEN** a screen declares a state that renders an empty frame
- **THEN** the critic names it, whether or not the markup for that state is present
