# Spec Delta

## MODIFIED Requirements

### Requirement: The key page takes a paste, a long key, or a key file

The page SHALL offer a one-tap paste where the person's browser allows it, and SHALL accept a key that spans several lines, pasted or picked as a file that the person's device reads itself. Such a key SHALL be stored on one line in a form the app reads back with the same content: the same data for a JSON key file, the same lines for any other text. A picked file that is not text SHALL be stored as one base64 line that decodes to the same bytes. The page SHALL show a picked file by its name and line count when it is text, and by its name and size when it is not, never its content. A key no single line can hold whole SHALL be refused with a message, never saved changed.

#### Scenario: A key file

- **WHEN** the person picks a service's JSON key file for `GOOGLE_SERVICE_KEY`, which `app/.dev.vars.example` declares, and saves
- **THEN** the page shows the file's name and line count, the key lands on one line in `app/.dev.vars`, and the Worker reads back the same JSON data

#### Scenario: The browser blocks the paste button

- **WHEN** the person's browser refuses to read the clipboard
- **THEN** the page says to paste into the field by hand, and a hand-pasted multi-line key keeps its line breaks

#### Scenario: A binary key file

- **WHEN** the person picks a `.p12` signing certificate, which is not text, for a key that `.env.example` declares, and saves
- **THEN** the page shows the file's name and size, the key lands as one base64 line, and decoding that line gives the same bytes as the file
