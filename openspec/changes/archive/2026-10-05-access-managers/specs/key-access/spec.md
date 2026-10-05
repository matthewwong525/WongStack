# Spec Delta

## MODIFIED Requirements

### Requirement: The employer sees and sets key levels in Access

Access SHALL show the employer each person's level for each key, each app's keys and whether it looks things up or changes them, and for each key whether the app holds it, what uses it and who has which level. The employer SHALL be able to set a level from the person or role, from the key, or from an app that uses the key, and a level set in any of them SHALL be the same level everywhere. A manager SHALL see and set the same. Only the employer or a manager SHALL change a level. Each signed-in person SHALL see their own apps and levels. No screen or response SHALL show a key's value. On a preview the employer SHALL be able to set levels against the practice list, with no effect on the live app's people.

#### Scenario: The employer sets a level

- **WHEN** the employer sets Stripe to Read for a person and saves
- **THEN** that person's line, the Stripe key's page and every app that uses Stripe show Read for them

#### Scenario: An employee tries to change a level

- **WHEN** an ordinary employee calls a level-changing operation
- **THEN** it is denied and no level changes
