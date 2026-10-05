# Spec Delta

## ADDED Requirements

### Requirement: Access sets an app's key levels beside the app and shows each gap

On a person's page and a role's page, Access SHALL show the level of each key an app uses beside that app once the app is ticked, so the employer gives the app and sets the level in one place. A key that several ticked apps use SHALL remain one level, shown the same beside each. A key no ticked app uses SHALL still be settable on the same page. The People and Roles lists SHALL show each person's and role's apps and key levels as separate items with the level in words, and SHALL say where a held level is below what one of their apps does. A level or a gap SHALL never be marked by colour alone.

#### Scenario: The employer gives an app and lets it change things

- **WHEN** the employer ticks an app that changes things with Stripe on a person's page, picks Read & write beside that app and saves
- **THEN** the person has the app and Stripe: Read & write, and every other ticked app that uses Stripe shows the same level

#### Scenario: A person's app can't do its job yet

- **WHEN** a person has an app that changes things with Stripe and holds Stripe: Read
- **THEN** the People list says that app can look up but not change, without the employer opening the person's page
