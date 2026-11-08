## REMOVED Requirements

### Requirement: The finish ignores hidden parts and may name words
**Reason**: A live view no longer watches the page for a finish; the person ends every turn.
**Migration**: Open every view with `hand-over.mjs open --view --note <line>`; the turn ends on *Hand back*, `close`, or the time limit.

### Requirement: A live view can stay open until the person closes it
**Reason**: Replaced by *Every live view stays open until the person ends it*, which covers every view, not only one opened to stay open.
**Migration**: Drop `--keep-open`; every view now stays open.

## ADDED Requirements

### Requirement: Every live view stays open until the person ends it

Every live view, and every turn the agent gives the person on its browser, SHALL take no finish. It SHALL end only when the person taps *Hand back* on its page (or says *done* for a window turn), when the chat closes it, or at its time limit. It SHALL stay open through every page change on the site, a signed-in page or a receipt included. A request to open a view with a finish SHALL fail as a usage fault.

#### Scenario: Several steps in one view

- **WHEN** the person taps through two checkout steps in a live view
- **THEN** the view stays open until the person taps *Hand back*

#### Scenario: A sign-in reaches the signed-in page

- **WHEN** the person signs in during a live view and the site shows its signed-in page
- **THEN** the view stays open, and the chat waits until the person taps *Hand back*

#### Scenario: An old finish flag

- **WHEN** the agent runs `open --view --until "**/browse**" --note <line>`
- **THEN** nothing opens and the command exits with a usage fault
