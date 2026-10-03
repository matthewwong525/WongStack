# Build notes: practice-notes

All twelve scenarios in `openspec/changes/practice-notes/specs/notes/spec.md` are implemented. Unit tests: 17 of 17 passing. I clicked through locally and all twelve behaved.

## Notes are listed with a count

- [x] **The list API counts its notes.** `GET /api/notes` returns the notes that are not archived, and `count` is the length of that same array.
- [x] **Searching shows only matches.** `/?q=` filters the list by a case-insensitive match on the title. Only the matching notes are rendered.

## Notes can be created

- [x] **Submitting with no title is rejected.** `POST /notes` checks the title first. With none it renders the form again with "Title is required" and returns before anything is saved.
- [x] **A new note stays in the list.** The note is stored with its title exactly as typed, and the list page reads from the store, so a reload shows the same row.
- [x] **Creating without a title answers 422.** `POST /api/notes` validates before it creates. With no title it answers 422 with `{"error":"Title is required"}` and creates nothing.
- [x] **Creating with a title answers 201.** With a title, `POST /api/notes` stores the note and answers 201 with it. The nightly job re-indexes every note created since its last run.

## Notes can be changed

- [x] **A renamed note shows its new title.** The edit page sends the new title to `PUT /api/notes/:id`, and the list reads the stored title.
- [x] **Saving shows a Saved badge.** The edit page unhides its "Saved" badge after the save request answers OK.
- [x] **A rename through the API is logged.** `PUT /api/notes/:id` answers 200 with the renamed note, then writes a `rename` entry with the note's id to the audit log.

## Notes can be archived or deleted

- [x] **Deleting a note lowers the count.** The Delete button posts the note's id, the handler removes that note, and the count above the list is the list's length.
- [x] **An archived note moves to Archived.** Archive flags the note. The main list leaves flagged notes out, and `/archived` lists them.
- [x] **Archiving a note emails the owner.** The count above the list leaves flagged notes out. Once the flag is set, the handler sends the owner an email with the note's title.

## Left to do

Nothing. Ready to walk.
