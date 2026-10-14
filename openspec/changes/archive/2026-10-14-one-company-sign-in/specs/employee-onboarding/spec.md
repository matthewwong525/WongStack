## ADDED Requirements

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory and plain git working through the same sign-in, and its final report SHALL say in plain words who is signed in, which apps work, that memory and updates work, and that nothing else is needed. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says they are done, memory loads in their next chat, and a new worktree starts from the newest version

### Requirement: A person allowed to publish publishes through the app

A signed-in person who currently holds Project code's publish level SHALL be able to publish a change they or a teammate saved, through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL publish only a change whose checks all passed for its newest commit, SHALL judge each request against the person's access at that moment, and SHALL say who published it. A person without the publish level SHALL be refused with ask-your-admin guidance, and their assistant SHALL end with *saved, and here is who publishes it*. A machine SHALL be refused on the live app.

#### Scenario: A teammate with the tick ships

- **WHEN** Ana, who holds the publish tick, runs `/ship` from her copy with no GitHub account and the change's checks pass
- **THEN** the change is live, the project records Ana as its publisher, and her copy moves to the published version

#### Scenario: The checks have not passed

- **WHEN** a person with the publish tick asks to publish a change whose newest commit has a failing or unfinished check
- **THEN** nothing is published and the reply names the check

## MODIFIED Requirements

### Requirement: Connect installs the project for a person who holds Project code

Once the installation can hand its project out, a signed-in person who currently holds Project code SHALL be able to install the whole project on their device from the app's setup prompt, with their own app login as the only credential: no repository account, no pasted key. Running the same step again SHALL bring the copy up to date. A push from the copy SHALL NOT publish: the app SHALL refuse every push that would change the published project and say that a push saves a change and that publishing is its own step. The employer SHALL hold Project code always; nobody else SHALL hold it until the employer or a manager gives it. Each download SHALL be judged against the person's current access, so unticking or removing a person refuses their next download without sign-out. The repository credential the app uses SHALL never reach a device, a prompt, a response body or a log. Until the installation can hand its project out, every signed-in person SHALL keep the apps-only connection they had.

#### Scenario: A ticked person connects from an empty folder

- **WHEN** a person who holds Project code pastes the setup prompt into their assistant and approves their app sign-in
- **THEN** the project is on their device with its history, their allowed company actions work from inside it, and no repository login was asked for

#### Scenario: Project code is taken away

- **WHEN** the employer unticks Project code for a person who installed the project
- **THEN** that person's next update is refused with ask-your-admin guidance, and the copy on their device is unchanged

#### Scenario: A person tries to publish through the app

- **WHEN** a connected person, with or without the publish tick, pushes to the published branch at the address their copy came from
- **THEN** it is refused before anything is asked of where the project is kept, nothing in the project changes, and the message says a push saves a change and publishing is its own step

### Requirement: A person who holds Project code sends their work up through the app

A signed-in person who currently holds Project code SHALL be able to send a change from their installed copy up through the app, with their own app login as the only credential, on a project kept on GitHub and on one kept in the employer's Cloudflare account. The app SHALL then give back that change's checks, the output of a check that failed, and its preview, for the exact commit sent. Each such request SHALL be judged against the person's access at that moment, and a machine SHALL be refused on the live app.

The app SHALL accept one change at a time through a push and nothing else: it SHALL refuse, before anything is asked of where the project is kept, a push that would move the published project, delete anything, or touch anything that is not a change. Publishing SHALL happen only through the separate publish request. Where the project is kept on GitHub, the change SHALL be opened or updated there for the employer to review, and SHALL say who saved it. The credential the app uses to save SHALL never reach a device, a prompt, a response body or a log.

#### Scenario: A teammate saves with no GitHub account

- **WHEN** a person who holds Project code saves work from a copy installed through Connect, on a device with no GitHub account and no GitHub tool
- **THEN** the change is where the project is kept, its checks ran for that commit, and the person's assistant has their result and the preview

#### Scenario: Project code is taken away before a save

- **WHEN** the employer unticks Project code for a person, who then saves from the copy on their device
- **THEN** the save is refused with ask-your-admin guidance and nothing reaches where the project is kept

### Requirement: A person or a role opens to apps and keys

Where a person's own set or a role is opened, Access SHALL show the apps as choices to give or not, the saved keys each with its level, and Project code as its install and publish ticks, and SHALL change nothing for the person before the employer saves. Access SHALL not mark a person, a role or an app as lacking a key level. The People and Roles lists SHALL say how many apps and keys each person and role has. A signed-in person who manages nothing SHALL see their own apps and key levels.

#### Scenario: The employer gives an app

- **WHEN** the employer opens a person, gives them Orders and saves
- **THEN** the person holds Orders, their key levels are unchanged, and no row is marked as missing anything

#### Scenario: The employer leaves without saving

- **WHEN** the employer gives an app and closes the panel without saving
- **THEN** Access asks before leaving, and the person's access is unchanged

### Requirement: One setup message serves everyone who may connect

The app SHALL give every person who may connect the same short setup message, whether or not they hold Project code. The message SHALL name the business, say in one line what the file does, invite the assistant to read the file before running it, name one download link, tell the assistant to print the sign-in link into the chat and wait, and ask for a report of what works. It SHALL carry no key, no fingerprint to check and no instruction about where to store files. What a person receives SHALL be decided by setup against their access at that moment, never by the wording of the message.

#### Scenario: Two people with different access copy the message

- **WHEN** a person who holds Project code and a person on an apps-only connection each open Connect your assistant
- **THEN** they see the same message

#### Scenario: A person without Project code runs a message meant for anyone

- **WHEN** a person who lacks Project code runs the setup file from a message someone else copied
- **THEN** setup refuses the project for them and says to ask their admin

#### Scenario: A careful assistant reads the message

- **WHEN** an assistant is given the message pasted with nothing else
- **THEN** it can tell whose file it is and what it does, reads it, and runs it without a second request

## REMOVED Requirements

### Requirement: Existing memory authority is preserved

**Reason**: Memory now uses the same company sign-in that setup makes.

**Migration**: "Setup ends with memory and project updates working" and memory's "Memory is reached through the production Worker with the company sign-in".
