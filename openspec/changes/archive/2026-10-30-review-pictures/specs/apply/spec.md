## MODIFIED Requirements

### Requirement: Preview pictures precede the publish choice

When a finished `/apply` has a preview and is asking what to do next, it SHALL build a preview review page of the screens that changed and give its link before the multiple-choice question. Each changed screen SHALL show *Live now* beside *Preview*, a new screen its preview alone, each with a short plain title. The person SHALL be able to note a spot on any picture and send the notes, or choose Publish, which asks once more on the page and runs `/ship`. The page SHALL offer no build choice and SHALL keep its notes apart from the plan's. Each picture SHALL be at phone width and show only the visible part; a computer-width picture SHALL be added only where the layout differs and the page stays under 500 KB. Pictures and the page SHALL depict the current preview, stay outside tracked files, and follow existing screenshot privacy safeguards. They SHALL NOT add a save, publishing gate, or confirmation to an already authorized `/ship`.

#### Scenario: Two changed screens can be shown

- **WHEN** a finished `/apply` has a reachable preview with two changed screens
- **THEN** the chat gives the preview page's link before the publish, change more, or save question, the page shows each screen live now beside its preview, and the preview link stays

#### Scenario: A note on the preview

- **WHEN** the person taps a spot on a preview picture, writes *this button is too small*, and taps *Send notes*
- **THEN** the chat gets the note with the picture's title and spot, and nothing is published

#### Scenario: Publish from the page

- **WHEN** the person taps *Publish* on an open preview page and confirms
- **THEN** the chat runs `/ship` for that change, with no further publish choice

#### Scenario: Pictures are unavailable

- **WHEN** the preview cannot be captured or the app has no changed screen
- **THEN** `/apply` says why pictures are unavailable, retains any preview link, and still asks what to do next
