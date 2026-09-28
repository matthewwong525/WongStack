# Spec Delta

## MODIFIED Requirements

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, and dropdown choices to list them for the person, and MAY set a field on the person's action; it SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list

- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

## ADDED Requirements

### Requirement: The person can fill a handed-over form from a list of its fields

A hand-over page SHALL list the handed page's text fields, dropdowns, and tick boxes, each labelled and in page order, with a dropdown showing the page's own choices. A value the person enters in the list SHALL reach the matching field on the page, as they type or pick it. Each box SHALL carry the kind of value it holds, from the page field's own marking, name, or label, so a password manager or a phone's autofill can fill the list. The list SHALL follow the page as it changes, and a field the list can't show SHALL stay reachable by tapping it on the picture and typing.

#### Scenario: Expiry dropdowns from a phone

- **WHEN** a handed-over card page has dropdowns for expiry month and year, and the person picks 03 and 2028 in the list on a phone
- **THEN** the page's dropdowns show 03 and 2028

#### Scenario: A password manager fills the card

- **WHEN** the person's password manager fills the list's card number, expiry, and security code boxes at once
- **THEN** each value lands in its own field on the page

