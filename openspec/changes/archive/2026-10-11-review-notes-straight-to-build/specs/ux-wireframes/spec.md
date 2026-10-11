## MODIFIED Requirements

### Requirement: A plan on a reply link can start its build

On an open reply link, the review page SHALL offer Send notes, Build it, and Build and publish as three directly visible bottom buttons, reachable without scrolling on a phone. A build choice SHALL send the selected action with every saved unsent note in one request, so the chat applies the notes and continues into the selected build or publish action without another build choice. Build and publish SHALL ask once more on the page before sending. The page SHALL mark only acknowledged submitted notes as sent and SHALL preserve unsent notes on failure. A changed plan SHALL prevent the action and ask for reload. Opened from disk or after the link closes, the page SHALL show no build choices and SHALL retain note copying. Send notes alone SHALL build nothing.


#### Scenario: Build it from the page

- **WHEN** the reviewer taps *Build it* at the top of a long plan on a phone, on an open reply link with no unsent note
- **THEN** all three buttons are directly reachable without scrolling, the bottom bar has no sideways overflow, the chat starts building that change, and the page says the chat was asked

#### Scenario: An unsent note

- **WHEN** the reviewer taps *Build and publish* with one saved note not yet sent and confirms publishing
- **THEN** the chat receives the chosen action and note together, updates the plan, and builds and publishes without a further build choice; the acknowledged note is marked sent

### Requirement: Pasted notes update the plan and stop

Pasted notes sent alone SHALL update that change's artifacts with no question round, only for notes that ask for a change, and log what each such note changed or why it was declined; a note that asks a question SHALL be answered as `asking-the-user` requires, with no edit. The reply SHALL rebuild the page when anything changed and end with the plan's link and whether to build now. Notes alone SHALL build nothing; an explicit accompanying build choice SHALL authorize applying those notes and continuing directly to that action, and SHALL change nothing when the change is not in this checkout.

#### Scenario: Notes pasted

- **WHEN** a reviewer pastes notes asking for changes to a change
- **THEN** the proposal, design, specs, and tasks reflect them, and no task is implemented

#### Scenario: The change is not here

- **WHEN** the change is not in the current checkout
- **THEN** the reply says so, and nothing changes
