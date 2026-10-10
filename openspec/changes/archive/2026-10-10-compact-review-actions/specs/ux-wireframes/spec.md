## MODIFIED Requirements

### Requirement: A plan on a reply link can start its build

On an open reply link, the review page SHALL offer *Build it* and *Build and publish* through a labeled three-dot control in a single-row bottom bar, accessible without scrolling on a phone included, and a tap SHALL tell the chat that made the plan to do exactly that for this change. Opening the control SHALL show those choices above the bar without increasing its height; Escape and an outside tap SHALL dismiss the choices and keyboard dismissal SHALL return focus to the control. *Build and publish* SHALL ask once more on the page, saying it can't be undone, before anything is sent. The page SHALL send nothing while a saved note is unsent, saying to send or delete it first, or when the plan changed after the page opened, saying to reload. Opened from disk, or once the link has closed, the page SHALL show neither build choice. Notes SHALL still build nothing.

#### Scenario: Build it from the page

- **WHEN** the reviewer opens the three-dot control and taps *Build it* at the top of a long plan on a phone, on an open reply link with no unsent note
- **THEN** the choices are reachable without scrolling, the bottom bar stays one row, the chat starts building that change, and the page says the chat was asked

#### Scenario: An unsent note

- **WHEN** the reviewer opens the choices and taps *Build and publish* with one saved note not yet sent
- **THEN** nothing reaches the chat, and the page says to send or delete the note first

## ADDED Requirements

### Requirement: Review requests show immediate progress

The page SHALL show visible and accessible progress while connecting to a reply link and immediately after sending notes or requesting a build. Until a send or build request finishes, it SHALL prevent another send or build request, keep the single-row footer's height stable, and show no success without acknowledgement. On completion or failure it SHALL clear the busy state and show the result, preserving saved notes and existing closed-link fallback.

#### Scenario: A slow reply

- **WHEN** the reviewer sends notes or requests a build and the response is delayed
- **THEN** progress appears before the response arrives, and repeated taps or another reply action send no additional request

#### Scenario: A retryable answer

- **WHEN** a request returns a rate-limit response
- **THEN** the busy state clears, no success is claimed, and the reviewer sees how to retry
