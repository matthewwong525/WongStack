## MODIFIED Requirements

### Requirement: Every live view stays open until the person ends it

Every live view, and every turn the agent gives the person on its browser, SHALL take no finish. A turn SHALL end only when the person clicks *Hand back* in the browser's toolbar, which ends every open turn, when the person says *done* in its chat, when the chat closes it, or at its time limit. A watch link SHALL end on its own *Hand back*. Each SHALL stay open through every page change on the site, a signed-in page or a receipt included. A request to open a view with a finish SHALL fail as a usage fault.

#### Scenario: Several steps in one view

- **WHEN** the person taps through two checkout steps in a live view
- **THEN** the view stays open until the person taps *Hand back*

#### Scenario: A sign-in reaches the signed-in page

- **WHEN** the person signs in during a live view and the site shows its signed-in page
- **THEN** the view stays open, and the chat waits until the person taps *Hand back*

#### Scenario: An old finish flag

- **WHEN** the agent asks to open a live view that ends at a named page
- **THEN** nothing opens and the command exits with a usage fault
