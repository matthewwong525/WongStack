## MODIFIED Requirements

### Requirement: Assistant setup works before a private checkout exists

Published setup SHALL support an empty folder and supported remote workspace through a setup file the business app itself serves. Setup SHALL work in the folder the assistant runs it in unless another is named: it SHALL install the project only into an empty or new folder, SHALL update the read-only copy it finds there, SHALL leave any other copy of the project as it is, and SHALL stop without changing a folder that holds other files. An employee without Project code, where the apps-only connection still applies, SHALL obtain a usable company API client without the project. Setup SHALL NOT hand a device a repository credential, register a repository integration or change the device's own repository authentication. Setup SHALL preserve dirty work, conflicting local folders and unpushed commits, and an update SHALL never discard a person's local changes; interrupted setup SHALL resume against the same target. A downloaded setup file SHALL remove itself when it finishes. API readiness SHALL require actual authorized connection evidence, and the project SHALL be reported installed only after it is on the device.

#### Scenario: App-only employee starts from an empty folder

- **WHEN** an employee assigned business apps, on an app that can not hand its project out, pastes the setup message into their assistant
- **THEN** the assistant can run setup and call their approved company actions without needing access to the private project source

#### Scenario: Setup runs in an empty folder

- **WHEN** a person who holds Project code has their assistant run the setup file in an empty folder
- **THEN** the project is installed in that folder, and the setup file is no longer there

#### Scenario: Existing local work conflicts with setup

- **WHEN** setup encounters a dirty checkout or a different local repository
- **THEN** it preserves that work and provides safe resume/folder guidance without replacing or resetting it

#### Scenario: The folder holds another copy of the project

- **WHEN** setup runs in a copy of the project that came from where the project is kept, not from the app
- **THEN** the person is signed in, the copy is left as it is, and nothing says the project is not included for them

#### Scenario: An update meets local changes

- **WHEN** a person who changed files in their copy runs the update
- **THEN** their changes are kept, and they are told when the update could not be applied on top of them

### Requirement: Connecting an assistant is numbered steps from one place

The app SHALL offer Connect your assistant from one place, the home page's list, and no other screen SHALL carry a second copy of the steps. The steps SHALL be numbered, SHALL say what an assistant is, who the person signs in as and which apps the connection reaches, and SHALL say what the person can do once connected. When the steps can not be loaded, the app SHALL say so and offer to try again, and SHALL NOT tell a signed-in person to sign in. When there is nothing to copy, because the person lacks Project code, the app SHALL say what to do next and offer nothing to copy.

#### Scenario: A person follows the steps

- **WHEN** a signed-in person opens Connect your assistant from the home page
- **THEN** they see numbered steps that start with copying their setup message, name their own email and their apps, and end with what to ask their assistant

#### Scenario: The steps can't load

- **WHEN** the setup steps fail to load for a signed-in person
- **THEN** the popup says the steps couldn't load and offers to try again, with no instruction to sign in

## ADDED Requirements

### Requirement: One setup message serves everyone who may connect

The app SHALL give every person who may connect the same short setup message, whether or not they hold Project code. The message SHALL name one download link, tell the assistant to print the sign-in link into the chat and wait, and ask for a report of what works. It SHALL carry no key, no fingerprint to check and no instruction about where to store files. What a person receives SHALL be decided by setup against their access at that moment, never by the wording of the message.

#### Scenario: Two people with different access copy the message

- **WHEN** a person who holds Project code and a person on an apps-only connection each open Connect your assistant
- **THEN** they see the same message

#### Scenario: A person without Project code runs a message meant for anyone

- **WHEN** a person who lacks Project code runs the setup file from a message someone else copied
- **THEN** setup refuses the project for them and says to ask their admin

### Requirement: The app serves the setup file at a fixed public link

The live app SHALL serve the setup file at one fixed address under its own, the same for every person and every time, with no sign-in. The served file SHALL carry the address of the app that served it and SHALL carry no key, session or other secret; everything it does for a person SHALL still need that person's own sign-in. The link SHALL need no change to an installation's sign-in rules.

#### Scenario: An assistant fetches the file with no sign-in

- **WHEN** an assistant fetches the link from the live app with no sign-in
- **THEN** it receives the setup file, which sets up against that app with no address typed

#### Scenario: Someone with no account runs the file

- **WHEN** a person who can not sign in to the app runs the setup file
- **THEN** setup stops at sign-in, and nothing of the project or the apps reaches them
