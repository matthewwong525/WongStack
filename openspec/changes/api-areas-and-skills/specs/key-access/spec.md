# Spec Delta

## MODIFIED Requirements

### Requirement: Access sets an app's key levels beside the app and shows each gap

Where a person or a role is opened, Access SHALL show every area and every key in one list with its level, so the employer gives an app and sets its keys' levels in one place. A key SHALL be one level however many of the set's apps and skills use it. A key nothing of the set uses SHALL still be settable in the same place. The People and Roles lists SHALL say how many apps and keys each person and role has, and SHALL say on the row when a held level is below what one of their apps or a skill needs; the opened person or role SHALL name each area and each key with its level in words, and each such gap with the app or skill it stops. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer gives a person an app that changes things with Stripe, picks Read & write for Stripe in the same list and saves
- **THEN** the person has the app and Stripe: Read & write, and every other app and skill of theirs that uses Stripe is judged by that one level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list marks that person's row as having a gap without the employer opening them, and opening them says that app can look up but not change
