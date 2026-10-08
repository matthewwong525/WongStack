# Spec Delta

## MODIFIED Requirements

### Requirement: A plan on a reply link can start its build

On an open reply link, the review page SHALL offer *Build it* and *Build and publish* where they stay in view without scrolling, on a phone included, and a tap SHALL tell the chat that made the plan to do exactly that for this change. *Build and publish* SHALL ask once more on the page, saying it can't be undone, before anything is sent. The page SHALL send nothing while a saved note is unsent, saying to send or delete it first, or when the plan changed after the page opened, saying to reload. Opened from disk, or once the link has closed, the page SHALL show neither button. Notes SHALL still build nothing.

#### Scenario: Build it from the page

- **WHEN** the reviewer taps *Build it* at the top of a long plan on a phone, on an open reply link with no unsent note
- **THEN** the button was in view without scrolling, the chat starts building that change, and the page says the chat was asked

#### Scenario: An unsent note

- **WHEN** the reviewer taps *Build and publish* with one saved note not yet sent
- **THEN** nothing reaches the chat, and the page says to send or delete the note first
