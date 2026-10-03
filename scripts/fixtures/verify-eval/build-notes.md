# Build notes: practice-notes

All nine scenarios in `openspec/changes/practice-notes/specs/notes/spec.md` are implemented. Unit tests: 14 of 14 passing. I clicked through locally and all nine behaved.

## Notes are listed with a count

- [x] **The list API counts its notes.** `GET /api/notes` returns the notes that are not archived, and `count` is the length of that same array.
- [x] **Searching shows only matches.** `/?q=` filters the list by a case-insensitive match on the title. Only the matching notes are rendered.

## Notes can be created

- [x] **Submitting with no title is rejected.** `POST /notes` checks the title first. With none it renders the form again with "Title is required" and returns before anything is saved.
- [x] **A new note stays in the list.** The note is stored with its title exactly as typed, and the list page reads from the store, so a reload shows the same row.
- [x] **Creating without a title answers 422.** `POST /api/notes` validates before it creates. With no title it answers 422 with `{"error":"Title is required"}` and creates nothing.

## Notes can be changed

- [x] **A renamed note shows its new title.** The edit page sends the new title to `PUT /api/notes/:id`, and the list reads the stored title.
- [x] **Saving shows a Saved badge.** The edit page unhides its "Saved" badge after the save request answers OK.

## Notes can be archived or deleted

- [x] **Deleting a note lowers the count.** The Delete button posts the note's id, the handler removes that note, and the count above the list is the list's length.
- [x] **An archived note moves to Archived.** Archive flags the note. The main list leaves flagged notes out, and `/archived` lists them.

## Left to do

Nothing. Ready to walk.
