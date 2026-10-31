## ADDED Requirements

### Requirement: The site offers paste-in attachments

The site SHALL have a public Attachments page, linked from every page's header, with one card per attachment. Each card SHALL state a problem and its fix in a sentence each, show the attachment's full text, and copy that text with one tap. Each card SHALL have its own link. An attachment's text SHALL be a list of bullets a person pastes into their own AI chat to build the fix, with no tool or name the reader lacks, ending with a bullet that points to the WongStack repository for more context.

#### Scenario: A visitor copies an attachment

- **WHEN** a visitor opens the Attachments page and taps a card's copy button
- **THEN** the card's full text is on their clipboard, and its last line points to the WongStack repository

#### Scenario: A link names one card

- **WHEN** a visitor opens a link to one attachment's card
- **THEN** the page opens at that card

### Requirement: An attachment changes when its source does

Each attachment SHALL name the WongStack files it is written from. The checks SHALL fail when a change edits one of those files and leaves its attachment unchanged, naming the attachment and the file. The checks SHALL also fail when an attachment names a file that does not exist.

#### Scenario: A source page changes alone

- **WHEN** a change edits the memory page and not the memory attachment
- **THEN** the checks fail, naming both, and the change can not publish until the attachment is rewritten or marked checked

#### Scenario: Both change together

- **WHEN** a change edits the memory page and the memory attachment
- **THEN** the check passes
