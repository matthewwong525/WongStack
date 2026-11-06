## ADDED Requirements

### Requirement: A live view leaves an open browser pop-up in front

While the person has a browser pop-up open in a live view, such as an add-on's toolbar pop-up, the view SHALL NOT bring the page or another browser window in front of it, so the pop-up stays open until the person closes it, picks from it, or taps outside it. The pop-up SHALL take the person's typing. Once no pop-up shows, the view SHALL bring the turn's page to the front again, as before.

#### Scenario: Unlock 1Password from its pop-up

- **WHEN** the person taps 1Password's toolbar button in a live view and types their password in its pop-up
- **THEN** the pop-up stays open while they type, and it unlocks

#### Scenario: The page comes back after the pop-up closes

- **WHEN** the person picks a login in the pop-up and the pop-up closes
- **THEN** the view brings the turn's page to the front again within its next poll
