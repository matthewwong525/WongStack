## ADDED Requirements

### Requirement: One ask adds a well-known add-on, and its page opens

When the person asks for one add-on by name, and the best match on Firefox's add-on site is the only plausible one and is featured by Mozilla or used by at least 10,000 people each day, and adding it replaces no other add-on, the ask SHALL count as the person's yes: the agent SHALL name the add-on, its maker, the maker's website and its daily users in the chat and add it in the same turn, with no further question. When the words fit more than one add-on, the agent SHALL name the matches and add only the one the person picks. The agent SHALL NOT ask the person to add an add-on themselves from the add-on site. Right after an add, the agent SHALL open the add-on's own page and show it to the person, so their only step is to sign in.

#### Scenario: Asking for a well-known add-on adds it at once

- **WHEN** the person says "add 1Password", and the best match is featured with more than 10,000 daily users
- **THEN** the agent names its maker, website and daily users, adds it without a further question, and opens 1Password's own page for the person to sign in

#### Scenario: Words that fit more than one add-on

- **WHEN** the person's words fit more than one add-on on the site
- **THEN** the agent names the matches and adds only the one the person picks

#### Scenario: An add that would replace another add-on

- **WHEN** 1Password is added and signed in, and the person says "add Bitwarden"
- **THEN** the agent says 1Password and its sign-in would go, and adds Bitwarden only on the person's yes

#### Scenario: Never sent to press the button

- **WHEN** the person asks the agent to add an add-on
- **THEN** the agent does not open the add-on site for the person to press *Add to Firefox*
