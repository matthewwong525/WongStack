## ADDED Requirements

### Requirement: On a phone, a live view cuts off no pop-up or toolbar

On a phone, a live view SHALL show the whole browser window, the toolbar's right end included, and SHALL keep every browser pop-up that fits the view's width inside it, such as an add-on's toolbar pop-up or the browser's menu. A pop-up wider than the view SHALL start at the view's left edge. A laptop's wide view SHALL show the screen as before.

#### Scenario: 1Password's pop-up on a phone

- **WHEN** the person taps 1Password's toolbar button in a live view on a phone
- **THEN** its whole pop-up shows inside the view, its right edge included, and it takes their taps and typing

#### Scenario: The toolbar on a phone

- **WHEN** the person opens a live view on a phone
- **THEN** the toolbar shows up to its right end, the browser's menu button included
