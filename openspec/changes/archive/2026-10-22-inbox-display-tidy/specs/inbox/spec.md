## ADDED Requirements

### Requirement: A plan follows the app's light or dark look

A plan opened in the inbox SHALL show the app's light or dark look and SHALL offer one switch for it, the app's own. Switching SHALL change the plan's page too, without reloading it or losing its notes. The same review page opened outside the inbox SHALL keep its own switch.

#### Scenario: Dark mode on a plan

- **WHEN** the person has the app in dark mode and opens a plan, then switches to light
- **THEN** the plan opens dark with no second switch, and turns light in place with its notes kept

#### Scenario: The page opened on its own

- **WHEN** the person opens the same review page from its private link
- **THEN** it shows its own light and dark switch, as before
