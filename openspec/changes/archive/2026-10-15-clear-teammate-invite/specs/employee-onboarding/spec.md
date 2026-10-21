## ADDED Requirements

### Requirement: Giving a person the project offers a message to send

When the employer or an Admin saves a person and the save newly lets that person install the project, whether they are new or already listed and whether by their own set or a role, the app SHALL open a popup with a message to copy and send them. The message SHALL be written so the person can paste it straight into their own assistant: it SHALL name the app's address and the email they sign in with, say to install an assistant if they have none, naming more than one as examples, and carry the one setup message unchanged. It SHALL carry no key and SHALL send nothing by itself. A save that gives no new project access SHALL open no popup. A person's own Project tick, while ticked on a saved person, SHALL offer the same message folded under it.

#### Scenario: The owner gives a teammate the project

- **WHEN** the owner saves ann@example.com with Can install the project newly ticked
- **THEN** a popup offers a message to copy that names the app's address and ann@example.com, says to install an assistant if needed, and carries the setup message, and nothing is sent

#### Scenario: A save that gives no project

- **WHEN** the owner adds a person with apps but no Project code
- **THEN** the save says Saved. and no popup opens

## MODIFIED Requirements

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL open with having an AI assistant on the person's computer, with install links for more than one assistant named as examples, not requirements, and SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with having an assistant, with install links, then copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in
