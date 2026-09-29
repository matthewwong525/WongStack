## MODIFIED Requirements

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer. When the link is open in a window narrower than 800 CSS pixels, the handed page SHALL take that window's width, so the site shows its own narrow layout at full size; a wider window SHALL get 1280×720. When the link closes, however it closes, the page SHALL return to 1280×720 before the agent carries on.

#### Scenario: A card number from a phone

- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab

- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page

#### Scenario: A link opened on a phone

- **WHEN** the person opens the link on a phone 390 points wide
- **THEN** the handed page is 390 wide or less, shows the site's phone layout, and a tap lands on the spot tapped
- **AND** after the link closes, the page is 1280×720 again
