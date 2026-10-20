## ADDED Requirements

### Requirement: Only everyday answers are saved

The agent SHALL save a detail only when the person gave it in the chat and chose to keep it: an everyday answer such as an email, a name, an address, or a phone number. The chat SHALL ask once per form whether to keep its everyday answers, with the answers shown. A card, a password, or a code SHALL never be saved this way, and nothing typed in a private form SHALL be saved. Saved details SHALL live on the agent's computer, outside every repo, readable only by its account, beside the saved logins. Saving a set like one already saved SHALL replace it, never add a copy.

#### Scenario: An address answered in the chat

- **WHEN** the agent asks for a shipping address in the chat and the person answers and chooses to keep it
- **THEN** the address is saved, and the next form asking for an address can use it

#### Scenario: A card is never saved

- **WHEN** the person pays with a card through a private form
- **THEN** nothing from the form is saved, and the next payment sends a new private form

### Requirement: A card saved before is deleted

A card saved by an earlier version SHALL be deleted the next time saved details are read, and SHALL never be filled into a form.

#### Scenario: An install that saved a card

- **WHEN** an install that saved *card ending 4242* updates, and saved details are next read
- **THEN** the card is gone from the saved details, any everyday answers stay, and the next payment sends a private form

### Requirement: A saved answer fills a form after a yes in the chat

When a page asks for everyday answers that a saved set holds, the agent SHALL ask in the chat before using it, showing the answers: *Use me@x.com and 1 Main St?* On yes, the agent SHALL type them into the site's boxes as it types any chat answer. A saved answer SHALL never stand in for a card.

#### Scenario: A second order to the same address

- **WHEN** a later checkout asks for a shipping address and the person says yes to *Use 1 Main St?*
- **THEN** the agent types the saved address into the site and carries on to the card, which goes through a private form

### Requirement: The person can forget saved answers

When the person asks to forget a saved answer, or all of them, the agent SHALL delete it from the saved details and confirm in the chat by its name.

#### Scenario: Forget an address

- **WHEN** the person says *forget my address*
- **THEN** the saved address is deleted and the next form asks for it in the chat

## REMOVED Requirements

### Requirement: The person chooses what is saved

**Reason**: A private form no longer saves a card; only chat answers are kept.
**Migration**: See *Only everyday answers are saved*.

### Requirement: The agent never sees a saved private detail

**Reason**: No private detail is saved any more, so none needs hiding.
**Migration**: A card goes through a private form each time.

### Requirement: A saved detail fills a form after a yes in the chat

**Reason**: Saved cards are gone; the agent types an everyday answer itself.
**Migration**: See *A saved answer fills a form after a yes in the chat*.

### Requirement: The person can forget saved details

**Reason**: Its scenario forgot a card, which is no longer saved.
**Migration**: See *The person can forget saved answers*.
