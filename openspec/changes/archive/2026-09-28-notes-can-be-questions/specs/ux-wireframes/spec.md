## MODIFIED Requirements

### Requirement: Copied notes name the plan and each place

Copy notes, and every note save, SHALL put a block on the clipboard whose first line is `Notes on the plan <change-name> from the review page. Don't build yet.`, then one bullet per saved note with its place and a short quote. The page SHALL word notes as either a question or a change, never assuming a change. Before a save, the page SHALL say that saving copies all notes; after a copy, it SHALL say to paste the notes into chat. A failed copy on save SHALL keep the note saved and say to tap Copy notes.

#### Scenario: Two notes copied

- **WHEN** the reviewer copies with two saved notes
- **THEN** the block holds the header line and two bullets, each with a place such as `Change #2`

#### Scenario: Saving copies every note

- **WHEN** the reviewer saves a second note
- **THEN** the clipboard holds the header line and both bullets, and the page says it saved and copied 2 notes
