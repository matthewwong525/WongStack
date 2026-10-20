## Purpose

Keeps the form details a person chose to save, on their own computer, so a later form fills from them after one yes in the chat instead of being typed again.

## ADDED Requirements

### Requirement: The person chooses what is saved

The agent SHALL save a detail only when the person chose it: a private form's *Save for next time*, or a yes in the chat for an everyday answer (an email, a name, an address, a phone number). The chat SHALL ask once per form whether to keep its everyday answers, with the answers shown. Saved details SHALL live on the agent's computer, outside every repo, readable only by its account, beside the saved logins. Saving a set like one already saved SHALL replace it, never add a copy.

#### Scenario: A card saved from the private form

- **WHEN** the person ticks *Save for next time*, pays, and the site accepts the card
- **THEN** the card is saved, and the agent says in the chat that the card ending 4242 is saved

#### Scenario: An address answered in the chat

- **WHEN** the agent asks for a shipping address in the chat and the person answers and chooses to keep it
- **THEN** the address is saved, and the next form asking for an address can use it

#### Scenario: Not saved by default

- **WHEN** the person fills a private form without ticking *Save for next time*
- **THEN** nothing from that form is saved

### Requirement: The agent never sees a saved private detail

A detail saved from a private form SHALL never appear in any command, log, message, picture, or repo file the agent can read. The agent SHALL know it only by its name and a short hint: the last four digits for a card number, else the box labels it fills. An everyday detail, which the person gave in the chat, MAY be read by the agent.

#### Scenario: Listing saved details

- **WHEN** the agent lists saved details before filling a payment page
- **THEN** it sees *card ending 4242* and the boxes it fills, and no card number, expiry, or security code

### Requirement: A saved detail fills a form after a yes in the chat

When a page asks for details that a saved set holds, the agent SHALL ask in the chat before using it, naming the set and what the site's button does: *Pay City of Markham $45.00 with your card ending 4242?* `Use card ending 4242 / Use another card / Not now`. On yes, the agent SHALL fill the saved details into the site's boxes and press the site's button once, with no private form; that yes SHALL count as the person's yes for that action. The agent SHALL NOT read or picture the page between the fill and the site's answer. When the site keeps the page, the filled boxes SHALL be emptied before the agent looks, and the agent SHALL offer a private form. When a saved value fits none of a dropdown's choices, the agent SHALL fill nothing and offer a private form. *Use another card* SHALL send a private form.

#### Scenario: A second payment with a saved card

- **WHEN** a later checkout asks for a card and the person taps *Use card ending 4242*
- **THEN** the card is filled and paid once, no private link is sent, and the chat shows the receipt

#### Scenario: The saved card is refused

- **WHEN** the site rejects the saved card
- **THEN** the card boxes are emptied, the agent says what the site said, and offers a private form

#### Scenario: An expiry the site writes differently

- **WHEN** a saved expiry month of 03 meets a dropdown whose choices read 1 to 12
- **THEN** the dropdown gets 3

### Requirement: The person can forget saved details

When the person asks to forget a saved detail, or all of them, the agent SHALL delete it from the saved details and confirm in the chat by its name.

#### Scenario: Forget a card

- **WHEN** the person says *forget my card*
- **THEN** the saved card is deleted and the next payment sends a private form
