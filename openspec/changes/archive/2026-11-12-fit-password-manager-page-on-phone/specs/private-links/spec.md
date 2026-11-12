## MODIFIED Requirements

### Requirement: A live view shows the whole browser window

A live view SHALL fit the browser window to the screen the person sees, on every page of the turn's tab, the password manager's own page included, so the toolbar and the page's edges are never cut off. On a phone, the password manager's own page SHALL narrow to the phone's width, as a site's page does, and the site SHALL get its own size back once the person leaves that page or the view ends.

#### Scenario: The password manager's page right after a browser start

- **WHEN** a live view opens over 1Password's own page in a browser that has just started at a size bigger than the view's screen
- **THEN** the person sees the whole window, the toolbar with 1Password's button included

#### Scenario: The password manager's page on a phone

- **WHEN** the person opens a live view on a phone while 1Password's own page shows in the turn's tab
- **THEN** the page fits the phone's width, and its whole sign-in form shows, its right side included
