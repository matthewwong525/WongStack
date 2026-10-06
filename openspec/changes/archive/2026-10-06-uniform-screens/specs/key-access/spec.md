# Spec Delta

## MODIFIED Requirements

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person opened, the Stripe key opened and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes

### Requirement: Access sets an app's key levels beside the app and shows each gap

Where a person or a role is opened, Access SHALL show the level of each key an app uses beside that app once the app is ticked, so the employer gives the app and sets the level in one place. A key that several ticked apps use SHALL remain one level, shown the same beside each. A key no ticked app uses SHALL still be settable in the same place. The People and Roles lists SHALL say how many apps and keys each person and role has, and SHALL say on the row when a held level is below what one of their apps does; the opened person or role SHALL name each app, each key with its level in words, and each such gap. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer ticks an app that changes things with Stripe for a person, picks Read & write beside that app and saves
- **THEN** the person has the app and Stripe: Read & write, and every other ticked app that uses Stripe shows the same level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list marks that person's row as having a gap without the employer opening them, and opening them says that app can look up but not change
