## ADDED Requirements

### Requirement: A workspace copy uses the computer's sign-in

A copy of an installed project, such as a workspace's own copy, SHALL reach the app with the sign-in this computer already holds for that app, with no login of its own, including when the install record names only the memory address on that app. It SHALL never use a sign-in held for a different app.

#### Scenario: A workspace opened from the main copy

- **WHEN** the person is signed in from the main copy, before or after this update, and /daily runs in a new workspace copy of the same project
- **THEN** its inbox cards, questions and approvals reach the person's inbox with no extra login

#### Scenario: No sign-in for this app

- **WHEN** this computer holds a sign-in only for another app
- **THEN** the copy reports that it needs a login, as before, and sends nothing to the other app
