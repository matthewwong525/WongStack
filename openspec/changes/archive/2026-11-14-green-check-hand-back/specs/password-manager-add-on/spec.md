## ADDED Requirements

### Requirement: An add-on built into the browser stays off the toolbar

An add-on that comes built into the agent's browser, such as uBlock Origin, SHALL keep working on every page, but its button SHALL move off the toolbar into the browser's add-ons menu, once per browser, at a start after the browser has saved its toolbar. A button the person pins back by hand SHALL stay pinned. An add-on the person asked for, and the WongStack *Hand back* button, SHALL stay on the toolbar.

#### Scenario: uBlock leaves the toolbar

- **WHEN** a browser with uBlock Origin's button on its toolbar starts again after this change
- **THEN** uBlock Origin's button is in the add-ons menu, ads are still blocked, and 1Password's button and *Hand back* stay on the toolbar

#### Scenario: The person pins it back

- **WHEN** the person pins uBlock Origin's button to the toolbar again and the browser starts again
- **THEN** the button stays on the toolbar
