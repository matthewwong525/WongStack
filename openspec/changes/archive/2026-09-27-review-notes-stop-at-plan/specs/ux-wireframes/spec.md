## RENAMED Requirements

- FROM: `### Requirement: The copied block is a `/continue` instruction`
- TO: `### Requirement: Pasted review notes update the plan and stop`

## MODIFIED Requirements

### Requirement: Pasted review notes update the plan and stop

When the agent receives a message whose first line begins `Update the plan <change-name> with these notes from the review page`, it SHALL load plan's review-notes procedure and reconcile those notes into the affected existing artifacts using CLI-provided paths. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL NOT depend on a generated update skill. It SHALL NOT run an explore question round for the notes. When the change is not in the current checkout, it SHALL say so and stop. After the refresh it SHALL present the updated plan with a link to the review page, ask whether to build it now, and SHALL NOT implement any task until the person answers.

#### Scenario: A review block is pasted

- **WHEN** a reviewer pastes a copied review block for a change
- **THEN** the affected proposal (including its visuals), design, specs, and tasks are reconciled
- **AND** the Decision log records the disposition and the review shows the accepted changes
- **AND** the reply ends with the review link and the question whether to build it now, and no task is implemented

#### Scenario: The change is not here

- **WHEN** a reviewer pastes a review block in a checkout that does not hold the change
- **THEN** the reply says the plan is not open here, and nothing is changed or implemented

### Requirement: The PR body links the review page

The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it from a clone to view and annotate it, and SHALL omit the section when it does not. Tasks SHALL NOT need review anchors.

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. Each Why paragraph, item text, and decision SHALL show a visible Note control while it has no note or draft; a tap or click on it SHALL open the note editor for that element. Once the element has a note or draft, its numbered pin or Draft pin SHALL take the Note control's place and open the editor. A mouse click without movement on that text, or a tap or click without movement on a line of a visual in the full-screen view, SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A touch tap on text outside a control SHALL NOT show the option. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block with no command, whose first line is `Update the plan <change-name> with these notes from the review page. Don't build yet.`, and which then carries one bullet per saved note, in saved order, as `- <place> ("<quoted text>"): <text>`, where the place is `Why, paragraph <n>`, `Change #<n>`, `Change #<n>, drawing line <k>`, or `Decision #<n>`, and the quoted text is the quote from the note's saved label. The saved label format SHALL NOT change. After a successful copy the page SHALL say to paste the notes into chat to update the plan. A pin whose element no longer matches its saved label SHALL be shown as possibly moved. The Note control SHALL NOT be part of an element's label.

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
- **THEN** the clipboard holds a block with no command, starting with the line asking to update the plan for `<change-name>` and not build yet, then two bullets, each with a place such as `Change #2`, a short quote, and the text
- **AND** the page says to paste them into chat to update the plan
