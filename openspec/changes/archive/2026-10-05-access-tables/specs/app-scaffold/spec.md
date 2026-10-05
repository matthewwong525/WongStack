# Spec Delta

## ADDED Requirements

### Requirement: A signed-in person can sign out from any page

Every page of the app SHALL offer a signed-in person a way to end their session in that browser, after which the app SHALL require signing in again. An app that is open with no sign-in SHALL offer none.

#### Scenario: A person signs out

- **WHEN** a signed-in person chooses to sign out from any page
- **THEN** their session ends and the next visit asks them to sign in

#### Scenario: The site has no sign-in

- **WHEN** a visitor opens a site that is open with no sign-in
- **THEN** no page offers a way to sign out
