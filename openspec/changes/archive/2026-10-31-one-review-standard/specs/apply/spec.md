## MODIFIED Requirements

### Requirement: A fresh helper builds the tasks

Where the host can start one, a fresh helper agent SHALL build the change's tasks, so the build does not carry the planning conversation. When the plan made a prototype, the helper SHALL start from it, so the built screens match the approved pictures. The helper SHALL NOT ask the person, run git, save, or upload a preview, and SHALL NOT report while a helper or check it started is still running. It SHALL return on a question, a blocker, or the whole implementation; the parent SHALL handle a question or blocker and start a new helper for the rest when appropriate. A host with no helper SHALL build inline with the same outcome.

#### Scenario: An ambiguous task

- **WHEN** the helper cannot finish a task without the person's decision
- **THEN** it returns the question, the parent asks the person, and a new helper works the remaining tasks

#### Scenario: No helper available

- **WHEN** the host cannot start a helper agent
- **THEN** `/apply` works the tasks inline with the same outcome

#### Scenario: A plan with a prototype

- **WHEN** the plan kept a prototype of a changed screen
- **THEN** the helper starts from it, and the built screen matches the plan's *After* picture unless a task says otherwise

### Requirement: Preview pictures precede the publish choice

When a finished `/apply` has a preview and is asking what to do next, it SHALL build a preview review page of the screens that changed and give its link before the multiple-choice question. A screen with a plan picture SHALL show *Approved*, the plan's picture, beside *Built*; another changed screen SHALL show *Live now* beside *Preview*, and a new screen without a plan picture its preview alone, each with a short plain title. The person SHALL be able to note a spot on any picture and send the notes, or choose Publish, which asks once more on the page and runs `/ship`. The page SHALL offer no build choice and SHALL keep its notes apart from the plan's. Each picture SHALL be at phone width and show only the visible part; a computer-width picture SHALL be added only where the layout differs and the page stays under 500 KB. Pictures and the page SHALL depict the current preview, stay outside tracked files, and follow existing screenshot privacy safeguards. They SHALL NOT add a save, publishing gate, or confirmation to an already authorized `/ship`.

#### Scenario: Two changed screens can be shown

- **WHEN** a finished `/apply` has a reachable preview with two changed screens and no plan pictures
- **THEN** the chat gives the preview page's link before the publish, change more, or save question, the page shows each screen live now beside its preview, and the preview link stays

#### Scenario: A screen the plan showed

- **WHEN** the plan showed an *After* picture of a screen the build changed
- **THEN** the preview page shows that picture as *Approved* beside the built screen as *Built*

#### Scenario: A note on the preview

- **WHEN** the person taps a spot on a preview picture, writes *this button is too small*, and taps *Send notes*
- **THEN** the chat gets the note with the picture's title and spot, and nothing is published

#### Scenario: Publish from the page

- **WHEN** the person taps *Publish* on an open preview page and confirms
- **THEN** the chat runs `/ship` for that change, with no further publish choice

#### Scenario: Pictures are unavailable

- **WHEN** the preview cannot be captured or the app has no changed screen
- **THEN** `/apply` says why pictures are unavailable, retains any preview link, and still asks what to do next
