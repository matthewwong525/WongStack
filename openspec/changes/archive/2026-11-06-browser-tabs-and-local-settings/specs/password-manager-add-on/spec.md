## REMOVED Requirements

### Requirement: Asked once, when the browser is installed

**Reason**: The person adds a password manager, or any add-on, themselves when they wish, as in their own Firefox, so no question is needed.
**Migration**: None. A saved answer is ignored; an add-on already added stays. The person adds one in the browser window, or asks the agent to add it.

## ADDED Requirements

### Requirement: The person adds an add-on themselves

The agent SHALL NOT ask the person which password manager they use or offer to add one. The person SHALL be able to add any add-on from Firefox's add-on site in the browser themselves, and it SHALL stay from start to start. The agent SHALL NOT click, type in, read, or unlock any add-on's own button, pages, menus, or frames, whether the person or the agent added it.

#### Scenario: A new browser install

- **WHEN** the first errand that needs the browser installs it
- **THEN** the agent asks nothing about a password manager and goes on with the errand

#### Scenario: An add-on the person added

- **WHEN** the agent reads a page where an add-on the person added shows its own frame
- **THEN** the reading holds no part of that frame, and a click aimed at it is refused
