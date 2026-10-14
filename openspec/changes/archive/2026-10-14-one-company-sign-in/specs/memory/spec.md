## ADDED Requirements

### Requirement: Memory is reached through the production Worker with the company sign-in

Every non-admin store call SHALL go through the repo's production app Worker at `/_memory/` carrying the person's saved company sign-in, the same one company actions use. The Worker SHALL verify it as a signed sign-in for this app before running anything, and SHALL take the person from it, never from anything the caller sends. No memory key SHALL be issued, stored in `.env`, or accepted after the update that moves notes to people. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's. Staging and previews SHALL answer `/_memory/` with 404.

#### Scenario: A signed-in teammate starts a chat

- **WHEN** a teammate who signed in at setup starts a new chat in their copy
- **THEN** memory loads and saves with no key to install and no admin step

#### Scenario: A sign-in for another app

- **WHEN** a valid sign-in for another business's app is sent to this Worker's memory route
- **THEN** the Worker answers 401 and runs nothing

### Requirement: Private memory belongs to a person

Private facts and transcripts SHALL belong to the signed-in person, identified by the sign-in's verified subject, and SHALL be the same for that person on every computer. Emails, hostnames, labels and git authors SHALL NOT establish ownership. A copied folder without a valid sign-in SHALL open nothing.

#### Scenario: One person, two computers

- **WHEN** Ana saves a preference on her laptop and later starts a chat on her desktop
- **THEN** the desktop's digest shows the preference, and Bo never sees it

#### Scenario: A copied folder

- **WHEN** someone copies Ana's project folder to a computer where nobody is signed in
- **THEN** memory reports it is not signed in, shows the sign-in link, and returns no fact

### Requirement: Access roles decide memory roles

A person's memory role SHALL follow their current access in the app: the owner and Admins are memory admins, anyone holding Project code is a member, and any other signed-in person is a reader. A change in Access SHALL apply on the person's next memory call, with no step in memory.

#### Scenario: Project code is taken away

- **WHEN** the owner unticks Project code for a member
- **THEN** that person's next save is stored as a reader's, unshared, and their earlier facts stay

### Requirement: Machine notes move to their person

The update SHALL move each machine's private facts and transcripts to the person that machine was linked to by a verified sign-in, keeping every original author and time. Notes from a machine with no verified link SHALL stay visible only to memory admins until an admin assigns them. Nothing SHALL be deleted. The update SHALL report how many notes moved and how many wait, and SHALL turn off every old memory key only after the move succeeds.

#### Scenario: A labelled machine

- **WHEN** the update runs on a store whose only active machine is linked to `matthewwong525@gmail.com`
- **THEN** all its private notes belong to that person and show in their digest on any computer

#### Scenario: An unlabelled machine

- **WHEN** a machine never linked to a sign-in owns private notes
- **THEN** only memory admins see them, the report says they wait for an owner, and no teammate sees them

### Requirement: Cloud schedules use their own sign-in

A schedule that runs with no person signed in SHALL reach memory with its own sign-in, made by the owner and revocable by the owner. It SHALL read and write team notes only and never see a person's private notes. A schedule that runs on a computer SHALL use that computer's signed-in person.

#### Scenario: A cloud schedule reads memory

- **WHEN** a cloud schedule searches memory with its own sign-in
- **THEN** it gets team notes only, and its saves are team notes

#### Scenario: The owner switches a schedule's sign-in off

- **WHEN** the owner revokes a schedule's sign-in
- **THEN** its next memory call is refused

### Requirement: An expired sign-in keeps memory readable from its last copy

When the saved sign-in is missing or expired, a chat SHALL start with the last saved digest, say that memory is not up to date, and show the sign-in link. Saves SHALL wait locally and send once the person signs in again. Five days before the sign-in ends, each new chat SHALL say when it ends and show the link.

#### Scenario: The sign-in ends in three days

- **WHEN** a chat starts and the saved sign-in ends in three days
- **THEN** the digest's first line says it ends in three days with the sign-in link

#### Scenario: The sign-in has run out

- **WHEN** a chat starts after the sign-in ended
- **THEN** the last saved digest loads, the chat shows the sign-in link, and the session's facts are sent after the next sign-in

## MODIFIED Requirements

### Requirement: Teammates cannot change or hide each other's facts

A member or reader SHALL write facts only as its signed-in person and SHALL supersede only facts that person owns, with its own new fact in the same write; a supersede aimed at another person's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only a memory admin SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another owner, overwrites another person's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's save sends a fact claiming Bo as owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the signed-in person, however the read is written. Emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. A memory admin SHALL retain access to every fact; their default digest and search SHALL narrow personal and unshared facts to their own, and only an explicit `--everyone` SHALL widen that view.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

## REMOVED Requirements

### Requirement: Memory is reached through the production Worker with a memory key

**Reason**: Memory now uses the company sign-in; no memory key exists.

**Migration**: "Memory is reached through the production Worker with the company sign-in". The update turns old keys off after notes move to people; the owner's admin jobs keep using the Cloudflare API token.

### Requirement: Private memory belongs to an installation

**Reason**: Private memory belongs to a person, not a computer.

**Migration**: "Private memory belongs to a person" and "Machine notes move to their person".

### Requirement: Installation setup and trusted admins issue machine credentials

**Reason**: No memory credential is issued; Access decides who may use memory and with which role.

**Migration**: "Access roles decide memory roles". `memory.mjs member add` and `join` are retired with a message pointing to Access.

### Requirement: Website login identifies a machine automatically

**Reason**: The sign-in itself names the person on every call, so no separate link between a machine and a login is needed.

**Migration**: Existing links are read once by "Machine notes move to their person", then kept as history.

### Requirement: Historic private data is not automatically claimed

**Reason**: The owner chose to move each linked machine's notes to its person.

**Migration**: "Machine notes move to their person"; unlinked notes stay admin-only until assigned.

### Requirement: Shared discovery preserves memory credentials and private ownership

**Reason**: Memory and company actions now share one sign-in.

**Migration**: agent-api-discovery's "Memory and company actions share one sign-in".
