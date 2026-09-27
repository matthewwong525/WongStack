## MODIFIED Requirements

### Requirement: The review page is tested in a real browser by the payload checks

The payload checks SHALL drive the plan review page in a real browser engine: taps and drags, the note editor, copied notes, drafts across a reload, refused storage, notes whose text moved, drawing zoom and fit, touch input, and layout at phone and desktop widths. The browser SHALL be one already on the CI runner when available; a download SHALL happen only in the meta-only workflow.

#### Scenario: A review-page regression fails the payload checks

- **WHEN** a change to the review kit stops a saved note from appearing in the copied request to update the plan
- **THEN** the payload checks fail

#### Scenario: The review page test is not shipped

- **WHEN** a repo takes the app scaffold
- **THEN** it receives no review-page browser test
