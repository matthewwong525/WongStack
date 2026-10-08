# Spec Delta

## MODIFIED Requirements

### Requirement: Every change carries a standalone review page

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`, committed and archived with the change. The page SHALL fetch no script, style, font, or picture from the network and SHALL work opened from disk; it SHALL use the network only to send notes when opened through a reply link. A change that adds or restructures a screen SHALL also keep a `## UX` section in `design.md` that links the page rather than repeating its sketches.

#### Scenario: Opened from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server and no network
- **THEN** every section, drawing, zoom, and note control works

#### Scenario: A change with no screen

- **WHEN** `/plan` drafts a worker, CLI, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: Copied notes name the plan and each place

Copy notes SHALL put a block on the clipboard whose first line is `Notes on the plan <change-name> from the review page. Don't build yet.`, then one bullet per saved note with its place and a short quote. When the page is not on an open reply link, every note save SHALL copy that block too: before a save the page SHALL say that saving copies all notes, and a failed copy on save SHALL keep the note saved and say to tap Copy notes. The page SHALL word notes as either a question or a change, never assuming a change. After a copy, it SHALL say to paste the notes into chat.

#### Scenario: Two notes copied

- **WHEN** the reviewer copies with two saved notes
- **THEN** the block holds the header line and two bullets, each with a place such as `Change #2`

#### Scenario: Saving copies every note

- **WHEN** the reviewer saves a second note on a page opened from disk
- **THEN** the clipboard holds the header line and both bullets, and the page says it saved and copied 2 notes

## ADDED Requirements

### Requirement: Notes go straight to the chat through a reply link

On an open reply link, the page's one notes control SHALL send every saved note not yet sent to the chat that made the plan, in the same wording copied notes use, and SHALL mark each as sent; saving a note SHALL send and copy nothing. Sent notes SHALL be handled as pasted notes are: they update the plan and build nothing. When a send fails or the link has closed, the same tap SHALL copy those notes, say that the link has closed and to paste them, and leave them unsent.

#### Scenario: Two notes sent

- **WHEN** the reviewer taps the notes control with two saved notes on an open reply link
- **THEN** the chat receives the header line and both bullets, the page says it sent 2 notes, and a second tap sends nothing

#### Scenario: The link closed overnight

- **WHEN** the reviewer taps the notes control after the link's time limit
- **THEN** the notes are on the clipboard, the page says the link has closed and to paste them into chat, and no note is marked sent
