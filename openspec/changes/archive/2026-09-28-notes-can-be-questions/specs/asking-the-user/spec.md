## ADDED Requirements

### Requirement: Review notes change only what they ask to

Notes pasted from a plan's review page, under the current first line or the older `Update the plan <change-name> with these notes from the review page`, SHALL change the plan only for a note that asks for a change. A note that asks a question SHALL get its answer in chat and leave the plan, its Decision log, and its page unchanged; when the answer shows the plan should change, the closing question SHALL offer that edit rather than make it.

#### Scenario: A question and a change pasted together

- **WHEN** the person pastes one note asking why a step exists and one asking to rename a step
- **THEN** the reply answers the question, and only the rename reaches the plan and its rebuilt page

#### Scenario: Notes from an older page

- **WHEN** the pasted notes start `Update the plan <change-name> with these notes from the review page`
- **THEN** they are handled the same way as notes with the current first line
