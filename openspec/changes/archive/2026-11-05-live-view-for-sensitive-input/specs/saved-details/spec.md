## MODIFIED Requirements

### Requirement: Only everyday answers are saved

The agent SHALL save a detail only when the person gave it in the chat and chose to keep it: an everyday answer such as an email, a name, an address, or a phone number. The chat SHALL ask once per form whether to keep its everyday answers, with the answers shown. A card, a password, or a code SHALL never be saved this way, and nothing typed in a live view SHALL be saved. Saved details SHALL live on the agent's computer, outside every repo, readable only by its account. Saving a set like one already saved SHALL replace it, never add a copy.

#### Scenario: An address answered in the chat

- **WHEN** the agent asks for a shipping address in the chat and the person answers and chooses to keep it
- **THEN** the address is saved, and the next form asking for an address can use it

#### Scenario: A card is never saved

- **WHEN** the person pays with a card in a live view
- **THEN** nothing they typed is saved, and the next payment is typed in a live view again

### Requirement: A card saved before is deleted

A card saved by an earlier version SHALL be deleted the next time saved details are read, and SHALL never be filled into a form.

#### Scenario: An install that saved a card

- **WHEN** an install that saved *card ending 4242* updates, and saved details are next read
- **THEN** the card is gone from the saved details, any everyday answers stay, and the next payment is typed in a live view

### Requirement: A saved answer fills a form after a yes in the chat

When a page asks for everyday answers that a saved set holds, the agent SHALL ask in the chat before using it, showing the answers: *Use me@x.com and 1 Main St?* On yes, the agent SHALL type them into the site's boxes as it types any chat answer. A saved answer SHALL never stand in for a card.

#### Scenario: A second order to the same address

- **WHEN** a later checkout asks for a shipping address and the person says yes to *Use 1 Main St?*
- **THEN** the agent types the saved address into the site and carries on to the card, which the person types in a live view
