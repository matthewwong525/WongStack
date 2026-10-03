# Spec Delta

## ADDED Requirements

### Requirement: Notes are listed with a count

The list page at `/` SHALL list every note that is not archived, with the number of notes above the list. `GET /api/notes` SHALL answer with the same notes as JSON.

#### Scenario: The list API counts its notes

- **WHEN** a client requests `GET /api/notes`
- **THEN** the response lists the notes with a `count` equal to the number of notes listed

#### Scenario: Searching shows only matches

- **WHEN** the person searches the list page for a word
- **THEN** only notes whose title contains the word are listed

### Requirement: Notes can be created

The new-note page at `/new` SHALL save a note that has a title and refuse one that has none. `POST /api/notes` SHALL do the same for a JSON body with a `title`.

#### Scenario: Submitting with no title is rejected

- **WHEN** the person submits the new-note form with no title
- **THEN** the form shows "Title is required" and nothing is saved

#### Scenario: A new note stays in the list

- **WHEN** the person saves a new note with a title on the new-note page
- **THEN** the note appears in the list with its title as typed, and is still there unchanged after a reload

#### Scenario: Creating without a title answers 422

- **WHEN** a client posts a note with no title to `/api/notes`
- **THEN** the endpoint answers 422, the body names the missing title, and no note is created

### Requirement: Notes can be changed

Each note in the list SHALL have an Edit link to its edit page, where the person changes the title and saves it.

#### Scenario: A renamed note shows its new title

- **WHEN** the person changes a note's title on its edit page, saves, and returns to the list
- **THEN** the new title shows in the list

#### Scenario: Saving shows a Saved badge

- **WHEN** the person saves a change on a note's edit page
- **THEN** a "Saved" badge appears on the edit page

### Requirement: Notes can be archived or deleted

Each note in the list SHALL have an Archive button and a Delete button. Archived notes SHALL be listed on the Archived page at `/archived`.

#### Scenario: Deleting a note lowers the count

- **WHEN** the person deletes a note from the list page
- **THEN** the note disappears from the list and the count above the list drops by one

#### Scenario: An archived note moves to Archived

- **WHEN** the person archives a note from the list page
- **THEN** the note appears on the Archived page and is no longer in the main list
