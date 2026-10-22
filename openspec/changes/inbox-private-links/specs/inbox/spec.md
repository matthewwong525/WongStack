## MODIFIED Requirements

### Requirement: The inbox lists what waits on the signed-in person

The live app SHALL offer an inbox mini app, behind the company sign-in, that lists the signed-in person's open items in three groups: what needs them (questions, and the private links and forms waiting on them), approvals, and plans to review. It SHALL list only items sent by a computer signed in as that same person, and SHALL never show one person's item to another. The inbox SHALL refresh itself while it is open.

#### Scenario: Two people on one team

- **WHEN** Sam's computer sends a plan and Jo opens the inbox
- **THEN** Jo does not see Sam's plan, and Sam sees it under *Plans to review*

#### Scenario: Nothing is waiting

- **WHEN** the person opens the inbox with no open items
- **THEN** it says nothing is waiting and how items arrive, not a blank page

### Requirement: The inbox never holds a secret

No page that collects a password, key, card or other secret, and no form other than a plan, SHALL ever be shown inside the inbox, and the inbox SHALL offer no way to enter a secret. Such a page MAY be listed as a link item holding only its title, its kind, its closing time and its address. *Open* SHALL take the person to the page's own private link in a new tab, sending the inbox's address nowhere. A link item SHALL take no taps and SHALL leave the list once its link ends.

#### Scenario: A key is needed

- **WHEN** an agent needs an API key while the inbox is on
- **THEN** the key page opens at its own private link, the inbox lists it with *Open*, and the key never reaches the app

#### Scenario: The link finished

- **WHEN** the person saves the key on the private link
- **THEN** the key's row leaves the inbox

## ADDED Requirements

### Requirement: A decision takes a choice or the person's own words

Each question and approval SHALL offer its choices and one box for the person's own answer, and no separate note. On a pick-one decision, typing in the box SHALL replace any picked choice, and the person's words SHALL be sent as the whole answer. A question MAY allow several choices; then each choice SHALL be a box to tick, typing SHALL untick nothing, and the ticked choices and the person's words SHALL be sent together.

#### Scenario: Typing instead of picking

- **WHEN** the person picks *Acme*, then types *ask Boxco for a second quote first* and sends
- **THEN** the agent receives only *ask Boxco for a second quote first*

#### Scenario: Ticking several and typing

- **WHEN** a question allows several choices, and the person ticks *Acme* and *Boxco*, then types *and check Crateco*
- **THEN** the agent receives *Acme*, *Boxco* and *and check Crateco* together

#### Scenario: Typed words on an approval

- **WHEN** the person types *only to Kim, not the whole list* on an approval
- **THEN** the chief receives those words as the answer, not as *Approve*

### Requirement: Links in a decision open

A web address in a question or one of its choices SHALL show as a link that opens in a new tab, and tapping it SHALL not pick that choice. Only `http` and `https` addresses SHALL become links.

#### Scenario: A quote's address in an approval

- **WHEN** an approval reads *Use this quote? https://acme.example/q/42* and the person taps the address
- **THEN** the quote opens in a new tab and nothing is picked
