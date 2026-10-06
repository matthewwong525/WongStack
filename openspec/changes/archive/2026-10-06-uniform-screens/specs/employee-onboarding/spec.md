# Spec Delta

## MODIFIED Requirements

### Requirement: Access lists line up and keep one frame

Each of Access's four views SHALL list its people, roles, apps or keys as rows that share the same columns, each row one line on a computer, readable on a phone without sideways scrolling. The people list SHALL include the employer, marked as the owner, with nothing on that row to change. A person's row SHALL keep the same parts whether they can sign in, are waiting, or were removed. Opening a person, role, app or key SHALL show it with its list still in place, at an address that opens it again, and closing it SHALL return to the list. The switch between the views and the place where Access reports a save, a practice list or an unfinished step SHALL stay the same on every Access screen, an opened person, role, app or key included. A removal and leaving with unsaved changes SHALL ask in the same way.

#### Scenario: The employer opens a person

- **WHEN** the employer opens a person from the people list
- **THEN** the person's fields show with the people list and the switch between the four views still in place, and closing them shows the list as it was

#### Scenario: A manager reads the people list

- **WHEN** a manager opens Access
- **THEN** the list names the owner on its first row and offers nothing to change or remove on that row

## ADDED Requirements

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because setup is not ready on this app or the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in
