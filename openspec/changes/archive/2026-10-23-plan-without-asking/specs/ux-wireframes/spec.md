## MODIFIED Requirements

### Requirement: Pasted notes update the plan and stop

Pasted notes sent alone SHALL update that change's artifacts with no question round, only for notes that ask for a change, and log what each such note changed or why it was declined; a note that asks a question SHALL be answered as `asking-the-user` requires, with no edit. The reply SHALL rebuild the page when anything changed and end with the plan's link and a line telling the person to review it, as `asking-the-user` requires for a finished plan. Notes alone SHALL build nothing; an explicit accompanying build choice SHALL authorize applying those notes and continuing directly to that action, and SHALL change nothing when the change is not in this checkout.

#### Scenario: Notes pasted

- **WHEN** a reviewer pastes notes asking for changes to a change
- **THEN** the proposal, design, specs, and tasks reflect them, and no task is implemented

#### Scenario: The change is not here

- **WHEN** the change is not in the current checkout
- **THEN** the reply says so, and nothing changes
