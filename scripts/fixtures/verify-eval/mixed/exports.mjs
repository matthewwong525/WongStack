// The exports capability consumes the notes API's { id, title, body } records.
export function exportTitles(notes) {
  return notes.map(note => String(note.label));
}
